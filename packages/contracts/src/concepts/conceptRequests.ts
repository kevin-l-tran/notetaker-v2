import z from "zod";
import { NotebookIdSchema } from "../ids.ts";

export const CreateConceptRequestSchema = z.object({
	notebookId: NotebookIdSchema,
	title: z
		.string()
		.trim()
		.min(1, { error: "Title is required." })
		.max(60, { error: "Title must be 60 characters or fewer." }),
	aliases: z
		.string()
		.trim()
		.min(1, { error: "Alias cannot be nonempty." })
		.array()
		.refine((a) => a.length === [...new Set(a)].length),
	descriptionSource: z.string().trim(),
});

export const UpdateConceptRequestSchema = z
	.object({
		aliases: z
			.string()
			.trim()
			.min(1, { error: "Alias cannot be nonempty." })
			.array()
			.refine((a) => a.length === [...new Set(a)].length),
		descriptionSource: z.string().trim(),
	})
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided.",
	});
