import { type NodeDraft as ContractNodeDraft, NodeDraftSchema } from "@notetaker-v2/contracts";
import type { NodeDraft as DbNodeDraft } from "../../../database/schema/nodeDraft.ts";

export function toNodeDraftDTO(input: { nodeDraft: DbNodeDraft }) {
	const draft: ContractNodeDraft = {
		id: input.nodeDraft.id,
		nodeId: input.nodeDraft.nodeId,
		state: input.nodeDraft.yjsState.toString("base64"),
		saveVersion: input.nodeDraft.saveVersion,
		createdAt: input.nodeDraft.createdAt.toISOString(),
		updatedAt: input.nodeDraft.updatedAt.toISOString(),
	};

	return NodeDraftSchema.parse(draft);
}
