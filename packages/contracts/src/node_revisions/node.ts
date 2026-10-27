import z from "zod";
import { NodeIdSchema, NodeRevisionIdSchema } from "../ids.ts";
import { ClaimRevisionSchema } from "./claim.ts";
import { ConceptRevisionSchema } from "./concept.ts";

export type NodeRevision = z.infer<typeof NodeRevisionSchema>;
export type NodeRevisionSummary = z.infer<typeof NodeRevisionSummarySchema>;

export const NodeRevisionSchema = z.discriminatedUnion("type", [
	ConceptRevisionSchema,
	ClaimRevisionSchema,
]);

export const NodeRevisionSummarySchema = z.object({
	id: NodeRevisionIdSchema,
	nodeId: NodeIdSchema,
	revisionNumber: z.number().int().positive(),
	title: z.string(),
	createdAt: z.iso.datetime(),
});
