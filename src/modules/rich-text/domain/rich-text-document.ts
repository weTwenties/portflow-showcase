import { z } from "zod";

/**
 * Persisted shape of a rich text block: a strict subset of the
 * Tiptap/ProseMirror JSON document model. Only what the editor's extension
 * set can produce is accepted — anything else (links, code, arbitrary
 * attrs, HTML) fails validation instead of flowing to R2 (ADR-0002).
 *
 * Supported: paragraph, heading 1-3, bullet/ordered list, hard break, and
 * marks bold/italic/underline plus textStyle with font size/family from a
 * fixed allowlist (never arbitrary CSS values).
 */

export const RICH_TEXT_MARKS = ["bold", "italic", "underline"] as const;

/**
 * Per-selection font size: any whole pixel value within this range (typed
 * like Word), stored as "18px". Unset means the page's default body size.
 * A bounded numeric pattern — still no arbitrary CSS strings.
 */
export const MIN_FONT_SIZE_PX = 8;
export const MAX_FONT_SIZE_PX = 96;
export const FONT_SIZE_SUGGESTIONS_PX = [
  10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64,
] as const;

const fontSizeSchema = z
  .string()
  .regex(/^\d{1,3}px$/, { message: "Font size must look like 18px" })
  .refine(
    (value) => {
      const px = Number.parseInt(value, 10);
      return px >= MIN_FONT_SIZE_PX && px <= MAX_FONT_SIZE_PX;
    },
    {
      message: `Font size must be between ${MIN_FONT_SIZE_PX}px and ${MAX_FONT_SIZE_PX}px`,
    },
  );

/**
 * Per-selection font families. CSS variables resolve to the next/font
 * loaded families (attached globally in the root layout); unset inherits
 * the site font.
 */
export const FONT_FAMILY_VALUES = [
  "var(--font-inter)",
  "var(--font-manrope)",
  "var(--font-space-grotesk)",
  "var(--font-montserrat)",
  "var(--font-roboto)",
  "var(--font-arial)",
] as const;
export type FontFamilyValue = (typeof FONT_FAMILY_VALUES)[number];

export const HEADING_LEVELS = [1, 2, 3] as const;

/** Plain-text budget, matching the old text block limit (ARD §18 scale). */
export const MAX_RICH_TEXT_PLAIN_LENGTH = 2_000;
/** Serialized-JSON budget: rejects structurally abusive payloads. */
export const MAX_RICH_TEXT_JSON_LENGTH = 20_000;
export const MAX_RICH_TEXT_BLOCKS = 200;
const MAX_LIST_ITEMS = 100;

const basicMarkSchema = z.object({
  type: z.enum(RICH_TEXT_MARKS),
});

const textStyleMarkSchema = z.object({
  type: z.literal("textStyle"),
  attrs: z.object({
    fontSize: fontSizeSchema.nullable().optional(),
    fontFamily: z.enum(FONT_FAMILY_VALUES).nullable().optional(),
  }),
});

const markSchema = z.union([basicMarkSchema, textStyleMarkSchema]);

const textNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(markSchema).max(4).optional(),
});

const hardBreakNodeSchema = z.object({
  type: z.literal("hardBreak"),
});

const inlineNodeSchema = z.union([textNodeSchema, hardBreakNodeSchema]);

export const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

const textAlignAttrSchema = z.enum(TEXT_ALIGNMENTS).nullable().optional();

const paragraphNodeSchema = z.object({
  type: z.literal("paragraph"),
  attrs: z.object({ textAlign: textAlignAttrSchema }).optional(),
  content: z.array(inlineNodeSchema).optional(),
});

const headingNodeSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    textAlign: textAlignAttrSchema,
  }),
  content: z.array(inlineNodeSchema).optional(),
});

type InlineNode = z.infer<typeof inlineNodeSchema>;
export type ParagraphNode = z.infer<typeof paragraphNodeSchema>;
export type HeadingNode = z.infer<typeof headingNodeSchema>;

export type ListItemNode = {
  type: "listItem";
  content: Array<ParagraphNode | BulletListNode | OrderedListNode>;
};
export type BulletListNode = {
  type: "bulletList";
  content: ListItemNode[];
};
export type OrderedListNode = {
  type: "orderedList";
  attrs?: { start?: number | undefined } | undefined;
  content: ListItemNode[];
};

const listItemNodeSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    content: z
      .array(
        z.union([paragraphNodeSchema, bulletListNodeSchema, orderedListNodeSchema]),
      )
      .min(1)
      .max(MAX_LIST_ITEMS),
  }),
);

const bulletListNodeSchema: z.ZodType<BulletListNode> = z.lazy(() =>
  z.object({
    type: z.literal("bulletList"),
    content: z.array(listItemNodeSchema).min(1).max(MAX_LIST_ITEMS),
  }),
);

const orderedListNodeSchema: z.ZodType<OrderedListNode> = z.lazy(() =>
  z.object({
    type: z.literal("orderedList"),
    attrs: z
      .object({ start: z.number().int().min(1).optional() })
      .optional(),
    content: z.array(listItemNodeSchema).min(1).max(MAX_LIST_ITEMS),
  }),
);

const blockNodeSchema = z.union([
  paragraphNodeSchema,
  headingNodeSchema,
  bulletListNodeSchema,
  orderedListNodeSchema,
]);

export type RichTextBlockNode = z.infer<typeof blockNodeSchema>;

export const richTextDocumentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(blockNodeSchema).min(1).max(MAX_RICH_TEXT_BLOCKS),
  })
  .superRefine((doc, ctx) => {
    if (richTextToPlainText(doc).length > MAX_RICH_TEXT_PLAIN_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `Text is longer than ${MAX_RICH_TEXT_PLAIN_LENGTH} characters`,
      });
    }
    if (JSON.stringify(doc).length > MAX_RICH_TEXT_JSON_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: "Rich text payload is too large",
      });
    }
  });

export type RichTextDocument = z.infer<typeof richTextDocumentSchema>;

export function createEmptyRichTextDocument(): RichTextDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

type LooseNode = {
  type?: string | undefined;
  text?: string | undefined;
  content?: LooseNode[] | undefined;
};

const NEWLINE_JOINED = new Set(["doc", "bulletList", "orderedList", "listItem"]);

function nodeToPlainText(node: LooseNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  const children = node.content ?? [];
  const joiner = NEWLINE_JOINED.has(node.type ?? "") ? "\n" : "";
  return children.map(nodeToPlainText).join(joiner);
}

export function richTextToPlainText(doc: {
  content?: unknown[] | undefined;
}): string {
  return ((doc.content as LooseNode[] | undefined) ?? [])
    .map(nodeToPlainText)
    .join("\n");
}

/** Migration helper: one paragraph per line keeps legacy newlines intact. */
export function plainTextToRichText(text: string): RichTextDocument {
  const lines = text.split("\n");
  return {
    type: "doc",
    content: lines.map(
      (line): ParagraphNode =>
        line.length === 0
          ? { type: "paragraph" }
          : { type: "paragraph", content: [{ type: "text", text: line }] },
    ),
  };
}

export function isEmptyRichText(doc: RichTextDocument): boolean {
  return richTextToPlainText(doc).trim().length === 0;
}

// Referenced by the editor for exhaustiveness; kept for future tooling.
export type RichTextInlineNode = InlineNode;
