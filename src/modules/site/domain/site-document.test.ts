import { describe, expect, it } from "vitest";

import {
  createProfileBlock,
  createProjectGridBlock,
  createRowWithBlock,
} from "@/modules/layout/domain/block-factories";
import { findBlocksOfType } from "@/modules/layout/domain/blocks";
import { DEFAULT_PAGE_THEME } from "@/modules/layout/domain/page-theme";
import { makeTextRow } from "@/test/fixtures/rows";

import {
  createDefaultSiteRows,
  parseSiteDocument,
  validateSiteLayout,
  type SiteDocument,
} from "./site-document";

function v1Site() {
  return {
    schemaVersion: 1,
    title: "Studio Mai",
    bio: "A studio",
    font: "inter",
    socialLinks: [{ label: "IG", url: "https://instagram.com/x" }],
    revision: 3,
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

describe("parseSiteDocument", () => {
  it("migrates v1 to v2 with the default layout and theme", () => {
    const site = parseSiteDocument(v1Site());

    expect(site.schemaVersion).toBe(2);
    expect(site.theme).toEqual(DEFAULT_PAGE_THEME);
    expect(site.revision).toBe(3);
    expect(findBlocksOfType(site.rows, "profile")).toHaveLength(1);
    expect(findBlocksOfType(site.rows, "project-grid")).toHaveLength(1);
  });

  it("parses v2 documents as-is", () => {
    const migrated = parseSiteDocument(v1Site());
    expect(parseSiteDocument(migrated)).toEqual(migrated);
  });
});

describe("validateSiteLayout", () => {
  function siteRows(): SiteDocument["rows"] {
    return createDefaultSiteRows();
  }

  it("accepts the default layout", () => {
    expect(validateSiteLayout(siteRows())).toBeNull();
  });

  it("rejects a second profile block", () => {
    const rows = [...siteRows(), createRowWithBlock(createProfileBlock())];
    expect(validateSiteLayout(rows)).toMatch(/one profile/);
  });

  it("rejects a second project grid", () => {
    const rows = [...siteRows(), createRowWithBlock(createProjectGridBlock())];
    expect(validateSiteLayout(rows)).toMatch(/one project grid/);
  });

  it("rejects a grid sharing a row with other columns", () => {
    const gridRow = createRowWithBlock(createProjectGridBlock());
    const twoColumns = {
      ...gridRow,
      columns: [...gridRow.columns, { id: `column_${"b".repeat(32)}`, blocks: [] }],
    };
    expect(validateSiteLayout([twoColumns])).toMatch(/single-column/);
  });

  it("rejects a grid sharing its column with another block", () => {
    const gridRow = createRowWithBlock(createProjectGridBlock());
    const textRow = makeTextRow("hi");
    const textBlock = textRow.columns[0]!.blocks[0]!;
    const polluted = {
      ...gridRow,
      columns: [
        {
          id: gridRow.columns[0]!.id,
          blocks: [...gridRow.columns[0]!.blocks, textBlock],
        },
      ],
    };
    expect(validateSiteLayout([polluted])).toMatch(/only block/);
  });
});
