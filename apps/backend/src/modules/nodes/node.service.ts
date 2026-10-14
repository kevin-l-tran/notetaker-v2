import type { AppUser } from "../../database/schema/appUsers.ts";
import type { BaseNode } from "../../database/schema/baseNodes.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { InvariantError, NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireMembership } from "../notebooks/notebook.access.ts";
import { requireNodeForUpdate } from "./baseNode.access.ts";
import { createBaseNodeRepository } from "./baseNode.repository.ts";
import { createConceptService } from "./concepts/concept.service.ts";
import { createNodeRepository } from "./node.repository.ts";
import type { CreateNodeData, NodeData, UpdateNodeData } from "./node.types.ts";

export function createNodeService(context: ServiceContext) {
	const nodeRepo = createNodeRepository(context.database);
	const conceptService = createConceptService(context);

	return {
		async listNodesForNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(context, input.appUserId, input.notebookId);

			const nodes: NodeData[] = [];

			const nodeData = await nodeRepo.findForNotebookWithExtension({
				notebookId: input.notebookId,
			});

			for (const node of nodeData) {
				switch (node.base_nodes.type) {
					case "concept": {
						const extension = node.concepts;

						if (!extension)
							throw new InvariantError(
								"Expected base node with concept type to have concept object.",
							);

						nodes.push({ baseNode: node.base_nodes, extension });
						break;
					}

					default: {
						throw new InvariantError(
							`Unsupported type: ${JSON.stringify(node.base_nodes.type satisfies never)}`,
						);
					}
				}
			}

			return nodes;
		},

		async getNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
		}) {
			await requireMembership(context, input.appUserId, input.notebookId);

			const node = await nodeRepo.findByBaseNodeIdAndNotebookIdWithExtension({
				baseNodeId: input.baseNodeId,
				notebookId: input.notebookId,
			});

			if (!node) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

			switch (node.base_nodes.type) {
				case "concept": {
					const extension = node.concepts;

					if (!extension)
						throw new InvariantError(
							"Expected base node with concept type to have concept object.",
						);

					return { baseNode: node.base_nodes, extension };
				}

				default: {
					throw new InvariantError(
						`Unsupported type: ${JSON.stringify(node.base_nodes.type satisfies never)}`,
					);
				}
			}
		},

		async createNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: CreateNodeData;
		}) {
			if (input.data.type === "concept")
				return await conceptService.createConcept({
					appUserId: input.appUserId,
					notebookId: input.notebookId,
					data: input.data,
				});

			throw new InvariantError(
				`Unsupported type: ${JSON.stringify(input.data.type satisfies never)}`,
			);
		},

		async updateNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
			data: UpdateNodeData;
		}) {
			if (input.data.type === "concept")
				return await conceptService.updateConcept({
					appUserId: input.appUserId,
					notebookId: input.notebookId,
					baseNodeId: input.baseNodeId,
					data: input.data,
				});

			throw new InvariantError(
				`Unsupported type: ${JSON.stringify(input.data.type satisfies never)}`,
			);
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
