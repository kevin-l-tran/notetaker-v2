import z from "zod";
import { NodeTypeSchema } from "./nodeTypes.ts";

export type CreateNodeRequest = z.infer<typeof CreateNodeRequestSchema>;

export const CreateNodeRequestSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(NodeTypeSchema.enum.concept),
	}),
]);
