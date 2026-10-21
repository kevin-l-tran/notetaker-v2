import z from "zod";
import { NodeTypeSchema } from "../nodes/nodeTypes.ts";
import { BaseNodeRevisionSchema } from "./baseNode.ts";

export type ClaimRevision = z.infer<typeof ClaimRevisionSchema>;

export const ClaimRevisionSchema = z.object({
	...BaseNodeRevisionSchema.shape,
	type: z.literal(NodeTypeSchema.enum.claim),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});
