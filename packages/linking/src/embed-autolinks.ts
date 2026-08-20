import applyEdits from "./helpers/apply-edits.ts";
import getAutolinkReplacements from "./helpers/get-autolink-replacements.ts";
import getLocalLinks from "./helpers/get-local-links.ts";
import getSearchableRegions from "./helpers/get-searchable-regions.ts";
import type { AhoCorasickAutomaton } from "./matchers/aho-corasick-automaton.ts";
import resolveMatches from "./matchers/resolve-matches.ts";
import tokenize from "./matchers/tokenize.ts";
import type { AhoCorasickMatch } from "./types.ts";

export default function embedAutolinks(text: string, matcher: AhoCorasickAutomaton) {
	const replacements = getAutolinkReplacements(text);
	text = applyEdits(text, replacements);

	// get searchable regions
	const searchableRegions = getSearchableRegions(text);

	// search over tokenized text with ac-automaton
	const rawMatches: AhoCorasickMatch[] = [];
	for (const region of searchableRegions) {
		const tokens = tokenize(text, region);
		rawMatches.push(...matcher.search(tokens));
	}

	// resolve overlaps
	const manualLinkTargets = getLocalLinks(text)
		.filter((link) => link.mode === "manual")
		.map((link) => link.target);

	const matches = resolveMatches(rawMatches, manualLinkTargets);

	// apply link replacements to text based on search results
	const edits = matches.map((match) => ({
		start: match.start,
		end: match.end,
		replacement: `[[~${text.slice(match.start, match.end)}|${match.pattern.targetId}]]`,
	}));

	text = applyEdits(text, edits);

	return text;
}
