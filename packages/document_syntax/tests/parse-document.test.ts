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
		// [[foo!bar|target]] -> manual link with label "foo!bar".
		it.todo("treats ! outside the modifier position as ordinary label text");

		// [[foo~bar|target]] -> manual link with label "foo~bar".
		it.todo("treats ~ outside the modifier position as ordinary label text");

		// [[!!label|target]] -> suppressed link with label "!label".
		it.todo("treats a second ! after the modifier as label text");

		// [[~~label|target]] -> automatic link with label "~label".
		it.todo("treats a second ~ after the modifier as label text");

		// [[!~label|target]] -> suppressed link with label "~label".
		it.todo("uses only the first modifier when ! is followed by ~");

		// [[~!label|target]] -> automatic link with label "!label".
		it.todo("uses only the first modifier when ~ is followed by !");
	});

	describe("local link escape syntax", () => {
		describe("label escapes", () => {
			// [[foo\\bar|target]] -> label "foo\bar".
			it.todo("unescapes an escaped backslash in the label");

			// [[foo\|bar|target]] -> label "foo|bar".
			it.todo("allows an escaped separator in the label");

			// [[foo\[bar|target]] -> label "foo[bar".
			it.todo("unescapes an escaped opening bracket in the label");

			// [[foo\]bar|target]] -> label "foo]bar".
			it.todo("unescapes an escaped closing bracket in the label");

			// [[foo\!bar|target]] -> manual link with label "foo!bar".
			it.todo("unescapes ! inside the label without changing the mode");

			// [[foo\~bar|target]] -> manual link with label "foo~bar".
			it.todo("unescapes ~ inside the label without changing the mode");

			// [[foo\qbar|target]] -> label "foo\qbar".
			it.todo("preserves an unknown label escape literally");

			// [[foo\\|target]] -> label "foo\" and target "target".
			it.todo("decodes adjacent escapes exactly once in the label");
		});

		describe("target escapes", () => {
			// [[label|foo\\bar]] -> target "foo\bar".
			it.todo("unescapes an escaped backslash in the target");

			// [[label|foo\|bar]] -> target "foo|bar".
			it.todo("allows an escaped separator in the target");

			// [[label|foo\[bar]] -> target "foo[bar".
			it.todo("unescapes an escaped opening bracket in the target");

			// [[label|foo\]bar]] -> target "foo]bar" without closing the link early.
			it.todo("allows an escaped closing bracket in the target");

			// [[label|foo\!bar]] -> target "foo!bar".
			it.todo("unescapes ! in the target");

			// [[label|foo\~bar]] -> target "foo~bar".
			it.todo("unescapes ~ in the target");

			// [[label|foo\qbar]] -> target "foo\qbar".
			it.todo("preserves an unknown target escape literally");

			// [[label|foo\\]] -> target "foo\".
			it.todo("decodes adjacent escapes exactly once in the target");
		});

		describe("incomplete escapes", () => {
			// [[label\ -> incomplete label escape; parse as literal text.
			it.todo("does not parse a local link ending during a label escape");

			// [[label|target\ -> incomplete target escape; parse as literal text.
			it.todo("does not parse a local link ending during a target escape");

			// [[label\
			// |target]] -> escape cannot continue across a line ending.
			it.todo("does not allow a label escape to cross a line ending");

			// [[label|target\
			// ]] -> escape cannot continue across a line ending.
			it.todo("does not allow a target escape to cross a line ending");
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
		// [[~|target]] -> automatic modifier followed by an empty label.
		it.todo("does not parse an automatic local link with an empty label");

		// [[!|target]] -> suppressed modifier followed by an empty label.
		it.todo("does not parse a suppressed local link with an empty label");

		// [[~label|]] -> automatic local link with an empty target.
		it.todo("does not parse an automatic local link with an empty target");

		// [[!label|]] -> suppressed local link with an empty target.
		it.todo("does not parse a suppressed local link with an empty target");

		// [[~label|target|extra]] -> automatic local link with an extra separator.
		it.todo("does not parse an automatic local link with extra separators");

		// [[!label|target|extra]] -> suppressed local link with an extra separator.
		it.todo("does not parse a suppressed local link with extra separators");
	});

	describe("line boundary syntax", () => {
		// [[label
		// |target]] -> local links are single-line constructs.
		it.todo("does not parse a local link whose label crosses a line ending");

		// [[label|target
		// ]] -> local links are single-line constructs.
		it.todo("does not parse a local link whose target crosses a line ending");

		// [[~label
		// |target]] -> modifiers do not change the single-line rule.
		it.todo("does not parse an automatic local link across a line ending");

		// [[!label|target
		// ]] -> modifiers do not change the single-line rule.
		it.todo("does not parse a suppressed local link across a line ending");
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
		// # See [[label|target]]
		it.todo("parses a local link inside a heading");

		// *See [[label|target]]*
		it.todo("parses a local link inside emphasis");

		// **See [[label|target]]**
		it.todo("parses a local link inside strong emphasis");

		// > See [[label|target]]
		it.todo("parses a local link inside a block quote");

		// - See [[label|target]]
		it.todo("parses a local link inside a list item");
	});

	describe("local links in protected Markdown contexts", () => {
		// \[[label|target]] -> escaped opening delimiter remains literal text.
		it.todo("does not parse an escaped local link opening");

		// [See [[label|target]]](https://example.com) -> do not create a nested local link.
		it.todo("does not parse local link syntax inside a Markdown link label");

		// [text](https://example.com/[[label|target]]) -> destination remains Markdown link syntax.
		it.todo("does not parse local link syntax inside a Markdown link destination");

		// ![[label|target]](https://example.com/image.png) -> image syntax owns its alt text.
		it.todo("does not parse local link syntax inside Markdown image alt text");

		// <span data-value="[[label|target]]"></span> -> HTML attributes remain HTML.
		it.todo("does not parse local link syntax inside raw HTML attributes");
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

		// [[bad|target
		// [[label|target]] -> malformed first line must not consume the valid link on the next line.
		it.todo("recovers from a malformed local link before a valid link on the next line");

		// [[label|target]][[bad\ -> valid first link remains valid when the following escape is incomplete.
		it.todo("preserves a valid link before a malformed link with an incomplete escape");

		// [[bad\q|broken][[label|target]] -> failed escape-containing construct must not hide the next valid opener.
		it.todo("recovers from malformed escaped syntax before a valid local link");

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
