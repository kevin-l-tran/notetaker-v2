import z from "zod";

export type ClaimContent = z.infer<typeof ClaimContentSchema>;

export const ClaimContentSchema = z.object({
	title: z.string().trim().min(1),
	aliases: z.array(z.string().trim().min(1)),
	predicateSource: z.string(),
	resultSource: z.string(),
	justificationSource: z.string(),
});
