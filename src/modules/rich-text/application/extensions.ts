import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import type { Extensions } from "@tiptap/react";

import { TEXT_ALIGNMENTS } from "@/modules/rich-text/domain/rich-text-document";

/**
 * The single extension set shared by the editor and the static renderer, so
 * what you can type is exactly what the public page can render. Everything
 * outside the allowlist (links, code, quotes, arbitrary styles, …) is
 * disabled; pasted content gets coerced into this schema, which drops
 * unsupported nodes/marks before they ever reach state or R2.
 *
 * Allowed: paragraph, heading 1-3, bullet/ordered list, text, hard break,
 * bold, italic, underline, and font size/family from a fixed allowlist
 * (+ undo/redo in the editor). The Zod schema in
 * `domain/rich-text-document.ts` is the server-side mirror of this set.
 */
export function createRichTextExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      link: false,
      dropcursor: false,
      gapcursor: false,
    }),
    TextStyle,
    FontSize,
    FontFamily,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: [...TEXT_ALIGNMENTS],
    }),
  ];
}
