export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "preview",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "_next",
]);

export const MIN_SLUG_LENGTH = 2;
export const MAX_SLUG_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isValidSlug(value: string): boolean {
  return (
    value.length >= MIN_SLUG_LENGTH &&
    value.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(value) &&
    !RESERVED_SLUGS.has(value)
  );
}

/**
 * Derives a URL slug from a display name: lowercase, spaces → "-", and
 * Vietnamese (or any Latin) diacritics stripped (ê→e, ă/â/á→a, đ→d).
 * Recomputed whenever the project title changes.
 */
export function generateSlugFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replaceAll("đ", "d")
    .replaceAll("Đ", "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  if (slug.length < MIN_SLUG_LENGTH || RESERVED_SLUGS.has(slug)) {
    return slug.length === 0 ? "project" : `${slug}-project`.slice(0, MAX_SLUG_LENGTH);
  }

  return slug;
}
