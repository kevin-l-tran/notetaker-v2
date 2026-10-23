import z from "zod";
import { NodeIdSchema, NodeRevisionIdSchema } from "../ids.ts";
import { aliasSchema } from "./alias.ts";

export type BaseNodeRevision = z.infer<typeof BaseNodeRevisionSchema>;

export const BaseNodeRevisionSchema = z.object({
	id: NodeRevisionIdSchema,
	nodeId: NodeIdSchema,
	revisionNumber: z.number().int().positive(),
	title: z.string(),
	aliases: aliasSchema.array(),
	createdAt: z.iso.datetime(),
});
