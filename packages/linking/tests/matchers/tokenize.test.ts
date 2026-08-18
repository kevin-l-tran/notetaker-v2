import { describe, expect, it } from "vitest";
import tokenize from "../../src/matchers/tokenize.ts";

describe("tokenize", () => {
	it("tokenizes ordinary words and preserves source offsets", () => {
		const source = "Every compact space is useful.";

		expect(tokenize(source, { start: 0, end: source.length })).toEqual([
			{
				value: "Every",
				normalized: "every",
				start: 0,
				end: 5,
			},
			{
				value: "compact",
				normalized: "compact",
				start: 6,
				end: 13,
			},
			{
				value: "space",
				normalized: "space",
				start: 14,
				end: 19,
			},
			{
				value: "is",
				normalized: "is",
				start: 20,
				end: 22,
			},
			{
				value: "useful",
				normalized: "useful",
				start: 23,
				end: 29,
			},
		]);
	});

	it("tokenizes entire text when no region is supplied", () => {
		const source = "Every compact space is useful.";

		expect(tokenize(source)).toEqual([
			{
				value: "Every",
				normalized: "every",
				start: 0,
				end: 5,
			},
			{
				value: "compact",
				normalized: "compact",
				start: 6,
				end: 13,
			},
			{
				value: "space",
				normalized: "space",
				start: 14,
				end: 19,
			},
			{
				value: "is",
				normalized: "is",
				start: 20,
				end: 22,
			},
			{
				value: "useful",
				normalized: "useful",
				start: 23,
				end: 29,
			},
		]);
	});

	it("only tokenizes text within the supplied region", () => {
		const source = "Ignore this compact space and this";
		const start = source.indexOf("compact");
		const end = start + "compact space".length;

		expect(tokenize(source, { start, end })).toEqual([
			{
				value: "compact",
				normalized: "compact",
				start,
				end: start + 7,
			},
			{
				value: "space",
				normalized: "space",
				start: start + 8,
				end,
			},
		]);
	});

	it("normalizes capitalization without changing the original token value", () => {
		const source = "COMPACT Space";

		const tokens = tokenize(source, {
			start: 0,
			end: source.length,
		});

		expect(tokens.map((token) => token.value)).toEqual(["COMPACT", "Space"]);

		expect(tokens.map((token) => token.normalized)).toEqual(["compact", "space"]);
	});

	it("separates words around punctuation", () => {
		const source = "compact, space.";

		const tokens = tokenize(source, {
			start: 0,
			end: source.length,
		});

		expect(tokens.map((token) => token.normalized)).toEqual(["compact", "space"]);
	});

	it("supports Unicode words", () => {
		const source = "étale espaço";

		const tokens = tokenize(source, {
			start: 0,
			end: source.length,
		});

		expect(tokens.map((token) => token.normalized)).toEqual(["étale", "espaço"]);
	});

	it("returns no tokens for a region containing no words", () => {
		const source = "  ---  ";

		expect(tokenize(source, { start: 0, end: source.length })).toEqual([]);
	});
});
