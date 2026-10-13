import type { AppUser } from "../../database/schema/appUsers.ts";
import type { BaseNode } from "../../database/schema/baseNodes.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireMembership } from "../notebooks/notebook.access.ts";
import { requireNode, requireNodeForUpdate } from "./baseNode.access.ts";
import { createBaseNodeRepository } from "./baseNode.repository.ts";

export function createBaseNodeService(context: ServiceContext) {
	const baseNodeRepo = createBaseNodeRepository(context.database);

	return {
		async listNodesForNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(context, input.appUserId, input.notebookId);

			return baseNodeRepo.findForNotebook({ notebookId: input.notebookId });
		},

		async getNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
		}) {
			return await requireNode(context, input.appUserId, input.notebookId, input.baseNodeId);
		},

		async deleteNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txBaseNodeRepo = createBaseNodeRepository(transactionContext.database);

				await requireNodeForUpdate(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.baseNodeId,
				);

				const deletedNode = await txBaseNodeRepo.delete({ id: input.baseNodeId });

				if (!deletedNode)
					throw new NotFoundError("NODE_NOT_FOUND", "Node to delete was not found.");

				return deletedNode;
			});
		},
	};
}
