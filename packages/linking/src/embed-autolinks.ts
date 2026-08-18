import applyEdits from "./helpers/apply-edits.ts";
import getAutolinkReplacements from "./helpers/get-autolink-replacements.ts";
import type { LinkTarget } from "./types.ts";

export default function embedAutolinks(text: string, targets: LinkTarget[]) {
	const replacements = getAutolinkReplacements(text, targets);
	text = applyEdits(text, replacements);

	// tokenize text

	// tokenize targets

	// validate tokenized phrase uniqueness

	// build ac-automaton with constructed patterns

	// search over tokenized text with ac-automaton

	// resolve overlaps

	// apply link replacements to text based on search results

	return text;
}
