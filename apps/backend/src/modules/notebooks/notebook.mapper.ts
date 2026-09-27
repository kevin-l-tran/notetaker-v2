import {
	type NotebookMemberRole,
	NotebookSchema,
	NotebookSummarySchema,
} from "@notetaker-v2/contracts";
import type { Notebook } from "../../database/schema/notebooks.ts";

export function toNotebookDTO(input: { notebook: Notebook }) {
	const notebook = {
		id: input.notebook.id,
		title: input.notebook.title,
		description: input.notebook.description ?? undefined,
		settings: input.notebook.settings,
		createdAt: input.notebook.createdAt.toISOString(),
		updatedAt: input.notebook.updatedAt.toISOString(),
	};

	return NotebookSchema.parse(notebook);
}

export function toNotebookSummaryDTO(input: { notebook: Notebook; myRole: NotebookMemberRole }) {
	const notebook = {
		myRole: input.myRole,
		id: input.notebook.id,
		title: input.notebook.title,
		description: input.notebook.description ?? undefined,
		settings: input.notebook.settings,
		createdAt: input.notebook.createdAt.toISOString(),
		updatedAt: input.notebook.updatedAt.toISOString(),
	};

	return NotebookSummarySchema.parse(notebook);
}
