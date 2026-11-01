import z from "zod";
import { NodeDraftSchema } from "../node_drafts/nodeDraft.ts";
import { NodeRevisionSchema, NodeRevisionSummarySchema } from "./nodeRevisions.ts";

export type GetNodeRevisionsResponse = z.infer<typeof GetNodeRevisionsResponseSchema>;
export type GetNodeRevisionResponse = z.infer<typeof GetNodeRevisionResponseSchema>;
export type RestoreNodeRevisionResponse = z.infer<typeof RestoreNodeRevisionResponseSchema>;

export const GetNodeRevisionsResponseSchema = z.array(NodeRevisionSummarySchema);

export const GetNodeRevisionResponseSchema = NodeRevisionSchema;

export const RestoreNodeRevisionResponseSchema = NodeDraftSchema;
