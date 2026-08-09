import z from "zod";
import { BaseNode } from "../baseNodes/baseNode.js";

export const Concept = z.object({
    ...BaseNode.shape,
    type: z.literal("concept"),
    descriptionSource: z.string()
});
