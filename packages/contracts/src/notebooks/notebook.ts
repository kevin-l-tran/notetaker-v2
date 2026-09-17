import z from "zod";

export type Notebook = z.infer<typeof NotebookSchema>;
export type NotebookSettings = z.infer<typeof NotebookSettingsSchema>;

export const NotebookSettingsSchema = z.object({});

export const NotebookSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	description: z.string().optional(),
	settings: NotebookSettingsSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
