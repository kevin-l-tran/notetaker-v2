import z from "zod";

export type ConceptContent = z.infer<typeof ConceptContentSchema>;

export const ConceptContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(z.string().trim().min(1)),
	descriptionSource: z.string(),
});
