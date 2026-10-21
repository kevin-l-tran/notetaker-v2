import z from "zod";

export type NodeType = z.infer<typeof NodeTypeSchema>;

export const NodeTypes = ["claim", "concept"] as const;
export const NodeTypeSchema = z.enum(NodeTypes);
