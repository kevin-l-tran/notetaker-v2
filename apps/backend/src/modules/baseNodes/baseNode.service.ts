import type { AppUser } from "../../database/schema/appUsers.ts";
import type { BaseNode } from "../../database/schema/baseNodes.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { InvariantError, NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireMembership } from "../notebooks/notebook.access.ts";
import { requireNode, requireNodeForUpdate } from "./baseNode.access.ts";
import { createBaseNodeRepository } from "./baseNode.repository.ts";
import { requireConcept } from "./concepts/concept.access.ts";
import { createConceptRepository } from "./concepts/concept.repository.ts";

export function createBaseNodeService(context: ServiceContext) {
	const baseNodeRepo = createBaseNodeRepository(context.database);
	const conceptRepo = createConceptRepository(context.database);

	return {
		async listNodesForNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(context, input.appUserId, input.notebookId);

			const nodes = [];
			const baseNodes = await baseNodeRepo.findForNotebook({ notebookId: input.notebookId });
			const baseNodesMap = new Map(baseNodes.map((n) => [n.id, n]));

			const baseConceptNodes = baseNodes.filter((n) => n.type === "concept");
			const conceptExtensions = await conceptRepo.findByBaseNodeIds({
				baseNodeIds: baseConceptNodes.map((n) => n.id),
			});

			const extensions = [...conceptExtensions];
			for (const extension of extensions) {
				const baseNode = baseNodesMap.get(extension.baseNodeId);

				// an extension may be created after the base nodes query but before the extensions query,
				// so a missing base node isn't necessarily an invariant error.
				if (baseNode) nodes.push({ baseNode, extension });
			}

			return nodes;
		},

		async getNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
		}) {
			const baseNode = await requireNode(
				context,
				input.appUserId,
				input.notebookId,
				input.baseNodeId,
			);

			if (baseNode.type === "concept")
				return requireConcept(context, input.appUserId, input.notebookId, input.baseNodeId);

			throw new InvariantError("Node type not implemented yet.");
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
