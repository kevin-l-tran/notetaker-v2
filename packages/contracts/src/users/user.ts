import z from "zod";

export type User = z.infer<typeof UserSchema>;

export const UserSchema = z.object({
	_id: z.uuid(),
	email: z.email(),
	displayName: z.string().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
