import { NodeDraftSchema, NodeSchema } from "@notetaker-v2/contracts";
import type { PublishableNodeContent } from "@notetaker-v2/node_document";
import type { BaseNodeRevision } from "../../database/schema/baseNodeRevisions.ts";
import type { Node as DbNode } from "../../database/schema/node.ts";
import type { NodeDraft } from "../../database/schema/nodeDraft.ts";

type NodeContent = {
	node: DbNode;
	hasDraft: boolean;
	revision:
		| {
				baseRevision: BaseNodeRevision;
				content: PublishableNodeContent;
		  }
		| undefined;
};

export function toNodeDTO(input: { nodeContent: NodeContent }) {
	const latestRevision = input.nodeContent.revision
		? {
				...input.nodeContent.revision.baseRevision,
				...input.nodeContent.revision.content,
				createdAt: input.nodeContent.revision.baseRevision.createdAt.toISOString(),
			}
		: null;

	const node = {
		...input.nodeContent.node,
		createdAt: input.nodeContent.node.createdAt.toISOString(),
		hasDraft: input.nodeContent.hasDraft,
		latestRevision,
	};

	return NodeSchema.parse(node);
}

export function toNodeDraftDTO(input: { nodeDraft: NodeDraft }) {
	const nodeDraft = {
		...input.nodeDraft,
		yjsState: input.nodeDraft.yjsState.toString("base64"),
		createdAt: input.nodeDraft.createdAt.toISOString(),
		updatedAt: input.nodeDraft.updatedAt.toISOString(),
	};

	return NodeDraftSchema.parse(nodeDraft);
}
