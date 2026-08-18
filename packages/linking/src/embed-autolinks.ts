import applyEdits from "./helpers/apply-edits.ts";
import getAutolinkReplacements from "./helpers/get-autolink-replacements.ts";
import type { LinkTarget } from "./types.ts";

export default function embedAutolinks(text: string, targets: LinkTarget[]) {
	const replacements = getAutolinkReplacements(text, targets);
	text = applyEdits(text, replacements);

	return text;
}
