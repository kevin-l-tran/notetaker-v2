import z from "zod";

export type BaseNode = z.infer<typeof BaseNodeSchema>;

export const BaseNodeSchema = z.object({
	_id: z.uuid(),
	notebookId: z.uuid(),
	title: z.string(),
	aliases: z.string().array(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
