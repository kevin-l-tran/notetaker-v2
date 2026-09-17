import z from "zod";

export type NotebookMember = z.infer<typeof NotebookMemberSchema>;

export const NotebookMemberRoles = ["owner", "editor", "viewer"] as const;

export const NotebookMemberSchema = z.object({
	id: z.uuid(),
	notebookId: z.uuid(),
	userId: z.uuid(),
	role: z.enum(NotebookMemberRoles),
});
