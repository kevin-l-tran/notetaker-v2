import z from "zod";

export type AliasMode = z.infer<typeof aliasModeSchema>;
export type Alias = z.infer<typeof aliasSchema>;

export const aliasModes = ["auto", "manual"] as const;
export const aliasModeSchema = z.enum(aliasModes);

export const aliasSchema = z.object({
	text: z.string().trim().min(1),
	mode: aliasModeSchema,
});
