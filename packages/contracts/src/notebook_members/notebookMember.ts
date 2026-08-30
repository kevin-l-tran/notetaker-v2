import z from "zod";

export type NotebookMember = z.infer<typeof NotebookMemberSchema>;

export const NotebookMemberSchema = z.object({
	_id: z.uuid(),
	notebookId: z.uuid(),
	userId: z.uuid(),
	type: z.enum(["owner", "editor", "viewer"]),
});
