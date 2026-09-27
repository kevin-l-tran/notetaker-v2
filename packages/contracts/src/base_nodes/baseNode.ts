import z from "zod";
import { NodeIdSchema } from "../ids.ts";

export type BaseNode = z.infer<typeof BaseNodeSchema>;

export const BaseNodeSchema = z.object({
	id: NodeIdSchema,
	notebookId: z.uuid(),
	title: z.string(),
	aliases: z.string().array(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
