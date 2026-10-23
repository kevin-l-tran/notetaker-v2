import type { AppUser } from "../../database/schema/appUsers.ts";
import type { NewNotebook, Notebook } from "../../database/schema/notebooks.ts";
import { ConflictError, NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import {
	requireEditPermissionsForShare,
	requireNotebookForUpdate,
	requireOwnershipForShare,
} from "./notebook.access.ts";
import { createNotebookRepository } from "./notebook.repository.ts";
import { createNotebookMemberRepository } from "./notebookMember.repository.ts";

export function createNotebookService(context: ServiceContext) {
	const notebookRepo = createNotebookRepository(context.database);

	return {
		async listNotebooksForUser(input: { appUserId: AppUser["id"] }) {
			return await notebookRepo.findForUser(input);
		},

		async getNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			const notebook = await notebookRepo.findByIdForUser(input);

			if (!notebook)
				throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.");

			return notebook;
		},

		async createNotebook(input: {
			appUserId: AppUser["id"];
			data: { title: NewNotebook["title"]; description?: NewNotebook["description"] };
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);
				const txNotebookMemberRepo = createNotebookMemberRepository(transactionContext.database);

				const notebook = await txNotebookRepo.create(input.data);
				const membership = await txNotebookMemberRepo.create({
					appUserId: input.appUserId,
					notebookId: notebook.id,
					role: "owner",
				});

				return { ...notebook, myRole: membership.role };
			});
		},

		async updateNotebook(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: {
				title?: NewNotebook["title"];
				description?: NewNotebook["description"];
			};
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);

				await requireNotebookForUpdate(transactionContext, input.notebookId);

				const membership = await requireOwnershipForShare(
					transactionContext,
					input.appUserId,
					input.notebookId,
				);

				const updatedNotebook = await txNotebookRepo.update({
					...input.data,
					id: input.notebookId,
				});

				if (!updatedNotebook)
					throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Notebook to update was not found.");

				return { ...updatedNotebook, myRole: membership.role };
			});
		},

		async bumpNotebookPublicationVersion(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			publicationVersion: Notebook["publicationVersion"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);

				await requireNotebookForUpdate(transactionContext, input.notebookId);

				const membership = await requireEditPermissionsForShare(
					transactionContext,
					input.appUserId,
					input.notebookId,
				);

				const updatedNotebook = await txNotebookRepo.updatePublicationVersion({
					id: input.notebookId,
					publicationVersion: input.publicationVersion,
				});

				if (!updatedNotebook)
					throw new ConflictError(
						"OUTDATED_NOTEBOOK_PUBLICATION_VERSION",
						"Notebook publication version is outdated.",
					);

				return { ...updatedNotebook, myRole: membership.role };
			});
		},

		async deleteNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookRepo = createNotebookRepository(transactionContext.database);

				await requireNotebookForUpdate(transactionContext, input.notebookId);

				const membership = await requireOwnershipForShare(
					transactionContext,
					input.appUserId,
					input.notebookId,
				);

				const deletedNotebook = await txNotebookRepo.delete({ id: input.notebookId });

				if (!deletedNotebook)
					throw new NotFoundError("NOTEBOOK_NOT_FOUND", "Notebook to delete was not found.");

				return { ...deletedNotebook, myRole: membership.role };
			});
		},
	};
}
