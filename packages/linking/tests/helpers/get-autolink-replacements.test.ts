import { describe, expect, it } from "vitest";
import getAutolinkReplacements from "../../src/helpers/get-autolink-replacements.ts";

describe("getAutolinkReplacements", () => {
	it("returns no edits when the document contains no local links", () => {
		const text = "no local links";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([]);
	});

	it("returns a replacement edit for a matching automatic local link", () => {
		const text = "[[~t1-label1|t1]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([{ start: 0, end: 17, replacement: "t1-label1" }]);
	});

	it("ignores manual local links", () => {
		const text = "[[t1-label1|t1]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([]);
	});

	it("ignores suppressed local links", () => {
		const text = "[[!t1-label1|t1]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([]);
	});

	it("only returns edits for automatic links when link modes are mixed", () => {
		const text = "[[~t1-label1|t1]][[t1-label1|t1]][[!t1-label1|t1]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([{ start: 0, end: 17, replacement: "t1-label1" }]);
	});

	it("returns edits for multiple matching automatic links", () => {
		const text = "[[~t1-label1|t1]][[~t2-label1|t2]][[~t3-label1|t3]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([
			{ start: 0, end: 17, replacement: "t1-label1" },
			{ start: 17, end: 34, replacement: "t2-label1" },
			{ start: 34, end: 51, replacement: "t3-label1" },
		]);
	});

	it("finds matching automatic links in separate sibling branches", () => {
		const text = "[[~t1-label1|t1]]\n\n[[~t2-label1|t2]]\n\n[[~t3-label1|t3]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([
			{ start: 0, end: 17, replacement: "t1-label1" },
			{ start: 19, end: 36, replacement: "t2-label1" },
			{ start: 38, end: 55, replacement: "t3-label1" },
		]);
	});

	it("finds matching automatic links nested inside Markdown containers", () => {
		const text = "**[[~t1-label1|t1]]**\n\n>[[~t2-label1|t2]]\n\n1. [[~t3-label1|t3]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([
			{ start: 2, end: 19, replacement: "t1-label1" },
			{ start: 24, end: 41, replacement: "t2-label1" },
			{ start: 46, end: 63, replacement: "t3-label1" },
		]);
	});

	it("uses the parsed local link value as the replacement text", () => {
		const text = "[[~should not show backslash: \\!|t1]]";
		const replacements = getAutolinkReplacements(text);

		expect(replacements).toStrictEqual([
			{ start: 0, end: 37, replacement: "should not show backslash: !" },
		]);
	});
});
