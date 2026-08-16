import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mathFromMarkdown } from "mdast-util-math";
import { math } from "micromark-extension-math";
import { localLinkFromMarkdown } from "./local_links/mdast-extension.ts";
import { localLinkSyntax } from "./local_links/micromark-extension.ts";

export function parseDocument(source: string): Root {
	return fromMarkdown(source, {
		extensions: [math(), localLinkSyntax()],
		mdastExtensions: [mathFromMarkdown(), localLinkFromMarkdown()],
	});
}
