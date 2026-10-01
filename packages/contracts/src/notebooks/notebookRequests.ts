import z from "zod";

export type CreateNotebookRequest = z.infer<typeof CreateNotebookRequestSchema>;
export type UpdateNotebookRequest = z.infer<typeof UpdateNotebookRequestSchema>;

export const CreateNotebookRequestSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, { error: "Title is required." })
		.max(100, { error: "Title must be 100 characters or fewer." }),
	description: z
		.string()
		.trim()
		.max(500, { error: "Description must be 500 characters or fewer." })
		.optional(),
});

export const UpdateNotebookRequestSchema = z
	.object({
		title: z.string().trim().min(1),
		description: z.string().trim(),
	})
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided.",
	});
