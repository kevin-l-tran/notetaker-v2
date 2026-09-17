import z from "zod";

export type CreateNotebookRequest = z.infer<typeof CreateNotebookRequestSchema>;
export type UpdateNotebookRequest = z.infer<typeof UpdateNotebookRequestSchema>;

export const CreateNotebookRequestSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().optional(),
});

export const UpdateNotebookRequestSchema = z
	.object({
		title: z.string().trim().min(1),
		description: z.string(),
	})
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided.",
	});
