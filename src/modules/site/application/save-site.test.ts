import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/api/app-error";
import {
  createProfileBlock,
  createRowWithBlock,
} from "@/modules/layout/domain/block-factories";
import { findBlocksOfType } from "@/modules/layout/domain/blocks";
import { DEFAULT_PAGE_THEME } from "@/modules/layout/domain/page-theme";
import { createR2SiteRepository } from "@/modules/site/infrastructure/r2-site-repository";
import { createDefaultSiteRows } from "@/modules/site/domain/site-document";
import { FakeObjectStore } from "@/test/fakes/fake-object-store";

import { saveSite } from "./save-site";

function setup() {
  const store = new FakeObjectStore();
  const sites = createR2SiteRepository(store);
  return { store, sites };
}

const VALID_INPUT = {
  title: "Studio Mai",
  bio: "A small design studio.",
  font: "manrope",
  socialLinks: [{ label: "Instagram", url: "https://instagram.com/studio" }],
  expectedRevision: 0,
};

describe("saveSite", () => {
  it("creates the first revision with default theme and layout", async () => {
    const { sites } = setup();

    const saved = await saveSite({ sites }, VALID_INPUT);

    expect(saved.revision).toBe(1);
    expect(saved.title).toBe("Studio Mai");
    expect(saved.theme).toEqual(DEFAULT_PAGE_THEME);
    expect(findBlocksOfType(saved.rows, "profile")).toHaveLength(1);
    expect(await sites.readDraft()).toEqual(saved);
  });

  it("keeps rows and theme when the settings form omits them", async () => {
    const { sites } = setup();
    const first = await saveSite(
      { sites },
      {
        ...VALID_INPUT,
        theme: { backgroundColor: "#101010", textColor: "#FAFAFA" },
        rows: createDefaultSiteRows(),
      },
    );

    const second = await saveSite(
      { sites },
      { ...VALID_INPUT, title: "Renamed", expectedRevision: first.revision },
    );

    expect(second.title).toBe("Renamed");
    expect(second.theme).toEqual(first.theme);
    expect(second.rows).toEqual(first.rows);
  });

  it("saves a custom theme and layout from the homepage canvas", async () => {
    const { sites } = setup();

    const saved = await saveSite(
      { sites },
      {
        ...VALID_INPUT,
        theme: { backgroundColor: "#0a0a0a", textColor: "#fafafa" },
        rows: createDefaultSiteRows(),
      },
    );

    // Hex normalizes to uppercase.
    expect(saved.theme).toEqual({
      backgroundColor: "#0A0A0A",
      textColor: "#FAFAFA",
    });
  });

  it("rejects invalid theme hex values", async () => {
    const { sites } = setup();

    await expect(
      saveSite(
        { sites },
        {
          ...VALID_INPUT,
          theme: { backgroundColor: "red", textColor: "#000000" },
        },
      ),
    ).rejects.toThrow();
  });

  it("rejects layouts violating system block invariants", async () => {
    const { sites } = setup();
    const rows = [
      ...createDefaultSiteRows(),
      createRowWithBlock(createProfileBlock()),
    ];

    try {
      await saveSite({ sites }, { ...VALID_INPUT, rows });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects a stale revision with REVISION_CONFLICT", async () => {
    const { sites } = setup();
    await saveSite({ sites }, VALID_INPUT);

    try {
      await saveSite({ sites }, { ...VALID_INPUT, expectedRevision: 0 });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).code).toBe("REVISION_CONFLICT");
    }
  });

  it("writes a history snapshot before overwriting", async () => {
    const { store, sites } = setup();
    await saveSite({ sites }, VALID_INPUT);
    await saveSite(
      { sites },
      { ...VALID_INPUT, title: "Studio Mai v2", expectedRevision: 1 },
    );

    expect(store.has("private", "content/history/site/1.json")).toBe(true);
    expect((await sites.readDraft())?.revision).toBe(2);
  });

  it("rejects invalid payloads", async () => {
    const { sites } = setup();

    await expect(
      saveSite({ sites }, { ...VALID_INPUT, title: "" }),
    ).rejects.toThrow();
    await expect(
      saveSite({ sites }, { ...VALID_INPUT, font: "comic-sans" }),
    ).rejects.toThrow();
  });
});
