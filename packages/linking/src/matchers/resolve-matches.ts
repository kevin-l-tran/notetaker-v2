import type { AhoCorasickMatch } from "./aho-corasick-automaton.ts";

export default function resolveMatches(matches: AhoCorasickMatch[], reservedTargetIds: string[]) {
	const resolvedMatches: AhoCorasickMatch[] = [];

	// 1. remove matches that have reserved targets
	matches = matches.filter((m) => !reservedTargetIds.includes(m.pattern.targetId));

	// 2. remove matches contained entirely within other matches
	const subsumed: AhoCorasickMatch[] = [];
	for (const match of matches) {
		subsumed.push(...matches.filter((m) => m.start >= match.start && m.end <= match.end));
	}
	matches = matches.filter((m) => !subsumed.includes(m));

	// 3. sort remaining matches by start position in ascending order
	matches.sort((a, b) => a.start - b.start);

	// 4. accept the first match to a targetId
	const linkedIds = new Set<string>();
	for (const match of matches) {
		if (!linkedIds.has(match.pattern.targetId)) {
			linkedIds.add(match.pattern.targetId);
			resolvedMatches.push(match);
		}
	}

	return resolveMatches;
}
