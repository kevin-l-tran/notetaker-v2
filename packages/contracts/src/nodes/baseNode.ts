import z from "zod";
import { NodeIdSchema, NotebookIdSchema } from "../ids.ts";

export const BaseNodeSchema = z.object({
	id: NodeIdSchema,
	notebookId: NotebookIdSchema,
	createdAt: z.iso.datetime(),
	hasDraft: z.boolean(),
});
