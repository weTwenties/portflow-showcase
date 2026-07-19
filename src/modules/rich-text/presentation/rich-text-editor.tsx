"use client";

import { useId, useState } from "react";

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import {
  AlignCenter as AlignCenterIcon,
  AlignLeft as AlignLeftIcon,
  AlignRight as AlignRightIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Redo2 as RedoIcon,
  Underline as UnderlineIcon,
  Undo2 as UndoIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createRichTextExtensions } from "@/modules/rich-text/application/extensions";
import {
  FONT_FAMILY_VALUES,
  FONT_SIZE_SUGGESTIONS_PX,
  MAX_FONT_SIZE_PX,
  MIN_FONT_SIZE_PX,
  type RichTextDocument,
  type TextAlignment,
} from "@/modules/rich-text/domain/rich-text-document";
import { RICH_TEXT_TYPOGRAPHY_CLASS } from "@/modules/rich-text/presentation/typography";

const FONT_FAMILY_LABELS: Record<(typeof FONT_FAMILY_VALUES)[number], string> = {
  "var(--font-inter)": "Inter",
  "var(--font-manrope)": "Manrope",
  "var(--font-space-grotesk)": "Space Grotesk",
  "var(--font-montserrat)": "Montserrat",
  "var(--font-roboto)": "Roboto",
  "var(--font-arial)": "Arial",
};

type BlockType = "paragraph" | "h1" | "h2" | "h3";

function ToolbarButton({
  label,
  shortcut,
  isActive,
  isDisabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tooltip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={isActive}
      disabled={isDisabled}
      // Keep focus (and the text selection) inside the editor.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Word-style size box: type any number (8–96) and press Enter, or pick from
 * the datalist suggestions. Empty resets to the default body size.
 */
function FontSizeInput({
  value,
  onCommit,
}: {
  /** Current size like "18px", or "" when unset. */
  value: string;
  onCommit: (px: number | null) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState(value ? String(Number.parseInt(value, 10)) : "");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const px = Number.parseInt(trimmed, 10);
    if (Number.isNaN(px)) {
      setDraft(value ? String(Number.parseInt(value, 10)) : "");
      return;
    }
    onCommit(Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, px)));
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        list={listId}
        title={`Font size (${MIN_FONT_SIZE_PX}–${MAX_FONT_SIZE_PX})`}
        aria-label="Font size in pixels"
        placeholder="14"
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        className="h-7 w-12 rounded-md border border-input bg-transparent px-1.5 text-center text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      <datalist id={listId}>
        {FONT_SIZE_SUGGESTIONS_PX.map((px) => (
          <option key={px} value={px} />
        ))}
      </datalist>
    </>
  );
}

function ToolbarSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      title={label}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 rounded-md border border-input bg-transparent px-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isUnderline: ctx.editor.isActive("underline"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      blockType: (ctx.editor.isActive("heading", { level: 1 })
        ? "h1"
        : ctx.editor.isActive("heading", { level: 2 })
          ? "h2"
          : ctx.editor.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockType,
      fontSize:
        (ctx.editor.getAttributes("textStyle").fontSize as string | null) ?? "",
      fontFamily:
        (ctx.editor.getAttributes("textStyle").fontFamily as string | null) ??
        "",
      textAlign: (ctx.editor.isActive({ textAlign: "center" })
        ? "center"
        : ctx.editor.isActive({ textAlign: "right" })
          ? "right"
          : "left") as TextAlignment,
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  function setBlockType(next: string) {
    const chain = editor.chain().focus();
    if (next === "paragraph") {
      chain.setParagraph().run();
    } else {
      const level = Number(next.replace("h", "")) as 1 | 2 | 3;
      chain.setHeading({ level }).run();
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1"
    >
      <ToolbarSelect
        label="Text style"
        value={state.blockType}
        options={[
          { value: "paragraph", label: "Body" },
          { value: "h1", label: "Heading 1" },
          { value: "h2", label: "Heading 2" },
          { value: "h3", label: "Heading 3" },
        ]}
        onChange={setBlockType}
      />
      <FontSizeInput
        key={`size-${state.fontSize}`}
        value={state.fontSize}
        onCommit={(px) => {
          const chain = editor.chain().focus();
          if (px === null) {
            chain.unsetFontSize().run();
          } else {
            chain.setFontSize(`${px}px`).run();
          }
        }}
      />
      <ToolbarSelect
        label="Font family"
        value={state.fontFamily}
        options={[
          { value: "", label: "Font" },
          ...FONT_FAMILY_VALUES.map((family) => ({
            value: family,
            label: FONT_FAMILY_LABELS[family],
          })),
        ]}
        onChange={(family) => {
          const chain = editor.chain().focus();
          if (family === "") {
            chain.unsetFontFamily().run();
          } else {
            chain.setFontFamily(family).run();
          }
        }}
      />
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bold"
        shortcut="⌘B"
        isActive={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut="⌘I"
        isActive={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Underline (not a link)"
        shortcut="⌘U"
        isActive={state.isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Align left"
        isActive={state.textAlign === "left"}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        isActive={state.textAlign === "center"}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        isActive={state.textAlign === "right"}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRightIcon />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bullet list"
        isActive={state.isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        isActive={state.isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Undo"
        shortcut="⌘Z"
        isDisabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        shortcut="⇧⌘Z"
        isDisabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <RedoIcon />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Text…",
}: {
  content: RichTextDocument;
  onChange: (content: RichTextDocument) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: createRichTextExtensions(),
    // Our validated document type is a strict subset of JSONContent; the
    // cast only bridges exactOptionalPropertyTypes.
    content: content as JSONContent,
    // Required in Next.js: rendering on the client after hydration avoids
    // SSR/client markup mismatches.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `min-h-16 px-2.5 py-2 outline-none ${RICH_TEXT_TYPOGRAPHY_CLASS}`,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    // Only fires when the document actually changed, so selection moves
    // never schedule an autosave.
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as RichTextDocument);
    },
  });

  const isEmpty = useEditorState({
    editor,
    selector: (ctx) => ctx.editor?.isEmpty ?? true,
  });

  if (!editor) {
    return (
      <div className="min-h-24 rounded-lg border border-input dark:bg-input/30" />
    );
  }

  return (
    <div className="rounded-lg border border-input transition-colors bg-white dark:bg-black focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <Toolbar editor={editor} />
      <div className="relative">
        {isEmpty ? (
          <span className="pointer-events-none absolute top-2 left-2.5 text-sm opacity-40">
            {placeholder}
          </span>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
