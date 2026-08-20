import { AhoCorasickAutomaton } from "./matchers/aho-corasick-automaton.ts";
import tokenize from "./matchers/tokenize.ts";
import type { AhoCorasickPattern, LinkTarget } from "./types.ts";

export default function compileAutolinkMatcher(targets: LinkTarget[]) {
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

	const ambiguousPatterns = new Set<AhoCorasickPattern>();
	const redundantPatterns = new Set<AhoCorasickPattern>();
	for (const [i, pI] of patterns.entries()) {
		for (const pJ of patterns.slice(i + 1)) {
			const sharesKeywords =
				pI.tokens.length === pJ.tokens.length &&
				pI.tokens.every((value, index) => value === pJ.tokens[index]);

			if (sharesKeywords) {
				if (pI.targetId !== pJ.targetId) {
					ambiguousPatterns.add(pI);
					ambiguousPatterns.add(pJ);
				} else {
					redundantPatterns.add(pI);
					redundantPatterns.add(pJ);
				}
			}
		}
	}

	if (ambiguousPatterns.size) {
		throw new Error("Detected ambiguous patterns (same tokens, different target)");
	} else if (redundantPatterns.size) {
		throw new Error("Detected ambiguous patterns (same tokens and target)");
	}

	return new AhoCorasickAutomaton(patterns);
}
