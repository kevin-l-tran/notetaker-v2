import applyEdits from "./helpers/apply-edits.ts";
import getAutolinkReplacements from "./helpers/get-autolink-replacements.ts";
import getLocalLinks from "./helpers/get-local-links.ts";
import getSearchableRegions from "./helpers/get-searchable-regions.ts";
import { AhoCorasickAutomaton } from "./matchers/aho-corasick-automaton.ts";
import resolveMatches from "./matchers/resolve-matches.ts";
import tokenize from "./matchers/tokenize.ts";
import type { AhoCorasickMatch, AhoCorasickPattern, LinkTarget } from "./types.ts";

export default function embedAutolinks(text: string, targets: LinkTarget[]) {
	const replacements = getAutolinkReplacements(text);
	text = applyEdits(text, replacements);

	// get searchable regions
	const searchableRegions = getSearchableRegions(text);

	// tokenize text
	const tokenizedText = searchableRegions.map((region) => tokenize(text, region));

	// tokenize targets
	const patterns: AhoCorasickPattern[] = [];
	for (const target of targets) {
		for (const phrase of target.phrases) {
			const targetId = target.targetId;
			const tokens = tokenize(phrase).map((token) => token.normalized);

			if (!tokens.length) {
				throw new Error(`Expected phrase "${phrase}" to have at least 1 token`);
			}

			patterns.push({ targetId, phrase, tokens });
		}
	}

	// validate tokenized phrase uniqueness (different targetId same tokens)
	const ambiguousPatterns = new Set<AhoCorasickPattern>();
	for (const [i, pI] of patterns.entries()) {
		for (const pJ of patterns.slice(i + 1)) {
			const sharesKeywords =
				pI.tokens.length === pJ.tokens.length &&
				pI.tokens.every((value, index) => value === pJ.tokens[index]);

			if (pI.targetId !== pJ.targetId && sharesKeywords) {
				ambiguousPatterns.add(pI);
				ambiguousPatterns.add(pJ);
			}
		}
	}

	if (ambiguousPatterns.size) {
		throw new Error(`Ambiguous elements detected: ${String(ambiguousPatterns)}`);
	}

	// build ac-automaton with constructed patterns
	const ac = new AhoCorasickAutomaton(patterns);

	// search over tokenized text with ac-automaton
	const rawMatches: AhoCorasickMatch[] = [];
	for (const region of tokenizedText) {
		rawMatches.push(...ac.search(region));
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
