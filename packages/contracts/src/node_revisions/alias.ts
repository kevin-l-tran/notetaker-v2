import z from "zod";
import { NodeIdSchema } from "../ids.ts";

export type AliasMode = z.infer<typeof aliasModeSchema>;
export type Alias = z.infer<typeof aliasSchema>;
export type ExcludedAlias = z.infer<typeof excludedAliasSchema>;

export const aliasModes = ["auto", "manual"] as const;
export const aliasModeSchema = z.enum(aliasModes);

export const aliasSchema = z.object({
	text: z.string().trim().min(1),
	mode: aliasModeSchema,
});

export const excludedAliasSchema = z.object({
	nodeId: NodeIdSchema,
	text: z.string().trim().min(1),
});
