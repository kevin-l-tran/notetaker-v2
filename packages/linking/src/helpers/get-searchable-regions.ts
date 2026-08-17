import { parseDocument } from "@notetaker-v2/markdown_extensions";
import type { Nodes } from "mdast";
import type { SearchableRegion } from "../types.ts";

const PROTECTED_REGIONS = [
	"link",
	"linkReference",
	"localLink",
	"inlineCode",
	"code",
	"inlineMath",
	"math",
	"html",
	"image",
	"imageReference",
	"definition",
];

export default function getSearchableRegions(text: string) {
	return getSearchableRegionsFromAst(parseDocument(text));
}

function getSearchableRegionsFromAst(node: Nodes) {
	const regions: SearchableRegion[] = [];

	if (node.type === "text") {
		if (
			node.position === undefined ||
			node.position.start.offset === undefined ||
			node.position.end.offset === undefined
		) {
			throw new Error("Expected node position offsets to be defined");
		}

		regions.push({
			start: node.position.start.offset,
			end: node.position.end.offset,
		});
	} else if (!PROTECTED_REGIONS.includes(node.type) && "children" in node) {
		for (const child of node.children) {
			regions.push(...getSearchableRegionsFromAst(child));
		}
	}

	return regions;
}
