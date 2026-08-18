import { describe, expect, it } from "vitest";
import {
	AhoCorasickAutomaton,
	type AhoCorasickPattern,
} from "../../src/matchers/aho-corasick-automaton.ts";
import type { TextToken } from "../../src/types.ts";

function token(value: string, start: number, end: number, normalized = value): TextToken {
	return {
		value,
		normalized,
		start,
		end,
	};
}

describe("AhoCorasickAutomaton", () => {
	it("returns no matches for an empty token stream", () => {
		const automaton = new AhoCorasickAutomaton([
			{
				targetId: "compact-space",
				phrase: "compact space",
				tokens: ["compact", "space"],
			},
		]);

		expect(automaton.search([])).toEqual([]);
	});

	it("returns no matches when the automaton has no patterns", () => {
		const automaton = new AhoCorasickAutomaton([]);

		const tokens = [token("compact", 0, 7), token("space", 8, 13)];

		expect(automaton.search(tokens)).toEqual([]);
	});

	it("matches a single-token pattern", () => {
		const pattern = {
			targetId: "space",
			phrase: "space",
			tokens: ["space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		const tokens = [token("a", 0, 1), token("space", 2, 7)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 2,
				end: 7,
			},
		]);
	});

	it("matches a multi-token pattern and returns the full source range", () => {
		const pattern = {
			targetId: "compact-space",
			phrase: "compact space",
			tokens: ["compact", "space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		// "Every compact space."
		const tokens = [token("Every", 0, 5, "every"), token("compact", 6, 13), token("space", 14, 19)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 6,
				end: 19,
			},
		]);
	});

	it("does not match an incomplete pattern", () => {
		const automaton = new AhoCorasickAutomaton([
			{
				targetId: "compact-space",
				phrase: "compact space",
				tokens: ["compact", "space"],
			},
		]);

		const tokens = [token("compact", 0, 7)];

		expect(automaton.search(tokens)).toEqual([]);
	});

	it("finds multiple occurrences of the same pattern", () => {
		const pattern = {
			targetId: "space",
			phrase: "space",
			tokens: ["space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		// "space is a space"
		const tokens = [
			token("space", 0, 5),
			token("is", 6, 8),
			token("a", 9, 10),
			token("space", 11, 16),
		];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 0,
				end: 5,
			},
			{
				pattern,
				start: 11,
				end: 16,
			},
		]);
	});

	it("finds patterns that share a prefix", () => {
		const compactPattern = {
			targetId: "compact",
			phrase: "compact",
			tokens: ["compact"],
		} as AhoCorasickPattern;

		const compactSpacePattern = {
			targetId: "compact-space",
			phrase: "compact space",
			tokens: ["compact", "space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([compactPattern, compactSpacePattern]);

		const tokens = [token("compact", 0, 7), token("space", 8, 13)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern: compactPattern,
				start: 0,
				end: 7,
			},
			{
				pattern: compactSpacePattern,
				start: 0,
				end: 13,
			},
		]);
	});

	it("reports suffix patterns that end at the same token", () => {
		const compactSpacePattern = {
			targetId: "compact-space",
			phrase: "compact space",
			tokens: ["compact", "space"],
		} as AhoCorasickPattern;

		const spacePattern = {
			targetId: "space",
			phrase: "space",
			tokens: ["space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([compactSpacePattern, spacePattern]);

		const tokens = [token("compact", 0, 7), token("space", 8, 13)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern: compactSpacePattern,
				start: 0,
				end: 13,
			},
			{
				pattern: spacePattern,
				start: 8,
				end: 13,
			},
		]);
	});

	it("follows suffix transitions to find a different overlapping pattern", () => {
		const abPattern = {
			targetId: "ab",
			phrase: "a b",
			tokens: ["a", "b"],
		} as AhoCorasickPattern;

		const bcPattern = {
			targetId: "bc",
			phrase: "b c",
			tokens: ["b", "c"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([abPattern, bcPattern]);

		const tokens = [token("a", 0, 1), token("b", 2, 3), token("c", 4, 5)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern: abPattern,
				start: 0,
				end: 3,
			},
			{
				pattern: bcPattern,
				start: 2,
				end: 5,
			},
		]);
	});

	it("follows multiple suffix links before finding a transition", () => {
		const abcPattern = {
			targetId: "abc",
			phrase: "a b c",
			tokens: ["a", "b", "c"],
		} as AhoCorasickPattern;

		const bcPattern = {
			targetId: "bc",
			phrase: "b c",
			tokens: ["b", "c"],
		} as AhoCorasickPattern;

		const cdPattern = {
			targetId: "cd",
			phrase: "c d",
			tokens: ["c", "d"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([abcPattern, bcPattern, cdPattern]);

		const tokens = [token("a", 0, 1), token("b", 2, 3), token("c", 4, 5), token("d", 6, 7)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern: abcPattern,
				start: 0,
				end: 5,
			},
			{
				pattern: bcPattern,
				start: 2,
				end: 5,
			},
			{
				pattern: cdPattern,
				start: 4,
				end: 7,
			},
		]);
	});

	it("finds overlapping occurrences of the same multi-token pattern", () => {
		const pattern = {
			targetId: "aa",
			phrase: "a a",
			tokens: ["a", "a"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		const tokens = [token("a", 0, 1), token("a", 2, 3), token("a", 4, 5)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 0,
				end: 3,
			},
			{
				pattern,
				start: 2,
				end: 5,
			},
		]);
	});

	it("resets through the root after unrelated tokens and continues matching", () => {
		const pattern = {
			targetId: "compact-space",
			phrase: "compact space",
			tokens: ["compact", "space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		const tokens = [
			token("compact", 0, 7),
			token("unrelated", 8, 17),
			token("compact", 18, 25),
			token("space", 26, 31),
		];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 18,
				end: 31,
			},
		]);
	});

	it("uses normalized token values for matching", () => {
		const pattern = {
			targetId: "compact-space",
			phrase: "compact space",
			tokens: ["compact", "space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([pattern]);

		const tokens = [token("Compact", 0, 7, "compact"), token("SPACE", 8, 13, "space")];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern,
				start: 0,
				end: 13,
			},
		]);
	});

	it("returns all patterns when the same phrase belongs to different targets", () => {
		const firstPattern = {
			targetId: "target-a",
			phrase: "space",
			tokens: ["space"],
		} as AhoCorasickPattern;

		const secondPattern = {
			targetId: "target-b",
			phrase: "space",
			tokens: ["space"],
		} as AhoCorasickPattern;

		const automaton = new AhoCorasickAutomaton([firstPattern, secondPattern]);

		const tokens = [token("space", 10, 15)];

		expect(automaton.search(tokens)).toEqual([
			{
				pattern: firstPattern,
				start: 10,
				end: 15,
			},
			{
				pattern: secondPattern,
				start: 10,
				end: 15,
			},
		]);
	});
});
