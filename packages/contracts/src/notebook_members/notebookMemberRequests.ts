import z from "zod";
import { UserSchema } from "../users/user.ts";

export type SettableNotebookMemberRole = z.infer<typeof SettableNotebookMemberRoleSchema>;
export type CreateNotebookMemberRequest = z.infer<typeof CreateNotebookMemberRequestSchema>;
export type UpdateNotebookMemberRequest = z.infer<typeof UpdateNotebookMemberRequestSchema>;

export const SettableNotebookMemberRoles = ["editor", "viewer"] as const;

export const SettableNotebookMemberRoleSchema = z.enum(["editor", "viewer"]);

export const CreateNotebookMemberRequestSchema = z.object({
	userId: UserSchema.shape.id,
	role: SettableNotebookMemberRoleSchema,
});

export const UpdateNotebookMemberRequestSchema = z.object({
	role: SettableNotebookMemberRoleSchema,
});
