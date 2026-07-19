import { z } from "zod";

import { plainTextToRichText } from "@/modules/rich-text/domain/rich-text-document";

import {
  imageBlockSchema,
  MAX_BLOCKS_PER_COLUMN,
  MAX_COLUMNS,
  MIN_COLUMNS,
  type ContentRowBlock,
} from "./blocks";

/**
 * Schema-v2 era blocks: plain `text` strings instead of rich text documents.
 * Only used to read old drafts/releases; every save writes the current shape
 * and old immutable releases are never rewritten.
 */

const legacyTextBlockSchema = z.object({
  id: z.string().regex(/^block_[a-f0-9]{32}$/),
  type: z.literal("text"),
  text: z.string(),
});

const legacyBlockSchema = z.discriminatedUnion("type", [
  imageBlockSchema,
  legacyTextBlockSchema,
]);

export const legacyRowBlockSchema = z.object({
  id: z.string().regex(/^row_[a-f0-9]{32}$/),
  type: z.literal("row"),
  columns: z
    .array(
      z.object({
        id: z.string().regex(/^column_[a-f0-9]{32}$/),
        blocks: z.array(legacyBlockSchema).max(MAX_BLOCKS_PER_COLUMN),
      }),
    )
    .min(MIN_COLUMNS)
    .max(MAX_COLUMNS),
});

export type LegacyRowBlock = z.infer<typeof legacyRowBlockSchema>;

/** Converts legacy rows in-memory: `text` becomes rich text, ids are kept. */
export function migrateLegacyRows(rows: LegacyRowBlock[]): ContentRowBlock[] {
  return rows.map((row) => ({
    id: row.id,
    type: "row",
    columns: row.columns.map((column) => ({
      id: column.id,
      blocks: column.blocks.map((block) =>
        block.type === "text"
          ? {
              id: block.id,
              type: "rich-text" as const,
              content: plainTextToRichText(block.text),
            }
          : block,
      ),
    })),
  }));
}
