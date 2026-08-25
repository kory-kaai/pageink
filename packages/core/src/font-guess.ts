import type { PageInkFontFamily } from "./types.js";

export function guessFontFamily(fontName: string): PageInkFontFamily {
  const lower = fontName.toLowerCase();
  if (lower.includes("courier") || lower.includes("mono")) {
    return "courier";
  }
  // "sans-serif" contains the substring "serif", so match sans first or Helvetica
  // (and other common sans faces) would be misread as a serif/Times font.
  if (
    lower.includes("sans") ||
    lower.includes("helvetica") ||
    lower.includes("arial") ||
    lower.includes("verdana") ||
    lower.includes("segoe") ||
    lower.includes("calibri")
  ) {
    return "helvetica";
  }
  if (
    lower.includes("times") ||
    lower.includes("roman") ||
    lower.includes("georgia") ||
    lower.includes("garamond") ||
    lower.includes("serif")
  ) {
    return "times";
  }
  return "helvetica";
}

export function guessBold(fontName: string): boolean {
  return /bold|black|heavy|semibold|demi/i.test(fontName);
}
