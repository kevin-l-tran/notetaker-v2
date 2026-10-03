import {
	type CreateNotebookRequest,
	type NotebookId,
	type NotebookSummary,
	NotebookSummarySchema,
	type UpdateNotebookRequest,
} from "@notetaker-v2/contracts";

export async function fetchNotebooks(): Promise<NotebookSummary[]> {
	const response = await fetch("/api/notebooks");

	if (!response.ok) throw new Error("Failed to fetch notebooks");

	const data = await response.json();

	return data.map((item: unknown) => NotebookSummarySchema.parse(item));
}

export async function createNotebook(input: CreateNotebookRequest): Promise<NotebookSummary> {
	const response = await fetch("/api/notebooks", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) throw new Error("Failed to create notebook");

	const data = await response.json();

	return NotebookSummarySchema.parse(data);
}

export async function updateNotebook({
	notebookId,
	input,
}: {
	notebookId: NotebookId;
	input: UpdateNotebookRequest;
}): Promise<NotebookSummary> {
	const response = await fetch(`/api/notebooks/${notebookId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) throw new Error("Failed to update notebook");

	const data = await response.json();

	return NotebookSummarySchema.parse(data);
}

export async function deleteNotebook({ notebookId }: { notebookId: NotebookId }): Promise<void> {
	const response = await fetch(`/api/notebooks/${notebookId}`, { method: "DELETE" });

	if (!response.ok) throw new Error("Failed to delete notebook");

	return;
}
