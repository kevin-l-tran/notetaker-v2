import { type LocalLink, parseDocument } from "@notetaker-v2/markdown_extensions";
import type { Nodes } from "mdast";

export default function getLocalLinks(text: string) {
	const node = parseDocument(text);
	return getLocalLinksFromNode(node);
}

function getLocalLinksFromNode(node: Nodes) {
	const localLinks: LocalLink[] = [];

	if ("children" in node) {
		for (const child of node.children) {
			localLinks.push(...getLocalLinksFromNode(child));
		}
	}

	if (node.type === "localLink") localLinks.push(node);

	return localLinks;
}
