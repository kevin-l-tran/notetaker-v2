import {
	type CreateNotebookRequest,
	type NotebookSummary,
	NotebookSummarySchema,
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

	return await response.json();
}
