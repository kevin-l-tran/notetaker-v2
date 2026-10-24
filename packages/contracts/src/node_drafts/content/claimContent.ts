import z from "zod";
import { aliasSchema, excludedAliasSchema } from "../../node_revisions/alias.ts";

export type PublishableClaimContent = z.infer<typeof PublishableClaimContentSchema>;
export type DraftClaimContent = z.infer<typeof DraftClaimContentSchema>;

export const PublishableClaimContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(aliasSchema),
	excludedAliases: z.array(excludedAliasSchema),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});

export const DraftClaimContentSchema = z.object({
	title: z.string(),
	aliases: z.array(aliasSchema),
	excludedAliases: z.array(excludedAliasSchema),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});
