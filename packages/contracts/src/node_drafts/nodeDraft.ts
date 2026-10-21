import z from "zod";
import { NodeDraftIdSchema, NodeIdSchema } from "../ids.ts";

export type NodeDraft = z.infer<typeof NodeDraftSchema>;

export const NodeDraftSchema = z.object({
	id: NodeDraftIdSchema,
	nodeId: NodeIdSchema,
	state: z.base64(),
	saveVersion: z.number().int().positive(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
