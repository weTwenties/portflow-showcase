/**
 * Shared typography for rich text in BOTH the editor surface and the static
 * public renderer, so editing and published output look identical. Colors
 * come from `currentColor` (the page theme), never from palette classes.
 */
export const RICH_TEXT_TYPOGRAPHY_CLASS = [
  "text-sm leading-6",
  "[&_p]:whitespace-pre-wrap [&_p+p]:mt-2",
  "[&_u]:underline [&_u]:underline-offset-2",
  "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:mt-4 [&_h1]:mb-2 [&_h1:first-child]:mt-0",
  "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0",
  "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_h3:first-child]:mt-0",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
  "[&_li]:mt-1",
  "[&_li_p]:whitespace-pre-wrap",
].join(" ");
