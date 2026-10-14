import { type Node, NodeSchema } from "@notetaker-v2/contracts";
import type { NodeData } from "./node.types.ts";

export function toNodeDTO(input: { nodeData: NodeData }) {
	const { baseNodeId, ...extensionData } = input.nodeData.extension;

	const node = {
		...input.nodeData.baseNode,
		...extensionData,
		createdAt: input.nodeData.baseNode.createdAt.toISOString(),
		updatedAt: input.nodeData.baseNode.updatedAt.toISOString(),
	} satisfies Node;

	return NodeSchema.parse(node);
}
