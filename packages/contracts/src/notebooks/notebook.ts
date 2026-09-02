import z from "zod";

export type Notebook = z.infer<typeof NotebookSchema>;

export const NotebookSettings = z.object({});

export const NotebookSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	description: z.string().optional(),
	settings: NotebookSettings,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
