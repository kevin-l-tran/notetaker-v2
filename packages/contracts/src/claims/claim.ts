import z from "zod";
import { BaseNode } from "../baseNodes/baseNode.js";

export const Claim = z.object({
    ...BaseNode.shape,
    type: z.literal("claim"),
    predicateSource: z.string(),
    resultSource: z.string(),
    justificationSource: z.string(),
});
