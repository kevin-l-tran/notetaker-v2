import z from "zod";
import { BaseNodeSchema } from "../base_nodes/baseNode.ts";

export type Concept = z.infer<typeof ConceptSchema>

export const ConceptSchema = z.object({
    ...BaseNodeSchema.shape,
    type: z.literal("concept"),
    descriptionSource: z.string()
});
