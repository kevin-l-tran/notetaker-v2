import { describe, expect, it } from "vitest";
import getSearchableRegions from "../../src/helpers/get-searchable-regions.ts";

describe("findSearchableText", () => {
	it("returns the full range of ordinary paragraph text", () => {
		const text = "A compact space is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([{ start: 0, end: 26 }]);
	});

	it("returns the text range inside a heading", () => {
		const text = "# Compact space";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([{ start: 2, end: 15 }]);
	});

	it("returns text ranges inside and around strong emphasis", () => {
		const text = "A **compact space** is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 2 },
			{ start: 4, end: 17 },
			{ start: 19, end: 30 },
		]);
	});

	it("returns text ranges inside and around emphasis", () => {
		const text = "A *compact space* is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 2 },
			{ start: 3, end: 16 },
			{ start: 17, end: 28 },
		]);
	});

	it("returns searchable text from separate list items", () => {
		const text = "- Compact space\n- Open cover";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 2, end: 15 },
			{ start: 18, end: 28 },
		]);
	});

	it("returns searchable text inside a blockquote", () => {
		const text = "> Compact space";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([{ start: 2, end: 15 }]);
	});

	it("does not return text inside a Markdown link", () => {
		const text = "A [compact space](https://example.com) is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 2 },
			{ start: 38, end: 49 },
		]);
	});

	it("does not return text inside inline code", () => {
		const text = "A `compact space` is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 2 },
			{ start: 17, end: 28 },
		]);
	});

	it("does not return text inside a code block", () => {
		const text = "Before.\n\n```\ncompact space\n```\n\nAfter.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 7 },
			{ start: 32, end: 38 },
		]);
	});

	it("does not return text inside inline math", () => {
		const text = "A $compact space$ is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 2 },
			{ start: 17, end: 28 },
		]);
	});

	it("does not return text inside block math", () => {
		const text = "Before.\n\n$$\ncompact space\n$$\n\nAfter.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 7 },
			{ start: 30, end: 36 },
		]);
	});

	it("does not return text inside a local link", () => {
		const text = "[[~compact space|target-id]] is useful.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([{ start: 28, end: 39 }]);
	});

	it("does not return image alt text as searchable text", () => {
		const text = "Before ![compact space](image.png) after.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 7 },
			{ start: 34, end: 41 },
		]);
	});

	it("returns ranges from multiple separate paragraphs", () => {
		const text = "Before.\n\nAfter.";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([
			{ start: 0, end: 7 },
			{ start: 9, end: 15 },
		]);
	});

	it("returns an empty array when the document contains no searchable text", () => {
		const text = "`compact space`";
		const regions = getSearchableRegions(text);

		expect(regions).toStrictEqual([]);
	});
});
