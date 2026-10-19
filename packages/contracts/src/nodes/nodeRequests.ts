import z from "zod";
import { NodeTypeSchema } from "../base_nodes/baseNode.ts";

export type CreateNodeRequest = z.infer<typeof CreateNodeRequestSchema>;

export const CreateNodeRequestSchema = z.object({
	type: NodeTypeSchema,
});
