import type { CSSProperties } from "react";

import { z } from "zod";

/**
 * Background must travel together with a matching text color — swapping only
 * one of them destroys contrast. Values are plain 6-digit hex so no
 * arbitrary CSS can be injected through a color field.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const hexColorSchema = z
  .string()
  .regex(HEX_COLOR, { message: "Must be a #RRGGBB hex color" })
  .transform((value) => value.toUpperCase());

export const pageThemeSchema = z.object({
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
});

export type PageTheme = z.infer<typeof pageThemeSchema>;

export const DEFAULT_PAGE_THEME: PageTheme = {
  backgroundColor: "#FFFFFF",
  textColor: "#18181B",
};

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * Inline style for a themed page container. Children use `currentColor`
 * (optionally with opacity utilities for muted text) instead of hardcoded
 * palette classes.
 */
export function pageThemeStyle(theme: PageTheme): CSSProperties {
  return {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
  };
}
