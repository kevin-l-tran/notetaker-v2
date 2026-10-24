import z from "zod";
import { aliasSchema } from "../../node_revisions/alias.ts";

export type PublishableConceptContent = z.infer<typeof PublishableConceptContentSchema>;
export type DraftConceptContent = z.infer<typeof DraftConceptContentSchema>;

export const PublishableConceptContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(aliasSchema),
	descriptionSource: z.string(),
});

export const DraftConceptContentSchema = z.object({
	title: z.string(),
	aliases: z.array(aliasSchema),
	descriptionSource: z.string(),
});
