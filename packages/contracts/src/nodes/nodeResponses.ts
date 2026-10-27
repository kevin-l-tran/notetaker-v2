import z from "zod";
import { NodeDraftSchema } from "../node_drafts/nodeDraft.ts";
import { NodeSchema } from "./node.ts";

export type GetNodesResponse = z.infer<typeof GetNodesResponseSchema>;
export type GetNodeResponse = z.infer<typeof GetNodeResponseSchema>;
export type CreateNodeResponse = z.infer<typeof CreateNodeResponseSchema>;
export type DeleteNodeResponse = z.infer<typeof DeleteNodeResponseSchema>;

export const GetNodesResponseSchema = z.object({
	publicationVersion: z.number().int().nonnegative(),
	nodes: z.array(NodeSchema),
});

export const GetNodeResponseSchema = z.object({
	node: NodeSchema,
});

export const CreateNodeResponseSchema = z.object({
	node: NodeSchema,
	draft: NodeDraftSchema,
});

export const DeleteNodeResponseSchema = z.undefined();
