import type { AhoCorasickMatch } from "../types.ts";

export default function resolveMatches(matches: AhoCorasickMatch[], reservedTargetIds: string[]) {
	const resolvedMatches: AhoCorasickMatch[] = [];

	matches = matches.filter((m) => !reservedTargetIds.includes(m.pattern.targetId));

	const subsumed: AhoCorasickMatch[] = [];
	for (const match of matches) {
		subsumed.push(...matches.filter((m) => m.start >= match.start && m.end <= match.end));
	}
	matches = matches.filter((m) => !subsumed.includes(m));

	matches.sort((a, b) => a.start - b.start);

	const linkedIds = new Set<string>();
	for (const match of matches) {
		if (!linkedIds.has(match.pattern.targetId)) {
			linkedIds.add(match.pattern.targetId);
			resolvedMatches.push(match);
		}
	}

	return resolvedMatches;
}
