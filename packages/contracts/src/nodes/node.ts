import z from "zod";
import { ClaimRevisionSchema } from "../node_revisions/claim.ts";
import { ConceptRevisionSchema } from "../node_revisions/concept.ts";
import { BaseNodeSchema } from "./baseNode.ts";

// Nodes are objects that have an independent place
// on the knowledge graph.
export type Node = z.infer<typeof NodeSchema>;

export const NodeSchema = z.discriminatedUnion("type", [
	BaseNodeSchema.extend({
		type: z.literal("concept"),
		latestRevision: ConceptRevisionSchema.nullable(),
	}),
	BaseNodeSchema.extend({
		type: z.literal("claim"),
		latestRevision: ClaimRevisionSchema.nullable(),
	}),
]);
