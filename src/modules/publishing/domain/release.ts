import { z } from "zod";

import {
  legacyRowBlockSchema,
  migrateLegacyRows,
} from "@/modules/layout/domain/legacy-blocks";
import { DEFAULT_PAGE_THEME } from "@/modules/layout/domain/page-theme";
import { projectDocumentSchema } from "@/modules/project/domain/project-document";
import {
  createDefaultSiteRows,
  siteDocumentSchema,
} from "@/modules/site/domain/site-document";

const releaseIdSchema = z
  .string()
  .regex(/^release_[a-f0-9]{8,40}$|^release_[0-9]{14}[a-f0-9]{8}$/, {
    message: "Invalid release id",
  });

/** Card data the public home page needs, resolved at publish time. */
export const releaseProjectCardSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  coverUrl: z.url().optional(),
  coverWidth: z.number().int().min(1).optional(),
  coverHeight: z.number().int().min(1).optional(),
});

export type ReleaseProjectCard = z.infer<typeof releaseProjectCardSchema>;

export const releaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  releaseId: releaseIdSchema,
  createdAt: z.iso.datetime(),
  projects: z.array(releaseProjectCardSchema),
});

export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;

export const releaseSiteSchema = siteDocumentSchema.omit({ revision: true }).extend({
  avatarUrl: z.url().optional(),
});

export type ReleaseSite = z.infer<typeof releaseSiteSchema>;

/** Pre-layout site snapshots (schemaVersion 1): no theme, no rows. */
const releaseSiteV1Schema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  bio: z.string(),
  avatarAssetId: z.string().optional(),
  avatarUrl: z.url().optional(),
  font: siteDocumentSchema.shape.font,
  socialLinks: siteDocumentSchema.shape.socialLinks,
  updatedAt: z.iso.datetime(),
});

/**
 * Releases are immutable, so old snapshots keep their stored shape forever
 * and get normalized on read: v1 sites render through the default layout
 * (profile + grid) with the default theme — visually what they looked like
 * when published.
 */
export function parseReleaseSite(raw: unknown): ReleaseSite {
  const version = (raw as { schemaVersion?: unknown })?.schemaVersion;

  if (version === 1) {
    const v1 = releaseSiteV1Schema.parse(raw);
    return {
      schemaVersion: 2,
      title: v1.title,
      bio: v1.bio,
      ...(v1.avatarAssetId === undefined
        ? {}
        : { avatarAssetId: v1.avatarAssetId }),
      ...(v1.avatarUrl === undefined ? {} : { avatarUrl: v1.avatarUrl }),
      font: v1.font,
      socialLinks: v1.socialLinks,
      theme: DEFAULT_PAGE_THEME,
      rows: createDefaultSiteRows(),
      updatedAt: v1.updatedAt,
    };
  }

  return releaseSiteSchema.parse(raw);
}

/** Only projects with a title/slug are ever published, so both are required here. */
export const releaseProjectSchema = projectDocumentSchema
  .omit({ revision: true, normalizedTitle: true })
  .extend({
    title: z.string().min(1),
    slug: z.string().min(1),
  });

export type ReleaseProject = z.infer<typeof releaseProjectSchema>;

/** Schema-v2 project snapshots: plain text blocks, no theme. */
const releaseProjectV2Schema = z.object({
  schemaVersion: z.literal(2),
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  rows: z.array(legacyRowBlockSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export function parseReleaseProject(raw: unknown): ReleaseProject {
  const version = (raw as { schemaVersion?: unknown })?.schemaVersion;

  if (version === 2) {
    const v2 = releaseProjectV2Schema.parse(raw);
    const { rows, ...rest } = v2;
    return {
      ...rest,
      schemaVersion: 3,
      theme: DEFAULT_PAGE_THEME,
      rows: migrateLegacyRows(rows),
    };
  }

  return releaseProjectSchema.parse(raw);
}

export const currentPointerSchema = z.object({
  schemaVersion: z.literal(1),
  releaseId: releaseIdSchema,
  publishedAt: z.iso.datetime(),
});

export type CurrentPointer = z.infer<typeof currentPointerSchema>;
