import type { AhoCorasickMatch } from "../types.ts";

export default function resolveMatches(matches: AhoCorasickMatch[], reservedTargetIds: string[]) {
	const resolvedMatches: AhoCorasickMatch[] = [];

	matches = matches.filter((m) => !reservedTargetIds.includes(m.pattern.targetId));

	matches.sort((a, b) => a.start - b.start);

	const subsumed: AhoCorasickMatch[] = [];
	for (const match of matches) {
		subsumed.push(
			...matches.filter((m) => m !== match && m.start >= match.start && m.end <= match.end),
		);
	}
	matches = matches.filter((m) => !subsumed.includes(m));

	const overlapping: AhoCorasickMatch[] = [];
	let previous = matches[0];
	for (const match of matches.slice(1)) {
		if (!previous) break;

		if (match.start < previous.end) {
			overlapping.push(match);
		} else {
			previous = match;
		}
	}
	matches = matches.filter((m) => !overlapping.includes(m));

	const linkedIds = new Set<string>();
	for (const match of matches) {
		if (!linkedIds.has(match.pattern.targetId)) {
			linkedIds.add(match.pattern.targetId);
			resolvedMatches.push(match);
		}
	}

	return resolvedMatches;
}
