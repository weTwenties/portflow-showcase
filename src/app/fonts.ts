import { Inter, Manrope, Montserrat, Roboto, Space_Grotesk } from "next/font/google";

import type { SiteFont } from "@/modules/site/domain/site-document";

/**
 * Static mapping for the fonts the site document can pick from.
 * next/font requires each Google font to be a module-scope constant.
 *
 * Arial is a system font (not loaded via next/font); its CSS variable is
 * set on the root via `arialVariableClassName`.
 *
 * Each font exposes a CSS variable (--font-*) so rich text can apply a
 * per-selection font family from a fixed allowlist (ADR-0002); the
 * variables are attached globally in the root layout.
 */

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  preload: false,
  variable: "--font-inter",
});
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  preload: false,
  variable: "--font-manrope",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  preload: false,
  variable: "--font-space-grotesk",
});
const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  preload: false,
  variable: "--font-montserrat",
});
const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  preload: false,
  variable: "--font-roboto",
});

/** Sets --font-arial to the system Arial stack (no webfont download). */
const arialVariableClassName = "[--font-arial:Arial,Helvetica,sans-serif]";

const FONT_CLASS_NAMES: Record<SiteFont, string> = {
  inter: inter.className,
  manrope: manrope.className,
  "space-grotesk": spaceGrotesk.className,
  montserrat: montserrat.className,
  roboto: roboto.className,
  arial: "[font-family:var(--font-arial)]",
};

export function siteFontClassName(font: SiteFont): string {
  return FONT_CLASS_NAMES[font];
}

/** Attach to a root element so the --font-* variables exist everywhere. */
export const fontVariablesClassName = [
  inter.variable,
  manrope.variable,
  spaceGrotesk.variable,
  montserrat.variable,
  roboto.variable,
  arialVariableClassName,
].join(" ");
