import z from "zod";
import { aliasSchema } from "../../node_revisions/alias.ts";

export type ClaimContent = z.infer<typeof ClaimContentSchema>;

export const ClaimContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(aliasSchema),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});
