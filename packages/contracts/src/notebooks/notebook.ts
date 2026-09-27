import z from "zod";
import { NotebookIdSchema } from "../ids.ts";
import { NotebookMemberRoleSchema } from "../notebook_members/notebookMember.ts";

export type Notebook = z.infer<typeof NotebookSchema>;
export type NotebookSummary = z.infer<typeof NotebookSummarySchema>;
export type NotebookSettings = z.infer<typeof NotebookSettingsSchema>;

export const NotebookSettingsSchema = z.object({});

export const NotebookSchema = z.object({
	id: NotebookIdSchema,
	title: z.string(),
	description: z.string().optional(),
	settings: NotebookSettingsSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const NotebookSummarySchema = NotebookSchema.extend({
	myRole: NotebookMemberRoleSchema,
});
