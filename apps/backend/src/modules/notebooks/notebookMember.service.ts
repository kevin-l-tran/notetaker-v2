import type { AppUser } from "../../database/schema/appUsers.ts";
import type { NewNotebookMember, NotebookMember } from "../../database/schema/notebookMembers.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import {
	BadRequestError,
	ForbiddenError,
	InvariantError,
	NotFoundError,
} from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createUserService } from "../users/user.service.ts";
import { requireMembership, requireOwnership, requireTargetMembership } from "./notebook.access.ts";
import { createNotebookRepository } from "./notebook.repository.ts";
import { createNotebookMemberRepository } from "./notebookMember.repository.ts";

export function createNotebookMemberService(context: ServiceContext) {
	const notebookMemberRepo = createNotebookMemberRepository(context.database);

	async function lockNotebook(
		txNotebookRepo: ReturnType<typeof createNotebookRepository>,
		notebookId: Notebook["id"],
	) {
		const notebook = await txNotebookRepo.findByIdForUpdate({ id: notebookId });

		if (!notebook) throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

		return notebook;
	}

	return {
		async listNotebookMembers(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(context, input.appUserId, input.notebookId);

			return notebookMemberRepo.findForNotebookWithUsers({ notebookId: input.notebookId });
		},

		async getNotebookMembership(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return await requireMembership(context, input.appUserId, input.notebookId);
		},

		async addNotebookMember(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: {
				targetAppUserId: AppUser["id"];
				role: NewNotebookMember["role"];
			};
		}) {
			if (input.data.role === "owner")
				throw new BadRequestError("INVALID_MEMBERSHIP_ROLE", "Cannot create a new notebook owner.");

			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);
				const txUserService = createUserService(transactionContext);

				await lockNotebook(txNotebookRepo, input.notebookId);

				await requireOwnership(transactionContext, input.appUserId, input.notebookId);

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

		async updateNotebookMemberRole(input: {
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

			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const yourMembership = await requireOwnership(
					transactionContext,
					input.appUserId,
					input.notebookId,
				);

				const targetMembership = await requireTargetMembership(
					transactionContext,
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

		async removeNotebookMember(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			memberId: NotebookMember["id"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				await requireOwnership(transactionContext, input.appUserId, input.notebookId);

				const targetMembership = await requireTargetMembership(
					transactionContext,
					input.memberId,
					input.notebookId,
				);

				if (targetMembership.role === "owner")
					throw new ForbiddenError("Notebook ownership must be transferred instead.");

				return txNotebookMemberRepo.delete({ id: targetMembership.id });
			});
		},

		async leaveNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const membership = await requireMembership(
					transactionContext,
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

		async transferNotebookOwnership(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			memberId: NotebookMember["id"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				await lockNotebook(txNotebookRepo, input.notebookId);

				const yourMembership = await requireOwnership(
					transactionContext,
					input.appUserId,
					input.notebookId,
				);

				const targetMembership = await requireTargetMembership(
					transactionContext,
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
