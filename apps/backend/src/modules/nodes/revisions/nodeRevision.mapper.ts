import {
	type NodeRevision,
	NodeRevisionSchema,
	type NodeRevisionSummary,
	NodeRevisionSummarySchema,
} from "@notetaker-v2/contracts";
import type { PublishableNodeContent } from "@notetaker-v2/node_document";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";

export function toNodeRevisionDTO(input: {
	baseRevision: BaseNodeRevision;
	content: PublishableNodeContent;
}) {
	const revision: NodeRevision = {
		...input.baseRevision,
		...input.content,
		createdAt: input.baseRevision.createdAt.toISOString(),
	};

	return NodeRevisionSchema.parse(revision);
}

export function toNodeRevisionSummaryDTO(input: { baseRevision: BaseNodeRevision }) {
	const revisionSummary: NodeRevisionSummary = {
		id: input.baseRevision.id,
		nodeId: input.baseRevision.nodeId,
		revisionNumber: input.baseRevision.revisionNumber,
		title: input.baseRevision.title,
		createdAt: input.baseRevision.createdAt.toISOString(),
	};

	return NodeRevisionSummarySchema.parse(revisionSummary);
}
