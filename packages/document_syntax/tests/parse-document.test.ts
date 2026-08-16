import { describe, expect, it } from "vitest";

import { parseDocument } from "../src/parse-document.ts";

describe("local links", () => {
    it("parses a basic local link", () => {
        const tree = parseDocument("See [[compact space|compact-space]].");

        const paragraph = tree.children[0];
        
        expect.assert.isDefined(paragraph);
        expect(paragraph.type).toBe("paragraph");

        if (paragraph.type !== "paragraph") {
            throw new Error("Expected paragraph");
        }

        expect(paragraph.children).toHaveLength(3);

        const link = paragraph.children[1];

        expect(link).toMatchObject({
            type: "localLink",
            value: "compact space",
            target: "compact-space",
        });
    });
});
