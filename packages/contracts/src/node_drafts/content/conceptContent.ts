import z from "zod";
import { aliasSchema } from "../../node_revisions/alias.ts";

export type ConceptContent = z.infer<typeof ConceptContentSchema>;

export const ConceptContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(aliasSchema),
	descriptionSource: z.string(),
});
