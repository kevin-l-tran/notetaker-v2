import z from "zod";
import { UserIdSchema } from "../ids.ts";

export type User = z.infer<typeof UserSchema>;

export const UserSchema = z.object({
	id: UserIdSchema,
	displayName: z.string().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
