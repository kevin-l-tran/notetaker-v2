import {
	CreateNodeResponseSchema,
	GetNodeResponseSchema,
	GetNodesResponseSchema,
	NodeDraftSchema,
	NodeSchema,
} from "@notetaker-v2/contracts";
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
	const draft = input.nodeDraft;

	return NodeDraftSchema.parse({
		id: draft.id,
		nodeId: draft.nodeId,
		yjsState: draft.yjsState.toString("base64"),
		saveVersion: draft.saveVersion,
		createdAt: draft.createdAt.toISOString(),
		updatedAt: draft.updatedAt.toISOString(),
	});
}

export function toGetNodesResponseDTO(input: {
	publicationVersion: number;
	nodeContents: NodeContent[];
}) {
	return GetNodesResponseSchema.parse({
		publicationVersion: input.publicationVersion,
		nodes: input.nodeContents.map((n) => toNodeDTO({ nodeContent: n })),
	});
}

export function toGetNodeResponseDTO(input: { nodeContent: NodeContent }) {
	return GetNodeResponseSchema.parse({
		node: toNodeDTO({ nodeContent: input.nodeContent }),
	});
}

export function toCreateNodeResponseDTO(input: {
	nodeContent: NodeContent;
	draftContent: NodeDraft;
}) {
	return CreateNodeResponseSchema.parse({
		node: toNodeDTO({ nodeContent: input.nodeContent }),
		draft: toNodeDraftDTO({ nodeDraft: input.draftContent }),
	});
}
