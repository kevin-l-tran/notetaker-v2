import z from "zod";
import { ClaimSchema } from "../claims/claim.ts";
import { ConceptSchema } from "../concepts/concept.ts";

export type Node = z.infer<typeof NodeSchema>;

export const NodeSchema = z.union([ClaimSchema, ConceptSchema]);
