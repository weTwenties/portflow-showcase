import { z } from "zod";

import {
  findBlocksOfType,
  MAX_ROWS_PER_PROJECT,
  siteRowBlockSchema,
  type SiteRowBlock,
} from "@/modules/layout/domain/blocks";
import {
  createProfileBlock,
  createProjectGridBlock,
  createRowWithBlock,
} from "@/modules/layout/domain/block-factories";
import {
  DEFAULT_PAGE_THEME,
  pageThemeSchema,
} from "@/modules/layout/domain/page-theme";

export const SITE_FONTS = [
  "inter",
  "manrope",
  "space-grotesk",
  "montserrat",
  "roboto",
  "arial",
] as const;

export type SiteFont = (typeof SITE_FONTS)[number];

export const MAX_SITE_TITLE_LENGTH = 80;
export const MAX_BIO_LENGTH = 1_000;
export const MAX_SOCIAL_LINKS = 10;

export const socialLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.url(),
});

/**
 * Schema v2 (ADR-0002): the root page becomes a block layout with a theme.
 * Profile data (title/bio/avatar/socials) stays as structured fields — the
 * profile block only controls where/how it renders, so metadata never
 * depends on the visual layout.
 */
export const siteDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  title: z.string().trim().min(1).max(MAX_SITE_TITLE_LENGTH),
  bio: z.string().max(MAX_BIO_LENGTH),
  avatarAssetId: z
    .string()
    .regex(/^asset_[a-f0-9]{32}$/)
    .optional(),
  font: z.enum(SITE_FONTS),
  socialLinks: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS),
  theme: pageThemeSchema,
  rows: z.array(siteRowBlockSchema).max(MAX_ROWS_PER_PROJECT),
  revision: z.number().int().min(0),
  updatedAt: z.iso.datetime(),
});

export type SiteDocument = z.infer<typeof siteDocumentSchema>;

/** Schema-v1 documents: no theme, no rows. Read-only, never written. */
const siteDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1).max(MAX_SITE_TITLE_LENGTH),
  bio: z.string().max(MAX_BIO_LENGTH),
  avatarAssetId: z
    .string()
    .regex(/^asset_[a-f0-9]{32}$/)
    .optional(),
  font: z.enum(SITE_FONTS),
  socialLinks: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS),
  revision: z.number().int().min(0),
  updatedAt: z.iso.datetime(),
});

/**
 * The layout every site starts with (and that v1 documents migrate to):
 * profile on top, project grid below — visually identical to the pre-layout
 * hardcoded root page.
 */
export function createDefaultSiteRows(): SiteRowBlock[] {
  return [
    createRowWithBlock(createProfileBlock()),
    createRowWithBlock(createProjectGridBlock()),
  ] as SiteRowBlock[];
}

export function parseSiteDocument(raw: unknown): SiteDocument {
  const version = (raw as { schemaVersion?: unknown })?.schemaVersion;

  if (version === 1) {
    const v1 = siteDocumentV1Schema.parse(raw);
    return {
      ...v1,
      schemaVersion: 2,
      theme: DEFAULT_PAGE_THEME,
      rows: createDefaultSiteRows(),
    };
  }

  return siteDocumentSchema.parse(raw);
}

/**
 * System-block invariants (ADR-0002): at most one profile and one
 * project-grid; the grid must be the only block of a single-column row so
 * it always gets the full page width.
 */
export function validateSiteLayout(rows: SiteRowBlock[]): string | null {
  if (findBlocksOfType(rows, "profile").length > 1) {
    return "The layout can only contain one profile block";
  }
  if (findBlocksOfType(rows, "project-grid").length > 1) {
    return "The layout can only contain one project grid block";
  }

  for (const row of rows) {
    for (const column of row.columns) {
      for (const block of column.blocks) {
        if (block.type === "project-grid") {
          if (row.columns.length !== 1 || column.blocks.length !== 1) {
            return "The project grid must be the only block in a single-column row";
          }
        }
      }
    }
  }

  return null;
}

/**
 * Fields the admin can edit. `theme` and `rows` are optional so partial
 * updates can omit them; the homepage editor always sends the full set.
 */
export const siteInputSchema = z.object({
  title: siteDocumentSchema.shape.title,
  bio: siteDocumentSchema.shape.bio,
  avatarAssetId: siteDocumentSchema.shape.avatarAssetId,
  font: siteDocumentSchema.shape.font,
  socialLinks: siteDocumentSchema.shape.socialLinks,
  theme: pageThemeSchema.optional(),
  rows: z.array(siteRowBlockSchema).max(MAX_ROWS_PER_PROJECT).optional(),
});

export type SiteInput = z.infer<typeof siteInputSchema>;

export function createInitialSiteDocument(
  now: Date = new Date(),
): SiteDocument {
  return {
    schemaVersion: 2,
    title: "My Portfolio",
    bio: "",
    font: "inter",
    socialLinks: [],
    theme: DEFAULT_PAGE_THEME,
    rows: createDefaultSiteRows(),
    revision: 0,
    updatedAt: now.toISOString(),
  };
}
