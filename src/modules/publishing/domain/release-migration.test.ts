import { describe, expect, it } from "vitest";

import { createBlockId, createColumnId, createRowId } from "@/lib/ids/ids";
import { findBlocksOfType } from "@/modules/layout/domain/blocks";
import { DEFAULT_PAGE_THEME } from "@/modules/layout/domain/page-theme";
import { makeAsset } from "@/test/fixtures/assets";

import { parseReleaseProject, parseReleaseSite } from "./release";

describe("parseReleaseSite", () => {
  it("renders v1 site snapshots through the default layout", () => {
    const v1 = {
      schemaVersion: 1,
      title: "Studio Mai",
      bio: "Bio",
      font: "inter",
      socialLinks: [],
      updatedAt: "2026-07-18T00:00:00.000Z",
      avatarUrl: "https://assets.example.com/assets/asset_x/original.webp",
    };

    const site = parseReleaseSite(v1);

    expect(site.schemaVersion).toBe(2);
    expect(site.theme).toEqual(DEFAULT_PAGE_THEME);
    expect(findBlocksOfType(site.rows, "profile")).toHaveLength(1);
    expect(findBlocksOfType(site.rows, "project-grid")).toHaveLength(1);
    expect(site.avatarUrl).toBe(v1.avatarUrl);
  });
});

describe("parseReleaseProject", () => {
  it("renders v2 project snapshots with migrated rich text and default theme", () => {
    const v2 = {
      schemaVersion: 2,
      id: `project_${"a".repeat(32)}`,
      title: "Old",
      slug: "old",
      summary: "",
      rows: [
        {
          id: createRowId(),
          type: "row",
          columns: [
            {
              id: createColumnId(),
              blocks: [
                { id: createBlockId(), type: "text", text: "hello" },
                { id: createBlockId(), type: "image", asset: makeAsset(0) },
              ],
            },
          ],
        },
      ],
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    };

    const project = parseReleaseProject(v2);

    expect(project.schemaVersion).toBe(3);
    expect(project.theme).toEqual(DEFAULT_PAGE_THEME);
    expect(project.rows[0]?.columns[0]?.blocks[0]?.type).toBe("rich-text");
  });
});
