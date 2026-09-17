import z from "zod";
import { NotebookSchema } from "../notebooks/notebook.ts";
import { UserSchema } from "../users/user.ts";

export type NotebookMemberRole = z.infer<typeof NotebookMemberRoleSchema>;
export type NotebookMember = z.infer<typeof NotebookMemberSchema>;

export const NotebookMemberRoles = ["owner", "editor", "viewer"] as const;

export const NotebookMemberRoleSchema = z.enum(NotebookMemberRoles);

export const NotebookMemberSchema = z.object({
	id: z.uuid(),
	notebookId: NotebookSchema.shape.id,
	userId: UserSchema.shape.id,
	role: NotebookMemberRoleSchema,
});

export const NotebookMemberSummarySchema = z.object({
	id: z.uuid(),
	user: z.object({ id: UserSchema.shape.id, displayName: UserSchema.shape.displayName }),
	role: NotebookMemberRoleSchema,
});
