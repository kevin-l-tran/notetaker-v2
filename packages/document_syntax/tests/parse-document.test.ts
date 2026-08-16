import type { Nodes, Root } from "mdast";
import { describe, expect, it } from "vitest";
import type { LocalLink } from "../src/local_links/types.ts";
import { parseDocument } from "../src/parse-document.ts";

describe("parse document", () => {
    describe("valid local link syntax", () => {
        it("parses a basic local link", () => {
            const tree = parseDocument("See [[label|target]].");

            const paragraph = getOnlyParagraph(tree);

            expect(paragraph.children).toHaveLength(3);

            const link = paragraph.children[1];

            expect(link).toMatchObject({
                type: "localLink",
                value: "label",
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
            const tree = parseDocument(
                "![image](https://example.com/favicon.ico)",
            );
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

    describe("local link parser failure recovery", () => {
        it("parses malformed link -> valid link", () => {
            const tree = parseDocument(
                "[[malformed|malformed][[label|target]]",
            );

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
            const tree = parseDocument(
                "[[label|target]][[malformed|malformed]",
            );

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
