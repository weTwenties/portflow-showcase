import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { JSONContent } from "@tiptap/react";

import { createRichTextExtensions } from "@/modules/rich-text/application/extensions";
import type { RichTextDocument } from "@/modules/rich-text/domain/rich-text-document";
import { RICH_TEXT_TYPOGRAPHY_CLASS } from "@/modules/rich-text/presentation/typography";

/**
 * Static React rendering of persisted rich text JSON — no editor instance,
 * no client runtime, safe for Server Components. Text inherits the page's
 * `currentColor`, slightly muted to match the previous body-text look.
 */
export function RichTextView({ content }: { content: RichTextDocument }) {
  let rendered: React.ReactNode;
  try {
    rendered = renderToReactElement({
      // Validated strict subset of JSONContent; cast bridges
      // exactOptionalPropertyTypes.
      content: content as JSONContent,
      extensions: createRichTextExtensions(),
    });
  } catch {
    // A malformed document must never crash a public page; validated
    // content can't reach this, but old/hand-edited JSON might.
    return null;
  }

  return (
    <div className={`opacity-80 ${RICH_TEXT_TYPOGRAPHY_CLASS}`}>{rendered}</div>
  );
}
