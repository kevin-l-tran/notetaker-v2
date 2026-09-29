import { NotebookSummarySchema } from "@notetaker-v2/contracts";

export async function fetchNotebooks() {
	const response = await fetch("/api/notebooks");

	if (!response.ok) {
		throw new Error("Failed to fetch notebooks");
	}

	const data = await response.json();

	return data.map((item: unknown) => NotebookSummarySchema.parse(item));
}
