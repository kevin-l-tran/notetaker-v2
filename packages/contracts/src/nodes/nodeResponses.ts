import z from "zod";
import { NodeSchema } from "./node.ts";

export const getNodesResponseSchema = z.object({
	publicationVersion: z.number().int().nonnegative(),
	nodes: z.array(NodeSchema),
});
