import z from "zod";
import { BaseNodeSchema, NodeTypeSchema } from "../base_nodes/baseNode.ts";

export type Claim = z.infer<typeof ClaimSchema>;

export const ClaimSchema = z.object({
	...BaseNodeSchema.shape,
	type: z.literal(NodeTypeSchema.enum.claim),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});
