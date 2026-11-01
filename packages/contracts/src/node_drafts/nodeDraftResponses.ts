import z from "zod";
import { NodeRevisionSchema } from "../node_revisions/nodeRevisions.ts";
import { NodeDraftSchema } from "./nodeDraft.ts";

export type GetNodeDraftResponse = z.infer<typeof GetNodeDraftResponseSchema>;
export type CreateNodeDraftResponse = z.infer<typeof CreateNodeDraftResponseSchema>;
export type PublishNodeDraftResponse = z.infer<typeof PublishNodeDraftResponseSchema>;
export type SaveNodeDraftResponse = z.infer<typeof SaveNodeDraftResponseSchema>;

export const GetNodeDraftResponseSchema = NodeDraftSchema;

export const CreateNodeDraftResponseSchema = NodeDraftSchema;

export const PublishNodeDraftResponseSchema = z.object({
	publicationVersion: z.number().int().positive(),
	revision: NodeRevisionSchema,
});

export const SaveNodeDraftResponseSchema = NodeDraftSchema;
