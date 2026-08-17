import type { SourceEdit } from "../types.ts";

export default function applyEdits(text: string, edits: SourceEdit[]) {
	const endSorted = edits.toSorted((a, b) => a.end - b.end);
	const beginSorted = edits.toSorted((a, b) => b.start - a.start);

	if (JSON.stringify(endSorted) !== JSON.stringify(beginSorted)) {
		throw new Error("Overlapping edits found");
	}

	for (const edit of endSorted) {
		text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
	}

	return text;
}
