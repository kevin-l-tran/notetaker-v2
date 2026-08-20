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

	const searchableRegions = getSearchableRegions(text);

	const rawMatches: AhoCorasickMatch[] = [];
	for (const region of searchableRegions) {
		const tokens = tokenize(text, region);
		rawMatches.push(...matcher.search(tokens));
	}

	const manualLinkTargets = getLocalLinks(text)
		.filter((link) => link.mode === "manual")
		.map((link) => link.target);

	const matches = resolveMatches(rawMatches, manualLinkTargets);

	const edits = matches.map((match) => ({
		start: match.start,
		end: match.end,
		replacement: `[[~${text.slice(match.start, match.end)}|${match.pattern.targetId}]]`,
	}));

	text = applyEdits(text, edits);

	return text;
}
