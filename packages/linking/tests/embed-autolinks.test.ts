import { describe, expect, it } from "vitest";
import compileAutolinkMatcher from "../src/compile-autolink-matcher.ts";
import embedAutolinks from "../src/embed-autolinks.ts";

describe("embedAutolinks", () => {
	it("embeds an automatic link for a matching phrase", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		expect(embedAutolinks("A compact space is useful.", matcher)).toBe(
			"A [[~compact space|compact-space]] is useful.",
		);
	});

	it("preserves the original text of the matched phrase", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		expect(embedAutolinks("Every Compact Space is useful.", matcher)).toBe(
			"Every [[~Compact Space|compact-space]] is useful.",
		);
	});

	it("is idempotent", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		const once = embedAutolinks("A compact space is useful.", matcher);
		const twice = embedAutolinks(once, matcher);

		expect(twice).toBe(once);
	});

	it("removes stale automatic links when they are no longer matched", () => {
		const matcher = compileAutolinkMatcher([]);

		expect(embedAutolinks("A [[~compact space|compact-space]] is useful.", matcher)).toBe(
			"A compact space is useful.",
		);
	});

	it("does not create another automatic link to a manually linked target", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		const text = "One [[compact space|compact-space]] and another compact space.";

		expect(embedAutolinks(text, matcher)).toBe(text);
	});

	it("does not match across separate searchable regions", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		const text = "compact $x$ space";

		expect(embedAutolinks(text, matcher)).toBe(text);
	});

	it("does not modify text inside an existing manual link", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		const text = "[[compact space|another-target]]";

		expect(embedAutolinks(text, matcher)).toBe(text);
	});
});
