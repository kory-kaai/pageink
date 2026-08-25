import type { PageInkFontFamily } from "./types.js";

export function guessFontFamily(fontName: string): PageInkFontFamily {
  const lower = fontName.toLowerCase();
  if (lower.includes("times") || lower.includes("roman") || lower.includes("serif")) {
    return "times";
  }
  if (lower.includes("courier") || lower.includes("mono")) {
    return "courier";
  }
  return "helvetica";
}

export function guessBold(fontName: string): boolean {
  return /bold|black|heavy|semibold/i.test(fontName);
}
