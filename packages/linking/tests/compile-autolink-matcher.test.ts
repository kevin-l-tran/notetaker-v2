import { describe, expect, it } from "vitest";
import compileAutolinkMatcher from "../src/compile-autolink-matcher.ts";
import tokenize from "../src/matchers/tokenize.ts";

describe("compileAutolinkMatcher", () => {
	it("compiles valid targets into a working matcher", () => {
		const matcher = compileAutolinkMatcher([
			{
				targetId: "compact-space",
				phrases: ["compact space"],
			},
		]);

		const matches = matcher.search(tokenize("Every compact space is interesting."));

		expect(matches).toHaveLength(1);
		expect(matches[0]?.pattern.targetId).toBe("compact-space");
	});

	it("allows an empty target list", () => {
		const matcher = compileAutolinkMatcher([]);

		expect(matcher.search(tokenize("compact space"))).toEqual([]);
	});

	it("rejects phrases that contain no tokens", () => {
		expect(() =>
			compileAutolinkMatcher([
				{
					targetId: "invalid",
					phrases: ["---"],
				},
			]),
		).toThrow();
	});

	it("rejects normalized-equivalent phrases belonging to different targets", () => {
		expect(() =>
			compileAutolinkMatcher([
				{
					targetId: "target-a",
					phrases: ["Compact Space"],
				},
				{
					targetId: "target-b",
					phrases: ["compact space"],
				},
			]),
		).toThrow();
	});

	it("rejects normalized-equivalent phrases belonging to the same target", () => {
		expect(() =>
			compileAutolinkMatcher([
				{
					targetId: "compact-space",
					phrases: ["Compact Space", "compact space"],
				},
			]),
		).toThrow();
	});
});
