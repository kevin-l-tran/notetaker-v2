import z from "zod";
import { ClaimRevisionSchema } from "./claim.ts";
import { ConceptRevisionSchema } from "./concept.ts";

export type NodeRevision = z.infer<typeof NodeRevisionSchema>;

export const NodeRevisionSchema = z.discriminatedUnion("type", [
	ConceptRevisionSchema,
	ClaimRevisionSchema,
]);
