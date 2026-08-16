import type { Nodes, Root } from "mdast";
import { describe, expect, it } from "vitest";
import type { LocalLink } from "../src/local_links/types.ts";
import { parseDocument } from "../src/parse-document.ts";

describe("parse document", () => {
	describe("valid local link syntax", () => {
		it("parses a manual local link", () => {
			const tree = parseDocument("See [[label|target]].");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});

		it("parses an automatic local link", () => {
			const tree = parseDocument("See [[~label|target]].");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "automatic",
				value: "label",
				target: "target",
			});
		});

		it("parses a suppressed local link", () => {
			const tree = parseDocument("See [[!label|target]].");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "suppressed",
				value: "label",
				target: "target",
			});
		});

		it("parses a manual local link with an escaped ~", () => {
			const tree = parseDocument("See [[\\~label|target]].");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "~label",
				target: "target",
			});
		});

		it("parses a manual local link with an escaped !", () => {
			const tree = parseDocument("See [[\\!label|target]].");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "!label",
				target: "target",
			});
		});

		it("preserves text before and after a local link", () => {
			const tree = parseDocument("text before[[label|target]]text after");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const textBefore = paragraph.children[0];
			const textAfter = paragraph.children[2];

			expect(textBefore).toMatchObject({ value: "text before" });
			expect(textAfter).toMatchObject({ value: "text after" });
		});

		it("parses two adjacent local links", () => {
			const tree = parseDocument("[[link1|link1]][[link2|link2]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const link1 = paragraph.children[0];
			const link2 = paragraph.children[1];

			expect(link1).toMatchObject({
				type: "localLink",
				value: "link1",
				target: "link1",
			});
			expect(link2).toMatchObject({
				type: "localLink",
				value: "link2",
				target: "link2",
			});
		});

		it("parses two local links separated by prose", () => {
			const tree = parseDocument("[[link1|link1]]prose[[link2|link2]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(3);

			const link1 = paragraph.children[0];
			const link2 = paragraph.children[2];

			expect(link1).toMatchObject({
				type: "localLink",
				value: "link1",
				target: "link1",
			});
			expect(link2).toMatchObject({
				type: "localLink",
				value: "link2",
				target: "link2",
			});
		});
	});

	describe("local link label syntax", () => {
		it("allows spaces in the label", () => {
			const tree = parseDocument("[[  label with space  |target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "  label with space  ",
				target: "target",
			});
		});

		it("allows punctuation in the label", () => {
			const tree = parseDocument("[[punctuations :,.;'\"!()-_?|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "punctuations :,.;'\"!()-_?",
				target: "target",
			});
		});

		it("preserves capitalization in the label", () => {
			const tree = parseDocument("[[Label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "Label",
				target: "target",
			});
		});
	});

	describe("local link target syntax", () => {
		it("allows spaces in the target", () => {
			const tree = parseDocument("[[label|  target with space  ]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "  target with space  ",
			});
		});

		it("allows punctuation in the target", () => {
			const tree = parseDocument("[[label|punctuations :,.;'\"!()-_?]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "punctuations :,.;'\"!()-_?",
			});
		});

		it("preserves capitalization in the target", () => {
			const tree = parseDocument("[[label|Target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "Target",
			});
		});
	});

	describe("local link modifier edge cases", () => {
		it("treats ! outside the modifier position as ordinary label text", () => {
			const tree = parseDocument("[[foo!bar|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "foo!bar",
				target: "target",
			});
		});

		it("treats ~ outside the modifier position as ordinary label text", () => {
			const tree = parseDocument("[[foo~bar|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "foo~bar",
				target: "target",
			});
		});

		it("treats a second ! after the modifier as label text", () => {
			const tree = parseDocument("[[!!label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "suppressed",
				value: "!label",
				target: "target",
			});
		});

		it("treats a second ~ after the modifier as label text", () => {
			const tree = parseDocument("[[~~label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "automatic",
				value: "~label",
				target: "target",
			});
		});

		it("uses only the first modifier when ! is followed by ~", () => {
			const tree = parseDocument("[[!~label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "suppressed",
				value: "~label",
				target: "target",
			});
		});

		it("uses only the first modifier when ~ is followed by !", () => {
			const tree = parseDocument("[[~!label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "automatic",
				value: "!label",
				target: "target",
			});
		});
	});

	describe("local link escape syntax", () => {
		describe("label escapes", () => {
			it("unescapes an escaped backslash in the label", () => {
				const tree = parseDocument("[[foo\\\\bar|target]]"); // parses "[[foo\\bar|target]]"

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo\\bar", // expects "foo\bar"
					target: "target",
				});
			});

			it("allows an escaped separator in the label", () => {
				const tree = parseDocument("[[foo\\|bar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo|bar",
					target: "target",
				});
			});

			it("unescapes an escaped opening bracket in the label", () => {
				const tree = parseDocument("[[foo\\[bar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo[bar",
					target: "target",
				});
			});

			it("unescapes an escaped closing bracket in the label", () => {
				const tree = parseDocument("[[foo\\]bar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo]bar",
					target: "target",
				});
			});

			it("unescapes ! inside the label without changing the mode", () => {
				const tree = parseDocument("[[foo\\!bar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo!bar",
					target: "target",
				});
			});

			it("unescapes ~ inside the label without changing the mode", () => {
				const tree = parseDocument("[[foo\\~bar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo~bar",
					target: "target",
				});
			});

			it("preserves an unknown label escape literally", () => {
				const tree = parseDocument("[[foo\\qbar|target]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo\\qbar",
					target: "target",
				});
			});

			it("decodes adjacent escapes exactly once in the label", () => {
				const tree = parseDocument("[[foo\\\\!bar|target]]"); // parses "[[foo\\!bar|target]]"

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "foo\\!bar", // expects "[[foo\!bar|target]]"
					target: "target",
				});
			});
		});

		describe("target escapes", () => {
			it("unescapes an escaped backslash in the target", () => {
				const tree = parseDocument("[[label|foo\\\\bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo\\bar",
				});
			});

			it("allows an escaped separator in the target", () => {
				const tree = parseDocument("[[label|foo\\|bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo|bar",
				});
			});

			it("unescapes an escaped opening bracket in the target", () => {
				const tree = parseDocument("[[label|foo\\[bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo[bar",
				});
			});

			it("allows an escaped closing bracket in the target", () => {
				const tree = parseDocument("[[label|foo\\]bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo]bar",
				});
			});

			it("unescapes ! in the target", () => {
				const tree = parseDocument("[[label|foo\\!bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo!bar",
				});
			});

			it("unescapes ~ in the target", () => {
				const tree = parseDocument("[[label|foo\\~bar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo~bar",
				});
			});

			// [[label|foo\qbar]] -> target "foo\qbar".
			it("preserves an unknown target escape literally", () => {
				const tree = parseDocument("[[label|foo\\qbar]]");

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo\\qbar",
				});
			});

			it("decodes adjacent escapes exactly once in the target", () => {
				const tree = parseDocument("[[label|foo\\\\!bar]]"); // parses "[[label|foo\\!bar]]"

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const link = paragraph.children[0];

				expect(link).toMatchObject({
					type: "localLink",
					mode: "manual",
					value: "label",
					target: "foo\\!bar", // expects "foo\!bar"
				});
			});
		});

		describe("incomplete escapes", () => {
			it("does not parse a local link ending during a label escape", () => {
				const tree = parseDocument("[[label\\");
				expect(getLocalLinks(tree)).toHaveLength(0);

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const text = paragraph.children[0];

				expect(text).toMatchObject({
					value: "[[label\\",
				});
			});

			it("does not parse a local link ending during a target escape", () => {
				const tree = parseDocument("[[label|target\\");
				expect(getLocalLinks(tree)).toHaveLength(0);

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(1);

				const text = paragraph.children[0];

				expect(text).toMatchObject({
					value: "[[label|target\\",
				});
			});

			it("does not allow a label escape to cross a line ending", () => {
				const tree = parseDocument("[[label\\\n|target]]"); // parses "[[label\<newline>|target]]"
				expect(getLocalLinks(tree)).toHaveLength(0);

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(3);

				const startText = paragraph.children[0];
				const lineBreak = paragraph.children[1];
				const endText = paragraph.children[2];

				expect(startText).toMatchObject({
					value: "[[label",
				});
				expect(lineBreak?.type).toBe("break");
				expect(endText).toMatchObject({
					value: "|target]]",
				});
			});

			it("does not allow a target escape to cross a line ending", () => {
				const tree = parseDocument("[[label|target\\\n]]"); // parses "[[label|target\<newline>]]"
				expect(getLocalLinks(tree)).toHaveLength(0);

				const paragraph = getOnlyParagraph(tree);

				expect(paragraph.children).toHaveLength(3);

				const startText = paragraph.children[0];
				const lineBreak = paragraph.children[1];
				const endText = paragraph.children[2];

				expect(startText).toMatchObject({
					value: "[[label|target",
				});
				expect(lineBreak?.type).toBe("break");
				expect(endText).toMatchObject({
					value: "]]",
				});
			});
		});
	});

	describe("invalid local link syntax", () => {
		it('does not parse "[[" as a local link', () => {
			const tree = parseDocument("[[");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[",
			});
		});

		it('does not parse "[[label" as a local link', () => {
			const tree = parseDocument("[[label");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label",
			});
		});

		it('does not parse "[[label|" as a local link', () => {
			const tree = parseDocument("[[label|");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label|",
			});
		});

		it('does not parse "[[label|target" as a local link', () => {
			const tree = parseDocument("[[label|target");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label|target",
			});
		});

		it('does not parse "[[label|target]" as a local link', () => {
			const tree = parseDocument("[[label|target]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label|target]",
			});
		});

		it("does not parse a local link with an empty label", () => {
			const tree = parseDocument("[[|target]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[|target]]",
			});
		});

		it("does not parse a local link with an empty target", () => {
			const tree = parseDocument("[[label|]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label|]]",
			});
		});

		it("does not parse a local link with extra separators", () => {
			const tree = parseDocument("[[label|label|target]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[label|label|target]]",
			});
		});
	});

	describe("invalid modifier syntax", () => {
		it("does not parse an automatic local link with an empty label", () => {
			const tree = parseDocument("[[~|target]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[~|target]]",
			});
		});

		it("does not parse a suppressed local link with an empty label", () => {
			const tree = parseDocument("[[!|target]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[!|target]]",
			});
		});

		it("does not parse an automatic local link with an empty target", () => {
			const tree = parseDocument("[[~label|]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[~label|]]",
			});
		});

		it("does not parse a suppressed local link with an empty target", () => {
			const tree = parseDocument("[[!label|]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[!label|]]",
			});
		});

		it("does not parse an automatic local link with extra separators", () => {
			const tree = parseDocument("[[~label|target|extra]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[~label|target|extra]]",
			});
		});

		it("does not parse a suppressed local link with extra separators", () => {
			const tree = parseDocument("[[!label|target|extra]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[!label|target|extra]]",
			});
		});
	});

	describe("line boundary syntax", () => {
		it("does not parse a local link whose label crosses a line ending", () => {
			const tree = parseDocument("[[label\n|target]]");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const text = paragraph.children[0];

			expect(text).toMatchObject({
				type: "text",
				value: "[[label\n|target]]",
			});
		});

		it("does not parse a local link whose target crosses a line ending", () => {
			const tree = parseDocument("[[label|target\n]]");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const text = paragraph.children[0];

			expect(text).toMatchObject({
				type: "text",
				value: "[[label|target\n]]",
			});
		});

		it("does not parse an automatic local link across a line ending", () => {
			const tree = parseDocument("[[~label\n|target]]");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const text = paragraph.children[0];

			expect(text).toMatchObject({
				type: "text",
				value: "[[~label\n|target]]",
			});
		});

		it("does not parse a suppressed local link across a line ending", () => {
			const tree = parseDocument("[[!label|target\n]]");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const text = paragraph.children[0];

			expect(text).toMatchObject({
				type: "text",
				value: "[[!label|target\n]]",
			});
		});
	});

	describe("mixed Markdown parsing", () => {
		it("does not parse local link syntax inside inline code", () => {
			const tree = parseDocument("`[[label|target]]`");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const code = paragraph.children[0];

			expect(code?.type).not.toBe("localLink");
		});

		it("does not parse local link syntax inside block code", () => {
			const tree = parseDocument(`\`\`\`\n[[label|target]]\n\`\`\``);
			expect(getLocalLinks(tree)).toHaveLength(0);

			const node = tree.children[0];

			expect.assert.isDefined(node);
			expect(node.type).toBe("code");

			if (node.type !== "code") {
				throw new Error("Expected code block");
			}

			expect(node.value).toBe("[[label|target]]");
		});

		it("does not parse local links inside inline math", () => {
			const tree = parseDocument("$[[label|target]]$");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const math = paragraph.children[0];

			expect.assert.isDefined(math);
			expect(math.type).toBe("inlineMath");

			if (math.type !== "inlineMath") {
				throw new Error("Expected inline math");
			}

			expect(math.value).toBe("[[label|target]]");
		});

		it("does not parse local links inside block math", () => {
			const tree = parseDocument(`$$\n[[label|target]]\n$$`);
			expect(getLocalLinks(tree)).toHaveLength(0);

			const math = tree.children[0];

			expect.assert.isDefined(math);
			expect(math.type).toBe("math");

			if (math.type !== "math") {
				throw new Error("Expected math block");
			}

			expect(math.value).toBe("[[label|target]]");
		});

		it("parses normal Markdown links normally", () => {
			const tree = parseDocument(`[link](https://link.com)`);
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const link = paragraph.children[0];

			expect.assert.isDefined(link);
			expect(link.type).toBe("link");

			if (link.type !== "link") {
				throw new Error("Expected link");
			}

			expect(link.url).toBe("https://link.com");

			const linkLabel = link.children[0];

			expect.assert.isDefined(linkLabel);
			expect(linkLabel.type).toBe("text");

			if (linkLabel.type !== "text") {
				throw new Error("Expected text");
			}

			expect(linkLabel.value).toBe("link");
		});

		it("parses [bracketed text] normally", () => {
			const tree = parseDocument("[bracketed text]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[bracketed text]",
			});
		});

		it("parses [[double bracketed text]] normally", () => {
			const tree = parseDocument("[[double bracketed text]]");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				value: "[[double bracketed text]]",
			});
		});

		it("parses Markdown images normally", () => {
			const tree = parseDocument("![image](https://example.com/favicon.ico)");
			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);
			const image = paragraph.children[0];

			expect.assert.isDefined(image);
			expect(image.type).toBe("image");

			if (image.type !== "image") {
				throw new Error("Expected image");
			}

			expect(image.url).toBe("https://example.com/favicon.ico");
			expect(image.alt).toBe("image");
		});
	});

	describe("local links in Markdown phrasing contexts", () => {
		it("parses a local link inside a heading", () => {
			const tree = parseDocument("# See [[label|target]]");

			expect(getLocalLinks(tree)).toHaveLength(1);

			const heading = tree.children[0];

			expect.assert.isDefined(heading);
			expect(heading.type).toBe("heading");

			if (heading.type !== "heading") {
				throw new Error("Expected heading");
			}

			expect(heading.children).toHaveLength(2);

			const link = heading.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});

		it("parses a local link inside emphasis", () => {
			const tree = parseDocument("*See [[label|target]]*");

			expect(getLocalLinks(tree)).toHaveLength(1);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const emphasis = paragraph.children[0];

			expect.assert.isDefined(emphasis);
			expect(emphasis.type).toBe("emphasis");

			if (emphasis.type !== "emphasis") {
				throw new Error("Expected emphasis");
			}

			expect(emphasis.children).toHaveLength(2);

			const link = emphasis.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});

		it("parses a local link inside strong emphasis", () => {
			const tree = parseDocument("**See [[label|target]]**");

			expect(getLocalLinks(tree)).toHaveLength(1);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const strong = paragraph.children[0];

			expect.assert.isDefined(strong);
			expect(strong.type).toBe("strong");

			if (strong.type !== "strong") {
				throw new Error("Expected strong");
			}

			expect(strong.children).toHaveLength(2);

			const link = strong.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});

		it("parses a local link inside a block quote", () => {
			const tree = parseDocument("> See [[label|target]]");

			expect(getLocalLinks(tree)).toHaveLength(1);

			const blockquote = tree.children[0];

			expect.assert.isDefined(blockquote);
			expect(blockquote.type).toBe("blockquote");

			if (blockquote.type !== "blockquote") {
				throw new Error("Expected block quote");
			}

			expect(blockquote.children).toHaveLength(1);

			const paragraph = blockquote.children[0];

			expect.assert.isDefined(paragraph);
			expect(paragraph.type).toBe("paragraph");

			if (paragraph.type !== "paragraph") {
				throw new Error("Expected paragraph");
			}

			expect(paragraph.children).toHaveLength(2);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});

		it("parses a local link inside a list item", () => {
			const tree = parseDocument("- See [[label|target]]");

			expect(getLocalLinks(tree)).toHaveLength(1);

			const list = tree.children[0];

			expect.assert.isDefined(list);
			expect(list.type).toBe("list");

			if (list.type !== "list") {
				throw new Error("Expected list");
			}

			const item = list.children[0];

			expect.assert.isDefined(item);
			expect(item.type).toBe("listItem");

			if (item.type !== "listItem") {
				throw new Error("Expected list item");
			}

			const paragraph = item.children[0];

			expect.assert.isDefined(paragraph);
			expect(paragraph.type).toBe("paragraph");

			if (paragraph.type !== "paragraph") {
				throw new Error("Expected paragraph");
			}

			expect(paragraph.children).toHaveLength(2);

			const link = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				mode: "manual",
				value: "label",
				target: "target",
			});
		});
	});

	describe("local links in protected Markdown contexts", () => {
		it("does not parse an escaped local link opening", () => {
			const tree = parseDocument("\\[[label|target]]");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const text = paragraph.children[0];

			expect(text).toMatchObject({
				type: "text",
				value: "[[label|target]]",
			});
		});

		it("does not parse local link syntax inside a Markdown link label", () => {
			const tree = parseDocument("[See [[label|target]]](https://example.com)");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect.assert.isDefined(link);
			expect(link.type).toBe("link");

			if (link.type !== "link") {
				throw new Error("Expected Markdown link");
			}

			expect(link.url).toBe("https://example.com");
		});

		it("does not parse local link syntax inside a Markdown link destination", () => {
			const tree = parseDocument("[text](https://example.com/[[label|target]])");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const link = paragraph.children[0];

			expect.assert.isDefined(link);
			expect(link.type).toBe("link");

			if (link.type !== "link") {
				throw new Error("Expected Markdown link");
			}

			expect(link.url).toBe("https://example.com/[[label|target]]");
		});

		it("does not parse local link syntax inside Markdown image alt text", () => {
			const tree = parseDocument("![[label|target]](https://example.com/image.png)");

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(1);

			const image = paragraph.children[0];

			expect.assert.isDefined(image);
			expect(image.type).toBe("image");

			if (image.type !== "image") {
				throw new Error("Expected image");
			}

			expect(image.alt).toBe("[label|target]");
			expect(image.url).toBe("https://example.com/image.png");
		});

		it("does not parse local link syntax inside raw HTML attributes", () => {
			const tree = parseDocument('<span data-value="[[label|target]]"></span>');

			expect(getLocalLinks(tree)).toHaveLength(0);

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const openingTag = paragraph.children[0];
			const closingTag = paragraph.children[1];

			expect(openingTag).toMatchObject({
				type: "html",
				value: '<span data-value="[[label|target]]">',
			});

			expect(closingTag).toMatchObject({
				type: "html",
				value: "</span>",
			});
		});
	});

	describe("local link parser failure recovery", () => {
		it("parses malformed link -> valid link", () => {
			const tree = parseDocument("[[malformed|malformed][[label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const text = paragraph.children[0];
			const link = paragraph.children[1];

			expect(text).toMatchObject({
				value: "[[malformed|malformed]",
			});
			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "target",
			});
		});

		it("parses valid link -> malformed link", () => {
			const tree = parseDocument("[[label|target]][[malformed|malformed]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const link = paragraph.children[0];
			const text = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "target",
			});
			expect(text).toMatchObject({
				value: "[[malformed|malformed]",
			});
		});

		it("recovers from a malformed local link before a valid link on the next line", () => {
			const tree = parseDocument("[[bad|target\n[[label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const text = paragraph.children[0];
			const link = paragraph.children[1];

			expect(text).toMatchObject({
				value: "[[bad|target\n",
			});
			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "target",
			});
		});

		it("preserves a valid link before a malformed link with an incomplete escape", () => {
			const tree = parseDocument("[[label|target]][[bad\\");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const link = paragraph.children[0];
			const text = paragraph.children[1];

			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "target",
			});
			expect(text).toMatchObject({
				value: "[[bad\\",
			});
		});

		it("recovers from malformed escaped syntax before a valid local link", () => {
			const tree = parseDocument("[[bad\\q|broken][[label|target]]");

			const paragraph = getOnlyParagraph(tree);

			expect(paragraph.children).toHaveLength(2);

			const text = paragraph.children[0];
			const link = paragraph.children[1];

			expect(text).toMatchObject({
				value: "[[bad\\q|broken]",
			});
			expect(link).toMatchObject({
				type: "localLink",
				value: "label",
				target: "target",
			});
		});
	});
});

function getOnlyParagraph(tree: Root) {
	const paragraph = tree.children[0];

	expect.assert.isDefined(paragraph);
	expect(paragraph.type).toBe("paragraph");

	if (paragraph.type !== "paragraph") {
		throw new Error("Expected paragraph");
	}

	return paragraph;
}

function getLocalLinks(tree: Root) {
	const links: LocalLink[] = [];

	function visit(node: Nodes): void {
		if (node.type === "localLink") {
			links.push(node);
		}

		if ("children" in node) {
			for (const child of node.children) {
				visit(child);
			}
		}
	}

	visit(tree);

	return links;
}
