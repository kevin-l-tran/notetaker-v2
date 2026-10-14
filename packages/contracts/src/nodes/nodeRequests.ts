import z from "zod";
import {
	CreateConceptRequestSchema,
	UpdateConceptRequestSchema,
} from "../concepts/conceptRequests.ts";

export type CreateNodeRequest = z.infer<typeof CreateNodeRequestSchema>;
export type UpdateNodeRequest = z.infer<typeof UpdateNodeRequestSchema>;

export const CreateNodeRequestSchema = z.union([
	z.object({ ...CreateConceptRequestSchema.shape, type: z.literal("concept") }),
]);

export const UpdateNodeRequestSchema = z
	.union([z.object({ ...UpdateConceptRequestSchema.shape, type: z.literal("concept") })])
	// shape spreads do not preserve refinements, so we add one here
	.refine((data) => Object.keys(data).length > 1, {
		message: "At least one field must be provided.",
	});
