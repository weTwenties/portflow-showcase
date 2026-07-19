import { createBlockId, createColumnId, createRowId } from "@/lib/ids/ids";
import type { RichTextBlock, RowBlock } from "@/modules/layout/domain/blocks";
import { plainTextToRichText } from "@/modules/rich-text/domain/rich-text-document";

import { makeAsset } from "./assets";

export function makeRichTextBlock(text = "Hello"): RichTextBlock {
  return {
    id: createBlockId(),
    type: "rich-text",
    content: plainTextToRichText(text),
  };
}

export function makeImageRow(
  order = 0,
  assetOverrides: Parameters<typeof makeAsset>[1] = {},
): RowBlock {
  return {
    id: createRowId(),
    type: "row",
    columns: [
      {
        id: createColumnId(),
        blocks: [
          { id: createBlockId(), type: "image", asset: makeAsset(order, assetOverrides) },
        ],
      },
    ],
  };
}

export function makeTextRow(text = "Hello"): RowBlock {
  return {
    id: createRowId(),
    type: "row",
    columns: [{ id: createColumnId(), blocks: [makeRichTextBlock(text)] }],
  };
}

export function makeEmptyRow(columnCount = 3): RowBlock {
  return {
    id: createRowId(),
    type: "row",
    columns: Array.from({ length: columnCount }, () => ({
      id: createColumnId(),
      blocks: [],
    })),
  };
}
