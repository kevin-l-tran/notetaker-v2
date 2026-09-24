import type { NotebookMember } from "@notetaker-v2/contracts";
import type { AppUser } from "../../database/schema/appUsers.ts";
import type { NewNotebookMember } from "../../database/schema/notebookMembers.ts";
import type { NewNotebook, Notebook } from "../../database/schema/notebooks.ts";
import {
	BadRequestError,
	ForbiddenError,
	InvariantError,
	NotFoundError,
} from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createUserService } from "../users/user.service.ts";
import { createNotebookRepository } from "./notebook.repository.ts";
import { createNotebookMemberRepository } from "./notebookMember.repository.ts";

export function createNotebookService(context: ServiceContext) {
	const notebookRepo = createNotebookRepository(context.database);
	const notebookMemberRepo = createNotebookMemberRepository(context.database);

	async function lockNotebook(
		txNotebookRepo: ReturnType<typeof createNotebookRepository>,
		notebookId: Notebook["id"],
	) {
		const notebook = await txNotebookRepo.findByIdForUpdate({ id: notebookId });

		if (!notebook)
			throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find notebook to lock.");

		return notebook;
	}

	async function requireMembership(
		notebookMemberRepo: ReturnType<typeof createNotebookMemberRepository>,
		appUserId: AppUser["id"],
		notebookId: Notebook["id"],
	) {
		const membership = await notebookMemberRepo.findByUserAndNotebook({ appUserId, notebookId });

		if (!membership) throw new ForbiddenError("Could not find notebook membership.");

		return membership;
	}

	async function requireOwnership(
		notebookMemberRepo: ReturnType<typeof createNotebookMemberRepository>,
		appUserId: AppUser["id"],
		notebookId: Notebook["id"],
	) {
		const membership = await notebookMemberRepo.findByUserAndNotebook({ appUserId, notebookId });

		if (membership?.role !== "owner")
			throw new ForbiddenError("Must be the notebook owner to perform this operation.");

		return membership;
	}

	async function requireTargetMembership(
		notebookMemberRepo: ReturnType<typeof createNotebookMemberRepository>,
		memberId: NotebookMember["id"],
		notebookId: Notebook["id"],
	) {
		const targetMembership = await notebookMemberRepo.findByIdAndNotebook({
			id: memberId,
			notebookId: notebookId,
		});

		if (!targetMembership)
			throw new NotFoundError(
				"NOTEBOOK_MEMBERSHIP_NOT_FOUND",
				"Could not find notebook membership.",
			);

		return targetMembership;
	}

	return {
		listNotebooksForUser(input: { appUserId: AppUser["id"] }) {
			return notebookRepo.findForUser(input);
		},

		async getNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(notebookMemberRepo, input.appUserId, input.notebookId);

			return notebookRepo.findByIdForUser(input);
		},

		createNotebook(input: {
			appUserId: AppUser["id"];
			data: { title: NewNotebook["title"]; description?: NewNotebook["description"] };
		}) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				const notebook = await txNotebookRepo.create(input.data);
				const membership = await txNotebookMemberRepo.create({
					appUserId: input.appUserId,
					notebookId: notebook.id,
					role: "owner",
				});

				return { ...notebook, role: membership.role };
			});
		},

		updateNotebook(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: { title?: NewNotebook["title"]; description?: NewNotebook["description"] };
		}) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const membership = await requireOwnership(
					txNotebookMemberRepo,
					input.appUserId,
					input.notebookId,
				);

				const updatedNotebook = await txNotebookRepo.update({
					...input.data,
					id: input.notebookId,
				});

				if (!updatedNotebook)
					throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Notebook to update was not found.");

				return { ...updatedNotebook, role: membership.role };
			});
		},

		deleteNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const membership = await requireOwnership(
					txNotebookMemberRepo,
					input.appUserId,
					input.notebookId,
				);

				const deletedNotebook = await txNotebookRepo.delete({ id: input.notebookId });

				if (!deletedNotebook)
					throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Notebook to delete was not found.");

				return { ...deletedNotebook, role: membership.role };
			});
		},

		async listNotebookMembers(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(notebookMemberRepo, input.appUserId, input.notebookId);

			return notebookMemberRepo.findForNotebookWithUsers({ notebookId: input.notebookId });
		},

		addNotebookMember(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: {
				targetAppUserId: AppUser["id"];
				role: NewNotebookMember["role"];
			};
		}) {
			if (input.data.role === "owner")
				throw new BadRequestError("INVALID_MEMBERSHIP_ROLE", "Cannot create a new notebook owner.");

			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);
				const txUserService = createUserService(transactionContext);

				await lockNotebook(txNotebookRepo, input.notebookId);

				await requireOwnership(txNotebookMemberRepo, input.appUserId, input.notebookId);

				const existingMembership = await txNotebookMemberRepo.findByUserAndNotebook({
					appUserId: input.data.targetAppUserId,
					notebookId: input.notebookId,
				});

				if (existingMembership)
					throw new BadRequestError(
						"NOTEBOOK_MEMBERSHIP_ALREADY_EXISTS",
						"The target user already has a membership.",
					);

				const targetUser = await txUserService.findUserById({ id: input.data.targetAppUserId });

				if (!targetUser) throw new BadRequestError("USER_NOT_FOUND", "Target user was not found.");

				return txNotebookMemberRepo.create({
					appUserId: targetUser.id,
					notebookId: input.notebookId,
					role: input.data.role,
				});
			});
		},

		updateNotebookMemberRole(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: {
				memberId: NotebookMember["id"];
				role: NewNotebookMember["role"];
			};
		}) {
			if (input.data.role === "owner")
				throw new BadRequestError(
					"INVALID_MEMBERSHIP_ROLE",
					'Cannot set a member\'s role to "owner".',
				);

			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const yourMembership = await requireOwnership(
					txNotebookMemberRepo,
					input.appUserId,
					input.notebookId,
				);

				const targetMembership = await requireTargetMembership(
					txNotebookMemberRepo,
					input.data.memberId,
					input.notebookId,
				);

				if (targetMembership.id === yourMembership.id)
					throw new ForbiddenError("You must transfer ownership to change your role.");

				return txNotebookMemberRepo.updateRole({
					id: targetMembership.id,
					role: input.data.role,
				});
			});
		},

		removeNotebookMember(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			memberId: NotebookMember["id"];
		}) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				await requireOwnership(txNotebookMemberRepo, input.appUserId, input.notebookId);

				const targetMembership = await requireTargetMembership(
					txNotebookMemberRepo,
					input.memberId,
					input.notebookId,
				);

				if (targetMembership.role === "owner")
					throw new ForbiddenError("Notebook ownership must be transferred instead.");

				return txNotebookMemberRepo.delete({ id: targetMembership.id });
			});
		},

		leaveNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const membership = await requireMembership(
					txNotebookMemberRepo,
					input.appUserId,
					input.notebookId,
				);

				if (membership.role === "owner")
					throw new ForbiddenError(
						"You must delete this notebook or transfer ownership to leave this notebook.",
					);

				return txNotebookMemberRepo.delete({ id: membership.id });
			});
		},

		transferNotebookOwnership(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			memberId: NotebookMember["id"];
		}) {
			return context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const yourMembership = await requireOwnership(
					txNotebookMemberRepo,
					input.appUserId,
					input.notebookId,
				);

				const targetMembership = await requireTargetMembership(
					txNotebookMemberRepo,
					input.memberId,
					input.notebookId,
				);

				if (targetMembership.id === yourMembership.id)
					throw new BadRequestError(
						"UPDATE_SELF_MEMBERSHIP",
						"Cannot transfer ownership back to yourself.",
					);

				const yourUpdatedMembership = await txNotebookMemberRepo.updateRole({
					id: yourMembership.id,
					role: "editor",
				});
				const targetUpdatedMembership = await txNotebookMemberRepo.updateRole({
					id: input.memberId,
					role: "owner",
				});

				if (!targetUpdatedMembership) throw new InvariantError("Target membership should exist.");

				return {
					yourMembership: yourUpdatedMembership,
					targetMembership: targetUpdatedMembership,
				};
			});
		},
	};
}
