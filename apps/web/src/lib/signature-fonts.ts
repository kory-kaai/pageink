import { PAGEINK_SIGNATURE_STYLES, type PageInkSignatureStyle } from "@korykaai/pageink-core";

/** CSS family names registered in pageink.css @font-face rules. */
export const SIGNATURE_FONT_FAMILIES: Record<PageInkSignatureStyle, string> = {
  formal: "PageInk Formal",
  elegant: "PageInk Elegant",
  casual: "PageInk Casual",
  friendly: "PageInk Friendly",
  "bold-script": "PageInk Bold Script",
};

export const SIGNATURE_FONT_STACKS: Record<PageInkSignatureStyle, string> = {
  formal: `"${SIGNATURE_FONT_FAMILIES.formal}", cursive`,
  elegant: `"${SIGNATURE_FONT_FAMILIES.elegant}", cursive`,
  casual: `"${SIGNATURE_FONT_FAMILIES.casual}", cursive`,
  friendly: `"${SIGNATURE_FONT_FAMILIES.friendly}", cursive`,
  "bold-script": `"${SIGNATURE_FONT_FAMILIES["bold-script"]}", cursive`,
};

const SIGNATURE_FONT_URLS: Record<PageInkSignatureStyle, string> = {
  formal: "/fonts/signatures/GreatVibes-Regular.ttf",
  elegant: "/fonts/signatures/Allura-Regular.ttf",
  casual: "/fonts/signatures/DancingScript-Regular.ttf",
  friendly: "/fonts/signatures/Satisfy-Regular.ttf",
  "bold-script": "/fonts/signatures/Pacifico-Regular.ttf",
};

let cached: Promise<Partial<Record<PageInkSignatureStyle, Uint8Array>>> | null = null;

async function loadOne(style: PageInkSignatureStyle): Promise<Uint8Array> {
  const response = await fetch(SIGNATURE_FONT_URLS[style]);
  if (!response.ok) {
    throw new Error(`Could not load signature font (${style})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/** Warm the script faces so the composer and overlay never flash a fallback font. */
export function preloadSignatureFonts(): void {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }
  for (const style of PAGEINK_SIGNATURE_STYLES) {
    void document.fonts.load(`32px "${SIGNATURE_FONT_FAMILIES[style.id]}"`);
  }
}

/**
 * Load the script faces used to stamp typed signatures into the PDF.
 * Cached for the lifetime of the tab so repeat downloads stay instant.
 */
export function loadSignatureFontBytes(
  styles: PageInkSignatureStyle[],
): Promise<Partial<Record<PageInkSignatureStyle, Uint8Array>>> {
  const unique = [...new Set(styles)];
  if (!cached) {
    cached = (async () => {
      const entries = await Promise.all(
        unique.map(async (style) => [style, await loadOne(style)] as const),
      );
      return Object.fromEntries(entries);
    })();
    return cached;
  }
  return cached.then(async (already) => {
    const missing = unique.filter((style) => !already[style]);
    if (missing.length === 0) {
      return already;
    }
    const extra = await Promise.all(
      missing.map(async (style) => [style, await loadOne(style)] as const),
    );
    const merged = { ...already, ...Object.fromEntries(extra) };
    cached = Promise.resolve(merged);
    return merged;
  });
}
