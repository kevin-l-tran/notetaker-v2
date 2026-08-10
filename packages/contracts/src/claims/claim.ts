import z from "zod";
import { BaseNodeSchema } from "../baseNodes/baseNode.ts";

export type Claim = z.infer<typeof ClaimSchema>

export const ClaimSchema = z.object({
    ...BaseNodeSchema.shape,
    type: z.literal("claim"),
    predicateSource: z.string(),
    resultSource: z.string(),
    justificationSource: z.string(),
});
