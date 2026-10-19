import z from "zod";
import { NodeIdSchema, NotebookIdSchema } from "../ids.ts";

// Base nodes are objects that have an independent place
// on the knowledge graph.
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type BaseNode = z.infer<typeof BaseNodeSchema>;

export const NodeTypes = ["claim", "concept"] as const;

export const NodeTypeSchema = z.enum(NodeTypes);

export const BaseNodeSchema = z.object({
	id: NodeIdSchema,
	notebookId: NotebookIdSchema,
	type: NodeTypeSchema,
	isPublished: z.boolean(),
	title: z.string(),
	aliases: z.string().array(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
