import { describe, expect, it } from "vitest";

import { contrastRatio, hasLowContrast } from "./color-contrast";
import { DEFAULT_PAGE_THEME, pageThemeSchema } from "./page-theme";

describe("pageThemeSchema", () => {
  it("accepts and normalizes 6-digit hex to uppercase", () => {
    const theme = pageThemeSchema.parse({
      backgroundColor: "#ffffff",
      textColor: "#18181b",
    });

    expect(theme).toEqual({ backgroundColor: "#FFFFFF", textColor: "#18181B" });
  });

  it("rejects anything that is not #RRGGBB (no CSS injection)", () => {
    const bad = [
      "red",
      "#fff",
      "#ffff",
      "#gggggg",
      "rgb(0,0,0)",
      "#FFFFFF; background-image: url(x)",
      "var(--evil)",
    ];
    for (const value of bad) {
      expect(
        pageThemeSchema.safeParse({
          backgroundColor: value,
          textColor: "#000000",
        }).success,
      ).toBe(false);
    }
  });
});

describe("contrastRatio", () => {
  it("computes known WCAG values", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("flags low contrast pairs and passes the default theme", () => {
    expect(hasLowContrast("#FFFFFF", "#EEEEEE")).toBe(true);
    expect(
      hasLowContrast(
        DEFAULT_PAGE_THEME.backgroundColor,
        DEFAULT_PAGE_THEME.textColor,
      ),
    ).toBe(false);
  });
});
