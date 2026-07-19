import { describe, expect, it } from "vitest";

import {
  createProfileBlock,
  createRichTextBlock,
  createRowWithBlock,
} from "@/modules/layout/domain/block-factories";
import type { RichTextBlock, RowBlock } from "@/modules/layout/domain/blocks";
import {
  plainTextToRichText,
  richTextToPlainText,
} from "@/modules/rich-text/domain/rich-text-document";
import { makeEmptyRow, makeImageRow, makeTextRow } from "@/test/fixtures/rows";

import {
  addBlockToColumn,
  deleteRowAt,
  duplicateRowAt,
  insertRowAfter,
  moveRowBy,
  placeBlockInRow,
  removeBlockFromColumn,
  setRowColumnCount,
  updateBlockById,
  updateBlockInColumn,
} from "./layout-mutations";

function firstRichTextBlock(rows: RowBlock[]): RichTextBlock {
  const block = rows[0]?.columns[0]?.blocks[0];
  if (!block || block.type !== "rich-text") {
    throw new Error("expected a rich-text block");
  }
  return block;
}

function plainTextAt(rows: RowBlock[], rowIndex: number): string {
  const block = rows[rowIndex]?.columns[0]?.blocks[0];
  if (!block || block.type !== "rich-text") {
    throw new Error("expected a rich-text block");
  }
  return richTextToPlainText(block.content);
}

describe("insertRowAfter / deleteRowAt / moveRowBy", () => {
  it("inserts an empty row after the given index", () => {
    const rows = [makeTextRow("a"), makeTextRow("b")];

    const next = insertRowAfter(rows, 0, 2);

    expect(next).toHaveLength(3);
    expect(next[1]?.columns).toHaveLength(2);
    expect(next[1]?.columns.every((c) => c.blocks.length === 0)).toBe(true);
    expect(rows).toHaveLength(2); // input untouched
  });

  it("deletes the row at the index", () => {
    const rows = [makeTextRow("a"), makeTextRow("b")];

    const next = deleteRowAt(rows, 0);

    expect(next).toHaveLength(1);
    expect(plainTextAt(next, 0)).toBe("b");
  });

  it("moves a row and returns the input unchanged at the edges", () => {
    const rows = [makeTextRow("a"), makeTextRow("b")];

    expect(plainTextAt(moveRowBy(rows, 1, -1), 0)).toBe("b");
    expect(moveRowBy(rows, 0, -1)).toBe(rows);
    expect(moveRowBy(rows, 1, 1)).toBe(rows);
  });
});

describe("duplicateRowAt", () => {
  it("deep-clones the row with fresh row/column/block ids", () => {
    const rows = [makeImageRow(0)];

    const next = duplicateRowAt(rows, 0);

    expect(next).toHaveLength(2);
    const [original, clone] = next;
    expect(clone?.id).not.toBe(original?.id);
    expect(clone?.columns[0]?.id).not.toBe(original?.columns[0]?.id);
    expect(clone?.columns[0]?.blocks[0]?.id).not.toBe(
      original?.columns[0]?.blocks[0]?.id,
    );
  });

  it("editing the clone's rich text never mutates the original", () => {
    const rows = duplicateRowAt([makeTextRow("original text")], 0);
    const cloneIndex = 1;
    const clone = rows[cloneIndex];
    const cloneColumn = clone?.columns[0];
    const cloneBlock = cloneColumn?.blocks[0];
    if (!clone || !cloneColumn || !cloneBlock) {
      throw new Error("expected cloned row structure");
    }

    const next = updateBlockInColumn(
      rows,
      cloneIndex,
      cloneColumn.id,
      cloneBlock.id,
      (block) =>
        block.type === "rich-text"
          ? { ...block, content: plainTextToRichText("edited on the clone") }
          : block,
    );

    expect(plainTextAt(next, 0)).toBe("original text");
    expect(plainTextAt(next, cloneIndex)).toBe("edited on the clone");
  });

  it("drops system blocks from the clone instead of duplicating them", () => {
    const profileRow = createRowWithBlock(createProfileBlock());
    const rows = [profileRow];

    const next = duplicateRowAt(rows, 0);

    expect(next).toHaveLength(2);
    expect(next[1]?.columns[0]?.blocks).toHaveLength(0);
  });
});

describe("setRowColumnCount", () => {
  it("adds empty columns when growing", () => {
    const rows = [makeTextRow("a")];

    const next = setRowColumnCount(rows, 0, 3);

    expect(next[0]?.columns).toHaveLength(3);
    expect(next[0]?.columns[1]?.blocks).toHaveLength(0);
  });

  it("merges blocks from removed columns instead of deleting them", () => {
    const row = makeEmptyRow(3);
    const withBlocks: RowBlock = {
      ...row,
      columns: row.columns.map((c, i) => ({
        ...c,
        blocks: [
          { ...createRichTextBlock(), content: plainTextToRichText(`col ${i}`) },
        ],
      })),
    };

    const next = setRowColumnCount([withBlocks], 0, 1);

    const texts = next[0]?.columns[0]?.blocks.map((b) =>
      b.type === "rich-text" ? richTextToPlainText(b.content) : "",
    );
    expect(next[0]?.columns).toHaveLength(1);
    expect(texts).toEqual(["col 0", "col 1", "col 2"]);
  });
});

describe("placeBlockInRow", () => {
  it("fills the first empty column", () => {
    const rows = [makeEmptyRow(2)];

    const next = placeBlockInRow(rows, 0, createRichTextBlock());

    expect(next).toHaveLength(1);
    expect(next[0]?.columns[0]?.blocks).toHaveLength(1);
    expect(next[0]?.columns[1]?.blocks).toHaveLength(0);
  });

  it("creates a continuation row with the same column count when full", () => {
    const rows = [makeTextRow("full")]; // one column, occupied

    const next = placeBlockInRow(rows, 0, createRichTextBlock());

    expect(next).toHaveLength(2);
    expect(next[1]?.columns).toHaveLength(1);
    expect(next[1]?.columns[0]?.blocks).toHaveLength(1);
  });
});

describe("addBlockToColumn / removeBlockFromColumn / updateBlockById", () => {
  it("adds to and removes from the addressed column only", () => {
    const rows = [makeEmptyRow(2)];
    const columnId = rows[0]!.columns[1]!.id;
    const block = createRichTextBlock();

    const added = addBlockToColumn(rows, 0, columnId, block);
    expect(added[0]?.columns[1]?.blocks).toHaveLength(1);
    expect(added[0]?.columns[0]?.blocks).toHaveLength(0);

    const removed = removeBlockFromColumn(added, 0, columnId, block.id);
    expect(removed[0]?.columns[1]?.blocks).toHaveLength(0);
  });

  it("updates a block anywhere by id", () => {
    const rows = [makeTextRow("before"), makeTextRow("other")];
    const target = firstRichTextBlock(rows);

    const next = updateBlockById(rows, target.id, (block) =>
      block.type === "rich-text"
        ? { ...block, content: plainTextToRichText("after") }
        : block,
    );

    expect(plainTextAt(next, 0)).toBe("after");
    expect(plainTextAt(next, 1)).toBe("other");
  });
});
