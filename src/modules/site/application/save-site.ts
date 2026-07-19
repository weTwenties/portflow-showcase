import { z } from "zod";

import { AppError } from "@/lib/api/app-error";
import {
  createInitialSiteDocument,
  siteInputSchema,
  validateSiteLayout,
  type SiteDocument,
} from "@/modules/site/domain/site-document";

import type { SiteRepository } from "./ports";

const saveSiteRequestSchema = siteInputSchema.extend({
  expectedRevision: z.number().int().min(0),
});

export async function saveSite(
  deps: { sites: SiteRepository },
  input: unknown,
): Promise<SiteDocument> {
  const parsed = saveSiteRequestSchema.parse(input);
  const current = (await deps.sites.readDraft()) ?? createInitialSiteDocument();

  if (current.revision !== parsed.expectedRevision) {
    throw new AppError(
      "REVISION_CONFLICT",
      "The site settings were changed elsewhere. Reload and try again.",
      { currentRevision: current.revision },
    );
  }

  const rows = parsed.rows ?? current.rows;
  const layoutProblem = validateSiteLayout(rows);
  if (layoutProblem) {
    throw new AppError("VALIDATION_ERROR", layoutProblem);
  }

  if (current.revision > 0) {
    await deps.sites.writeHistory(current);
  }

  // Built field-by-field (not spread over `current`) so clearing an
  // optional field like the avatar actually removes it. `theme`/`rows`
  // fall back to the current document when omitted from a partial update.
  const next: SiteDocument = {
    schemaVersion: 2,
    title: parsed.title,
    bio: parsed.bio,
    ...(parsed.avatarAssetId === undefined
      ? {}
      : { avatarAssetId: parsed.avatarAssetId }),
    font: parsed.font,
    socialLinks: parsed.socialLinks,
    theme: parsed.theme ?? current.theme,
    rows,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };

  await deps.sites.writeDraft(next);
  return next;
}
