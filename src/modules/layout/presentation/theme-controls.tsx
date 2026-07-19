"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  contrastRatio,
  hasLowContrast,
} from "@/modules/layout/domain/color-contrast";
import {
  DEFAULT_PAGE_THEME,
  isValidHexColor,
  type PageTheme,
} from "@/modules/layout/domain/page-theme";

function ColorField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (hex: string) => void;
}) {
  // The text input buffers keystrokes and only commits valid hex, so the
  // canvas never flashes through half-typed colors. The parent remounts
  // this field (via `key`) whenever the committed value changes, which
  // keeps the buffer in sync with the picker.
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="w-24 shrink-0 text-xs">
        {label}
      </Label>
      <input
        type="color"
        aria-label={`${label} color picker`}
        value={value.toLowerCase()}
        onChange={(event) => onCommit(event.target.value.toUpperCase())}
        className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
      />
      <Input
        id={id}
        value={draft}
        maxLength={7}
        spellCheck={false}
        className="w-24 font-mono text-xs"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (isValidHexColor(next)) {
            onCommit(next.toUpperCase());
          }
        }}
        onBlur={() => setDraft(value)}
      />
    </div>
  );
}

export function ThemeControls({
  theme,
  onChange,
}: {
  theme: PageTheme;
  onChange: (theme: PageTheme) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  const lowContrast = hasLowContrast(theme.backgroundColor, theme.textColor);
  const ratio = contrastRatio(theme.backgroundColor, theme.textColor);

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span
          aria-hidden
          className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[9px] leading-none font-semibold"
          style={{
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
          }}
        >
          A
        </span>
        Theme
      </Button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-border bg-popover p-3 shadow-md">
          <ColorField
            key={`bg-${theme.backgroundColor}`}
            id="theme-background"
            label="Background"
            value={theme.backgroundColor}
            onCommit={(backgroundColor) => onChange({ ...theme, backgroundColor })}
          />
          <ColorField
            key={`fg-${theme.textColor}`}
            id="theme-text"
            label="Text"
            value={theme.textColor}
            onCommit={(textColor) => onChange({ ...theme, textColor })}
          />

          <div
            className="rounded-lg border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
            }}
          >
            Preview text
            <span className="ml-1 opacity-70">and muted text</span>
          </div>

          {lowContrast ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Low contrast ({ratio.toFixed(1)}:1) — text may be hard to read.
            </p>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={() => onChange(DEFAULT_PAGE_THEME)}
          >
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
