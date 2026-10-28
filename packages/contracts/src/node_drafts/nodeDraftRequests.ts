import z from "zod";

export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;
export type PublishDraftRequest = z.infer<typeof PublishDraftRequestSchema>;

export const SaveDraftRequestSchema = z.object({
	expectedSaveVersion: z.number().int().positive(),
	state: z.base64(),
});

export const PublishDraftRequestSchema = z.object({
	expectedSaveVersion: z.number().int().positive(),
});
