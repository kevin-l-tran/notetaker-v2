import type { SourceEdit } from "../types.ts";
import getLocalLinksFromNode from "./get-local-links.ts";

export default function getAutolinkReplacements(text: string): SourceEdit[] {
	const localLinks = getLocalLinksFromNode(text);
	const edits: SourceEdit[] = [];

	for (const link of localLinks) {
		if (link.mode === "automatic") {
			if (
				link.position === undefined ||
				link.position.start.offset === undefined ||
				link.position.end.offset === undefined
			) {
				throw new Error("Expected local link position offsets to be defined");
			}

			edits.push({
				start: link.position.start.offset,
				end: link.position.end.offset,
				replacement: link.value,
			});
		}
	}

	return edits;
}
