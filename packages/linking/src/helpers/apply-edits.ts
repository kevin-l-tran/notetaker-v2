import type { SourceEdit } from "../types.ts";

export default function applyEdits(text: string, edits: SourceEdit[]) {
	const sorted = edits.toSorted((a, b) => a.start - b.start);

	let previous: SourceEdit | undefined;
	let current = sorted[0];
	for (const edit of sorted.slice(1)) {
		if (!current) break;

		previous = current;
		current = edit;

		if (current.start < previous.end) {
			throw new Error("Overlapping edits found");
		}
	}

	for (const edit of sorted.reverse()) {
		text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
	}

	return text;
}
