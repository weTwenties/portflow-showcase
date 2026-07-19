import { describe, expect, it } from "vitest";

import {
  createEmptyRichTextDocument,
  isEmptyRichText,
  MAX_RICH_TEXT_PLAIN_LENGTH,
  plainTextToRichText,
  richTextDocumentSchema,
  richTextToPlainText,
} from "./rich-text-document";

describe("richTextDocumentSchema", () => {
  it("accepts a document with allowed marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            {
              type: "text",
              text: "styled",
              marks: [{ type: "italic" }, { type: "underline" }],
            },
            { type: "hardBreak" },
            { type: "text", text: "next line" },
          ],
        },
      ],
    };

    expect(richTextDocumentSchema.parse(doc)).toEqual(doc);
  });

  it("accepts headings and nested lists", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "first" }],
                },
                {
                  type: "orderedList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "nested" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(richTextDocumentSchema.safeParse(doc).success).toBe(true);
    expect(richTextToPlainText(doc as never)).toContain("Section");
    expect(richTextToPlainText(doc as never)).toContain("nested");
  });

  it("accepts pixel font sizes in range and families from the allowlist only", () => {
    const good = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "sized",
              marks: [
                {
                  type: "textStyle",
                  attrs: { fontSize: "15px", fontFamily: "var(--font-manrope)" },
                },
              ],
            },
          ],
        },
      ],
    };
    const tooBig = structuredClone(good);
    tooBig.content[0]!.content[0]!.marks[0]!.attrs.fontSize = "97px";
    const tooSmall = structuredClone(good);
    tooSmall.content[0]!.content[0]!.marks[0]!.attrs.fontSize = "7px";
    const notPixels = structuredClone(good);
    notPixels.content[0]!.content[0]!.marks[0]!.attrs.fontSize = "1.5rem";
    const arbitraryFamily = structuredClone(good);
    arbitraryFamily.content[0]!.content[0]!.marks[0]!.attrs.fontFamily =
      "Comic Sans MS";

    expect(richTextDocumentSchema.safeParse(good).success).toBe(true);
    expect(richTextDocumentSchema.safeParse(tooBig).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(tooSmall).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(notPixels).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(arbitraryFamily).success).toBe(false);
  });

  it("accepts left/center/right alignment and rejects anything else", () => {
    const centered = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [{ type: "text", text: "centered" }],
        },
        {
          type: "heading",
          attrs: { level: 2, textAlign: "right" },
          content: [{ type: "text", text: "right heading" }],
        },
      ],
    };
    const justified = structuredClone(centered);
    (justified.content[0]!.attrs as { textAlign: string }).textAlign =
      "justify";
    const injection = structuredClone(centered);
    (injection.content[0]!.attrs as { textAlign: string }).textAlign =
      "left; position: fixed";

    expect(richTextDocumentSchema.safeParse(centered).success).toBe(true);
    expect(richTextDocumentSchema.safeParse(justified).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(injection).success).toBe(false);
  });

  it("rejects unsupported node types (no arbitrary HTML path)", () => {
    const withHeadingLevel4 = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "nope" }],
        },
      ],
    };
    const withCodeBlock = {
      type: "doc",
      content: [{ type: "codeBlock", content: [{ type: "text", text: "x" }] }],
    };
    const withScriptish = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "html", html: "<script>alert(1)</script>" }],
        },
      ],
    };

    expect(richTextDocumentSchema.safeParse(withHeadingLevel4).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(withCodeBlock).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(withScriptish).success).toBe(false);
  });

  it("rejects unsupported marks like link", () => {
    const withLink = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "https://evil" } }],
            },
          ],
        },
      ],
    };

    expect(richTextDocumentSchema.safeParse(withLink).success).toBe(false);
  });

  it("strips unknown attrs during parse (normalization)", () => {
    const withAttrs = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", onclick: "alert(1)", class: "evil" },
          content: [{ type: "text", text: "hi" }],
        },
      ],
    };

    const parsed = richTextDocumentSchema.parse(withAttrs);
    const first = parsed.content[0];
    if (first?.type !== "paragraph") {
      throw new Error("expected a paragraph");
    }
    expect(first.attrs).toEqual({ textAlign: "center" });
  });

  it("enforces the plain-text length budget", () => {
    const doc = plainTextToRichText("x".repeat(MAX_RICH_TEXT_PLAIN_LENGTH + 1));
    expect(richTextDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

describe("plain text conversion", () => {
  it("round-trips newlines through paragraphs", () => {
    const text = "line one\n\nline three";

    const doc = plainTextToRichText(text);

    expect(doc.content).toHaveLength(3);
    expect(richTextToPlainText(doc)).toBe(text);
  });

  it("treats hard breaks as newlines in plain text", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [
            { type: "text" as const, text: "a" },
            { type: "hardBreak" as const },
            { type: "text" as const, text: "b" },
          ],
        },
      ],
    };

    expect(richTextToPlainText(doc)).toBe("a\nb");
  });

  it("detects empty documents", () => {
    expect(isEmptyRichText(createEmptyRichTextDocument())).toBe(true);
    expect(isEmptyRichText(plainTextToRichText("hi"))).toBe(false);
  });
});
