import { describe, expect, it } from "vitest";
import resolveMatches from "../../src/matchers/resolve-matches.ts";
import type { AhoCorasickMatch, AhoCorasickPattern } from "../../src/types.ts";

function pattern(targetId: string, phrase = targetId): AhoCorasickPattern {
	return {
		targetId,
		phrase,
		tokens: phrase.split(" "),
	};
}

function match(pattern: AhoCorasickPattern, start: number, end: number): AhoCorasickMatch {
	return {
		pattern,
		start,
		end,
	};
}

describe("resolveMatches", () => {
	it("returns no matches when given no matches", () => {
		expect(resolveMatches([], [])).toEqual([]);
	});

	it("preserves a single match", () => {
		const space = pattern("space");
		const spaceMatch = match(space, 0, 5);

		expect(resolveMatches([spaceMatch], [])).toEqual([spaceMatch]);
	});

	it("removes matches whose target is reserved", () => {
		const space = pattern("space");
		const compactSpace = pattern("compact-space", "compact space");

		const spaceMatch = match(space, 0, 5);
		const compactSpaceMatch = match(compactSpace, 10, 23);

		expect(resolveMatches([spaceMatch, compactSpaceMatch], ["space"])).toEqual([compactSpaceMatch]);
	});

	it("removes all matches whose target is reserved", () => {
		const space = pattern("space");

		expect(resolveMatches([match(space, 0, 5), match(space, 10, 15)], ["space"])).toEqual([]);
	});

	it("preserves adjacent non-overlapping matches", () => {
		const first = pattern("first");
		const second = pattern("second");

		const firstMatch = match(first, 0, 5);
		const secondMatch = match(second, 5, 10);

		expect(resolveMatches([firstMatch, secondMatch], [])).toEqual([firstMatch, secondMatch]);
	});

	it("preserves disjoint matches", () => {
		const first = pattern("first");
		const second = pattern("second");
		const third = pattern("third");

		const firstMatch = match(first, 0, 5);
		const secondMatch = match(second, 10, 15);
		const thirdMatch = match(third, 20, 25);

		expect(resolveMatches([thirdMatch, firstMatch, secondMatch], [])).toEqual([
			firstMatch,
			secondMatch,
			thirdMatch,
		]);
	});

	it("removes a match contained entirely within a longer match", () => {
		const compactSpace = pattern("compact-space", "compact space");
		const space = pattern("space");

		const compactSpaceMatch = match(compactSpace, 0, 13);
		const spaceMatch = match(space, 8, 13);

		expect(resolveMatches([spaceMatch, compactSpaceMatch], [])).toEqual([compactSpaceMatch]);
	});

	it("removes a contained match that shares the same start position", () => {
		const compact = pattern("compact");
		const compactSpace = pattern("compact-space", "compact space");

		const compactMatch = match(compact, 0, 7);
		const compactSpaceMatch = match(compactSpace, 0, 13);

		expect(resolveMatches([compactMatch, compactSpaceMatch], [])).toEqual([compactSpaceMatch]);
	});

	it("removes a contained match that shares the same end position", () => {
		const space = pattern("space");
		const compactSpace = pattern("compact-space", "compact space");

		const spaceMatch = match(space, 8, 13);
		const compactSpaceMatch = match(compactSpace, 0, 13);

		expect(resolveMatches([spaceMatch, compactSpaceMatch], [])).toEqual([compactSpaceMatch]);
	});

	it("keeps the earlier match when two matches partially overlap", () => {
		const first = pattern("a-b", "a b");
		const second = pattern("b-c", "b c");

		const firstMatch = match(first, 0, 3);
		const secondMatch = match(second, 2, 5);

		expect(resolveMatches([firstMatch, secondMatch], [])).toEqual([firstMatch]);
	});

	it("can accept a later match after rejecting an overlapping match", () => {
		const first = pattern("first");
		const overlapping = pattern("overlapping");
		const later = pattern("later");

		const firstMatch = match(first, 0, 5);
		const overlappingMatch = match(overlapping, 3, 7);
		const laterMatch = match(later, 6, 10);

		expect(resolveMatches([firstMatch, overlappingMatch, laterMatch], [])).toEqual([
			firstMatch,
			laterMatch,
		]);
	});

	it("keeps only the first occurrence of a target", () => {
		const space = pattern("space");

		const firstMatch = match(space, 0, 5);
		const secondMatch = match(space, 10, 15);

		expect(resolveMatches([secondMatch, firstMatch], [])).toEqual([firstMatch]);
	});

	it("can keep later matches to other targets after reserving the first occurrence of a target", () => {
		const space = pattern("space");
		const metric = pattern("metric");

		const firstSpaceMatch = match(space, 0, 5);
		const metricMatch = match(metric, 10, 16);
		const secondSpaceMatch = match(space, 20, 25);

		expect(resolveMatches([secondSpaceMatch, metricMatch, firstSpaceMatch], [])).toEqual([
			firstSpaceMatch,
			metricMatch,
		]);
	});

	it("removes reserved matches before resolving containment", () => {
		const outer = pattern("outer");
		const inner = pattern("inner");

		const outerMatch = match(outer, 0, 10);
		const innerMatch = match(inner, 2, 8);

		expect(resolveMatches([outerMatch, innerMatch], ["outer"])).toEqual([innerMatch]);
	});
});
