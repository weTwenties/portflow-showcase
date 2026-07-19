import { describe, expect, it } from "vitest";

import { createBlockId, createColumnId, createRowId } from "@/lib/ids/ids";
import { DEFAULT_PAGE_THEME } from "@/modules/layout/domain/page-theme";
import { richTextToPlainText } from "@/modules/rich-text/domain/rich-text-document";
import { makeAsset } from "@/test/fixtures/assets";

import { parseProjectDocument } from "./project-document";

function v2Draft() {
  return {
    schemaVersion: 2,
    id: `project_${"a".repeat(32)}`,
    title: "Old Project",
    normalizedTitle: "old project",
    slug: "old-project",
    summary: "From the v2 era",
    rows: [
      {
        id: createRowId(),
        type: "row",
        columns: [
          {
            id: createColumnId(),
            blocks: [
              {
                id: createBlockId(),
                type: "text",
                text: "first line\nsecond line",
              },
              { id: createBlockId(), type: "image", asset: makeAsset(0) },
            ],
          },
        ],
      },
    ],
    revision: 4,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T01:00:00.000Z",
  };
}

describe("parseProjectDocument", () => {
  it("normalizes a v2 draft to v3 with default theme and rich text", () => {
    const migrated = parseProjectDocument(v2Draft());

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.theme).toEqual(DEFAULT_PAGE_THEME);
    expect(migrated.revision).toBe(4); // revision untouched

    const blocks = migrated.rows[0]?.columns[0]?.blocks;
    expect(blocks).toHaveLength(2);
    const [textBlock, imageBlock] = blocks ?? [];
    expect(textBlock?.type).toBe("rich-text");
    expect(imageBlock?.type).toBe("image");
  });

  it("preserves legacy newlines as separate paragraphs", () => {
    const migrated = parseProjectDocument(v2Draft());
    const block = migrated.rows[0]?.columns[0]?.blocks[0];
    if (block?.type !== "rich-text") {
      throw new Error("expected rich-text block");
    }

    expect(block.content.content).toHaveLength(2);
    expect(richTextToPlainText(block.content)).toBe("first line\nsecond line");
  });

  it("parses v3 documents as-is", () => {
    const migratedOnce = parseProjectDocument(v2Draft());
    const again = parseProjectDocument(migratedOnce);

    expect(again).toEqual(migratedOnce);
  });

  it("rejects project rows containing site-only system blocks", () => {
    const doc = parseProjectDocument(v2Draft());
    const poisoned = {
      ...doc,
      rows: [
        {
          id: createRowId(),
          type: "row",
          columns: [
            {
              id: createColumnId(),
              blocks: [
                {
                  id: createBlockId(),
                  type: "profile",
                  align: "left",
                  showAvatar: true,
                  showBio: true,
                  showSocialLinks: true,
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => parseProjectDocument(poisoned)).toThrow();
  });
});
