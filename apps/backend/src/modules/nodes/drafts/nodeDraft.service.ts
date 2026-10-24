import {
	createDocumentFromRevision,
	decodeDocument,
	encodeDocument,
	extractDraftContent,
} from "@notetaker-v2/node_document";
import type * as Y from "yjs";
import type { AppUser } from "../../../database/schema/appUsers.ts";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import type { NewNodeDraft, NodeDraft } from "../../../database/schema/nodeDraft.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import {
	BadRequestError,
	ConflictError,
	InvariantError,
	NotFoundError,
} from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { requireNodeForEdit, requireNodeForShare, requireNodeForUpdate } from "../node.access.ts";
import { createNodeRepository } from "../node.repository.ts";
import { createBaseNodeRevisionRepository } from "../revisions/baseNodeRevision.repository.ts";
import { getLatestNodeContent } from "../revisions/nodeRevision.reader.ts";
import { createNodeDraftRepository } from "./nodeDraft.repository.ts";

export function createNodeDraftService(context: ServiceContext) {
	const nodeDraftRepo = createNodeDraftRepository(context.database);

	return {
		async getDraft(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
		}) {
			await requireNodeForEdit(context, input.appUserId, input.notebookId, input.nodeId);

			const draft = await nodeDraftRepo.findByNodeId({ nodeId: input.nodeId });

			if (!draft) throw new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find node draft.");

			return draft;
		},

		async createDraft(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNodeDraftRepo = createNodeDraftRepository(transactionContext.database);

				const node = await requireNodeForUpdate(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.nodeId,
				);

				const existingDraft = await txNodeDraftRepo.findByNodeId({ nodeId: node.id });

				if (existingDraft) return existingDraft;

				const content = await getLatestNodeContent(transactionContext, node);

				if (!content) throw new InvariantError("Node exists without a base revision or draft.");

				const document = createDocumentFromRevision(content);

				try {
					return await txNodeDraftRepo.create({
						nodeId: node.id,
						yjsState: Buffer.from(encodeDocument(document)),
					});
				} finally {
					document.destroy();
				}
			});
		},

		async saveDraft(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
			draftId: NodeDraft["id"];
			yjsState: NewNodeDraft["yjsState"];
			expectedSaveVersion: NodeDraft["saveVersion"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNodeDraftRepo = createNodeDraftRepository(transactionContext.database);

				const node = await requireNodeForShare(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.nodeId,
				);

				const existingDraft = await txNodeDraftRepo.findByNodeId({ nodeId: node.id });

				if (!existingDraft)
					throw new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to save.");

				if (existingDraft.id !== input.draftId)
					throw new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to save.");

				if (existingDraft.saveVersion !== input.expectedSaveVersion)
					throw new ConflictError("STALE_NODE_DRAFT", "Node draft to save is stale.");

				let document: Y.Doc;

				try {
					document = decodeDocument(input.yjsState);
				} catch {
					throw new BadRequestError("INVALID_DRAFT_CONTENT", "Could not decode draft content.");
				}

				try {
					try {
						extractDraftContent(document, node.type);
					} catch {
						throw new BadRequestError("INVALID_DRAFT_CONTENT", "Could not parse draft content.");
					}

					const savedDraft = await txNodeDraftRepo.saveIfVersionMatches({
						id: input.draftId,
						saveVersion: input.expectedSaveVersion,
						yjsState: input.yjsState,
					});

					if (!savedDraft) {
						throw new ConflictError("STALE_NODE_DRAFT", "Node draft was modified concurrently.");
					}

					return savedDraft;
				} finally {
					document.destroy();
				}
			});
		},

		async discardDraft(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
			draftId: NodeDraft["id"];
		}) {
			return await context.transaction(async (transactionContext) => {
				const txNodeRepo = createNodeRepository(transactionContext.database);
				const txNodeDraftRepo = createNodeDraftRepository(transactionContext.database);
				const txBaseNodeRevisionRepo = createBaseNodeRevisionRepository(
					transactionContext.database,
				);

				const node = await requireNodeForUpdate(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.nodeId,
				);

				const draft = await txNodeDraftRepo.findByNodeId({
					nodeId: node.id,
				});

				if (!draft || draft.id !== input.draftId) {
					throw new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to discard.");
				}

				const revision = await txBaseNodeRevisionRepo.findLatestForNode({ nodeId: node.id });

				if (!revision) {
					await txNodeRepo.delete({ id: node.id });
				} else {
					await txNodeDraftRepo.delete({ id: draft.id });
				}

				return;
			});
		},
	};
}
