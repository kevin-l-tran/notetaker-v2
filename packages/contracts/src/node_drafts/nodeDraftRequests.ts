import z from "zod";
import { NodeDraftIdSchema } from "../ids.ts";

export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;
export type PublishDraftRequest = z.infer<typeof PublishDraftRequestSchema>;

export const SaveDraftRequestSchema = z.object({
	draftId: NodeDraftIdSchema,
	expectedSaveVersion: z.number().int().positive(),
	state: z.base64(),
});

export const PublishDraftRequestSchema = z.object({
	draftId: NodeDraftIdSchema,
	expectedSaveVersion: z.number().int().positive(),
});
