import z from "zod";
import { NodeTypeSchema } from "../nodes/nodeTypes.ts";
import { BaseNodeRevisionSchema } from "./baseNode.ts";

export type ConceptRevision = z.infer<typeof ConceptRevisionSchema>;

export const ConceptRevisionSchema = z.object({
	...BaseNodeRevisionSchema.shape,
	type: z.literal(NodeTypeSchema.enum.concept),
	descriptionSource: z.string(),
});
