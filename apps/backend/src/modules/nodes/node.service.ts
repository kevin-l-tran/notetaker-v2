import { createEmptyNodeDocument, encodeDocument } from "@notetaker-v2/node_document";
import type { AppUser } from "../../database/schema/appUsers.ts";
import type { Node } from "../../database/schema/node.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireEditPermissionsForShare, requireMembership } from "../notebooks/notebook.access.ts";
import { createNotebookService } from "../notebooks/notebook.service.ts";
import { createNodeDraftRepository } from "./drafts/nodeDraft.repository.ts";
import { requireNode, requireNodeForUpdate } from "./node.access.ts";
import { createNodeRepository } from "./node.repository.ts";
import { createBaseNodeRevisionRepository } from "./revisions/baseNodeRevision.repository.ts";
import { createNodeRevisionRepository } from "./revisions/nodeRevision.repository.ts";

export function createNodeService(context: ServiceContext) {
	const nodeRepo = createNodeRepository(context.database);
	const draftRepo = createNodeDraftRepository(context.database);
	const revisionRepo = createNodeRevisionRepository(context.database);

	return {
		async listNodesForNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			await requireMembership(context, input.appUserId, input.notebookId);

			const [nodes, drafts, revisions] = await Promise.all([
				nodeRepo.findForNotebook({ notebookId: input.notebookId }),
				draftRepo.findForNotebook({ notebookId: input.notebookId }),
				revisionRepo.findLatestForNotebook({ notebookId: input.notebookId }),
			]);

			const draftsByNodeId = new Map(drafts.map((draft) => [draft.nodeId, draft]));
			const revisionsByNodeId = new Map(
				revisions.map((revision) => [revision.baseRevision.nodeId, revision]),
			);

			return nodes
				.map((node) => ({
					node,
					hasDraft: draftsByNodeId.get(node.id) !== undefined,
					revision: revisionsByNodeId.get(node.id),
				}))
				.filter((n) => n.hasDraft || n.revision !== undefined);
		},

		async getNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: Node["id"];
		}) {
			const node = await requireNode(context, input.appUserId, input.notebookId, input.nodeId);

			const [draft, revision] = await Promise.all([
				draftRepo.findByNodeId({ nodeId: node.id }),
				revisionRepo.findLatestForNode({ nodeId: node.id, nodeType: node.type }),
			]);

			if (!draft && !revision) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

			return { node, hasDraft: draft !== undefined, revision };
		},

		async createNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: { type: Node["type"]; title?: string };
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNodeRepo = createNodeRepository(transactionContext.database);
				const txDraftRepo = createNodeDraftRepository(transactionContext.database);

				await requireEditPermissionsForShare(transactionContext, input.appUserId, input.notebookId);

				const node = await txNodeRepo.create({
					notebookId: input.notebookId,
					type: input.data.type,
				});

				const document = createEmptyNodeDocument(input.data.type, input.data.title);

				try {
					const draft = await txDraftRepo.create({
						nodeId: node.id,
						yjsState: Buffer.from(encodeDocument(document)),
					});

					return { node, draft, revision: undefined };
				} finally {
					document.destroy();
				}
			});
		},

		async deleteNode(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: Node["id"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNotebookService = createNotebookService(transactionContext);
				const txNodeRepo = createNodeRepository(transactionContext.database);
				const txBaseNodeRevisionRepo = createBaseNodeRevisionRepository(
					transactionContext.database,
				);

				const node = await requireNodeForUpdate(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.nodeId,
				);

				const revision = await txBaseNodeRevisionRepo.findLatestForNode({
					nodeId: node.id,
				});

				const deletedNode = await txNodeRepo.delete({ id: node.id });

				if (!deletedNode)
					throw new NotFoundError("NODE_NOT_FOUND", "Node to delete was not found.");

				if (revision)
					await txNotebookService.bumpNotebookPublicationVersion({
						appUserId: input.appUserId,
						notebookId: input.notebookId,
					});

				return deletedNode;
			});
		},
	};
}
