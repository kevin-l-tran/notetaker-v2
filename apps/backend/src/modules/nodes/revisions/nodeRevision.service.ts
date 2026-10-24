import { createDocumentFromRevision, encodeDocument } from "@notetaker-v2/node_document";
import type { AppUser } from "../../../database/schema/appUsers.ts";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import type { Node } from "../../../database/schema/node.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import { ConflictError, NotFoundError } from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { createNodeDraftRepository } from "../drafts/nodeDraft.repository.ts";
import { requireNode, requireNodeForUpdate } from "../node.access.ts";
import { createBaseNodeRevisionRepository } from "./baseNodeRevision.repository.ts";
import { createNodeRevisionRepository } from "./nodeRevision.repository.ts";

export function createNodeRevisionService(context: ServiceContext) {
	const baseNodeRevisionRepo = createBaseNodeRevisionRepository(context.database);
	const nodeRevisionRepo = createNodeRevisionRepository(context.database);

	return {
		async listRevisions(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: Node["id"];
		}) {
			const node = await requireNode(context, input.appUserId, input.notebookId, input.nodeId);
			return baseNodeRevisionRepo.findForNode({ nodeId: node.id });
		},

		async getRevision(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: Node["id"];
			revisionNumber: BaseNodeRevision["revisionNumber"];
		}) {
			const node = await requireNode(context, input.appUserId, input.notebookId, input.nodeId);

			const revision = await nodeRevisionRepo.findByNodeIdAndRevisionNumber({
				nodeId: node.id,
				nodeType: node.type,
				revisionNumber: input.revisionNumber,
			});

			if (!revision) {
				throw new NotFoundError("NODE_REVISION_NOT_FOUND", "Could not find node revision.");
			}

			return revision;
		},

		async restoreRevision(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: Node["id"];
			revisionNumber: number;
		}) {
			return await context.transaction(async (tx) => {
				const draftRepo = createNodeDraftRepository(tx.database);
				const txNodeRevisionRepo = createNodeRevisionRepository(tx.database);

				const node = await requireNodeForUpdate(
					tx,
					input.appUserId,
					input.notebookId,
					input.nodeId,
				);

				const existingDraft = await draftRepo.findByNodeId({
					nodeId: node.id,
				});

				if (existingDraft) {
					throw new ConflictError(
						"NODE_DRAFT_EXISTS",
						"Discard the existing draft before restoring a revision.",
					);
				}

				const revision = await txNodeRevisionRepo.findByNodeIdAndRevisionNumber({
					nodeId: node.id,
					nodeType: node.type,
					revisionNumber: input.revisionNumber,
				});

				if (!revision) {
					throw new NotFoundError(
						"NODE_REVISION_NOT_FOUND",
						"Could not find the requested revision.",
					);
				}

				const document = createDocumentFromRevision(revision.content);

				try {
					return await draftRepo.create({
						nodeId: node.id,
						yjsState: Buffer.from(encodeDocument(document)),
					});
				} finally {
					document.destroy();
				}
			});
		},
	};
}
