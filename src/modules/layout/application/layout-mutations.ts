import {
  cloneRowDeep,
  createEmptyColumn,
  createEmptyRow,
} from "@/modules/layout/domain/block-factories";
import type { Block, RowBlock } from "@/modules/layout/domain/blocks";

/**
 * Pure, immutable operations over a `RowBlock[]` layout. Every function
 * returns a new array (or the input when the operation is a no-op) and never
 * mutates its arguments — the canvases feed the result straight into their
 * autosave snapshot comparison.
 */

function updateRowAt(
  rows: RowBlock[],
  index: number,
  updater: (row: RowBlock) => RowBlock,
): RowBlock[] {
  return rows.map((row, i) => (i === index ? updater(row) : row));
}

export function insertRowAfter(
  rows: RowBlock[],
  afterIndex: number,
  columnCount = 3,
): RowBlock[] {
  const next = [...rows];
  next.splice(afterIndex + 1, 0, createEmptyRow(columnCount));
  return next;
}

export function deleteRowAt(rows: RowBlock[], index: number): RowBlock[] {
  return rows.filter((_, i) => i !== index);
}

export function duplicateRowAt(rows: RowBlock[], index: number): RowBlock[] {
  const source = rows[index];
  if (!source) {
    return rows;
  }
  const next = [...rows];
  next.splice(index + 1, 0, cloneRowDeep(source));
  return next;
}

export function moveRowBy(
  rows: RowBlock[],
  index: number,
  direction: -1 | 1,
): RowBlock[] {
  const target = index + direction;
  if (target < 0 || target >= rows.length) {
    return rows;
  }
  const next = [...rows];
  const [moved] = next.splice(index, 1);
  if (!moved) {
    return rows;
  }
  next.splice(target, 0, moved);
  return next;
}

export function setRowColumnCount(
  rows: RowBlock[],
  index: number,
  count: number,
): RowBlock[] {
  return updateRowAt(rows, index, (row) => {
    if (count === row.columns.length) {
      return row;
    }
    if (count > row.columns.length) {
      const additions = Array.from(
        { length: count - row.columns.length },
        () => createEmptyColumn(),
      );
      return { ...row, columns: [...row.columns, ...additions] };
    }
    // Reducing columns never deletes content: blocks from removed
    // trailing columns are merged into the last remaining column.
    const kept = row.columns.slice(0, count);
    const overflow = row.columns.slice(count).flatMap((c) => c.blocks);
    const lastIndex = kept.length - 1;
    return {
      ...row,
      columns: kept.map((c, i) =>
        i === lastIndex ? { ...c, blocks: [...c.blocks, ...overflow] } : c,
      ),
    };
  });
}

export function addBlockToColumn(
  rows: RowBlock[],
  rowIndex: number,
  columnId: string,
  block: Block,
): RowBlock[] {
  return updateRowAt(rows, rowIndex, (row) => ({
    ...row,
    columns: row.columns.map((c) =>
      c.id === columnId ? { ...c, blocks: [...c.blocks, block] } : c,
    ),
  }));
}

/**
 * Drops a block into a row: the first empty column wins; when the row is
 * full, a continuation row with the same column count is inserted right
 * below and receives the block in its first column.
 */
export function placeBlockInRow(
  rows: RowBlock[],
  rowIndex: number,
  block: Block,
): RowBlock[] {
  const row = rows[rowIndex];
  if (!row) {
    return rows;
  }

  const emptyColumn = row.columns.find((c) => c.blocks.length === 0);
  if (emptyColumn) {
    return addBlockToColumn(rows, rowIndex, emptyColumn.id, block);
  }

  const newRow = createEmptyRow(row.columns.length);
  const firstColumn = newRow.columns[0];
  if (firstColumn) {
    firstColumn.blocks = [block];
  }
  const next = [...rows];
  next.splice(rowIndex + 1, 0, newRow);
  return next;
}

export function updateBlockInColumn(
  rows: RowBlock[],
  rowIndex: number,
  columnId: string,
  blockId: string,
  updater: (block: Block) => Block,
): RowBlock[] {
  return updateRowAt(rows, rowIndex, (row) => ({
    ...row,
    columns: row.columns.map((c) =>
      c.id === columnId
        ? {
            ...c,
            blocks: c.blocks.map((b) => (b.id === blockId ? updater(b) : b)),
          }
        : c,
    ),
  }));
}

/** Updates a block anywhere in the layout by id (used for block config UIs). */
export function updateBlockById(
  rows: RowBlock[],
  blockId: string,
  updater: (block: Block) => Block,
): RowBlock[] {
  return rows.map((row) => ({
    ...row,
    columns: row.columns.map((column) => ({
      ...column,
      blocks: column.blocks.map((block) =>
        block.id === blockId ? updater(block) : block,
      ),
    })),
  }));
}

export function removeBlockFromColumn(
  rows: RowBlock[],
  rowIndex: number,
  columnId: string,
  blockId: string,
): RowBlock[] {
  return updateRowAt(rows, rowIndex, (row) => ({
    ...row,
    columns: row.columns.map((c) =>
      c.id === columnId
        ? { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) }
        : c,
    ),
  }));
}
