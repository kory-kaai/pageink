import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fontkitModule from "@pdf-lib/fontkit";
import { hexToRgb } from "./coords.js";
import { isSignatureAnnotation } from "./types.js";
import { getWhiteoutRect, isAnnotationModified } from "./whiteout.js";
import type { PageInkFontFamily, PageInkSignatureStyle, TextAnnotation } from "./types.js";

type PdfFontkit = Parameters<PDFDocument["registerFontkit"]>[0];

function hasCreate(value: unknown): value is PdfFontkit {
  return typeof value === "object" && value !== null && typeof (value as { create?: unknown }).create === "function";
}

/**
 * @pdf-lib/fontkit is a default export at runtime, but webpack/Node interop
 * sometimes unwraps it. Accept either shape so signature embedding works in
 * the browser and in tests.
 */
function resolveFontkit(): PdfFontkit {
  if (hasCreate(fontkitModule)) {
    return fontkitModule;
  }
  const nested = (fontkitModule as { default?: unknown }).default;
  if (hasCreate(nested)) {
    return nested;
  }
  throw new Error("Could not load fontkit for signature fonts");
}

function standardFont(family: PageInkFontFamily, bold: boolean) {
  switch (family) {
    case "times":
      return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
    case "courier":
      return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
    case "helvetica":
      return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
    default: {
      const exhaustive: never = family;
      return exhaustive;
    }
  }
}

function drawWhiteout(
  page: ReturnType<PDFDocument["getPages"]>[number],
  rect: { x: number; y: number; width: number; height: number },
) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const x = rect.x * pageWidth;
  const boxWidth = rect.width * pageWidth;
  const boxHeight = rect.height * pageHeight;
  const y = pageHeight - rect.y * pageHeight - boxHeight;

  page.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
}

export async function exportPdfWithAnnotations(input: {
  pdfBytes: Uint8Array;
  annotations: TextAnnotation[];
  /** TrueType bytes for typed signatures, keyed by style id. */
  customFonts?: Partial<Record<PageInkSignatureStyle, Uint8Array>>;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(input.pdfBytes);
  const needsCustomFonts = input.annotations.some(isSignatureAnnotation);
  if (needsCustomFonts) {
    pdfDoc.registerFontkit(resolveFontkit());
  }
  const pages = pdfDoc.getPages();
  const fontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();

  async function getStandardFont(family: PageInkFontFamily, bold: boolean) {
    const key = `${family}-${bold}`;
    const cached = fontCache.get(key);
    if (cached) {
      return cached;
    }
    const font = await pdfDoc.embedFont(standardFont(family, bold));
    fontCache.set(key, font);
    return font;
  }

  async function getSignatureFont(style: PageInkSignatureStyle) {
    const key = `signature-${style}`;
    const cached = fontCache.get(key);
    if (cached) {
      return cached;
    }
    const bytes = input.customFonts?.[style];
    if (!bytes) {
      throw new Error(`Missing signature font: ${style}`);
    }
    // Subsetting uses Node streams inside fontkit and fails in the browser.
    const font = await pdfDoc.embedFont(bytes, { subset: false });
    fontCache.set(key, font);
    return font;
  }

  async function fontFor(annotation: TextAnnotation) {
    if (isSignatureAnnotation(annotation)) {
      return getSignatureFont(annotation.signatureStyle ?? "formal");
    }
    return getStandardFont(annotation.fontFamily, annotation.bold);
  }

  for (const ann of input.annotations) {
    const page = pages[ann.pageIndex];
    if (!page) {
      continue;
    }

    // Untouched PDF text is left exactly as the original file drew it.
    if (!isAnnotationModified(ann)) {
      continue;
    }

    const whiteout = getWhiteoutRect(ann);
    if (whiteout) {
      drawWhiteout(page, whiteout);
    }

    if (!ann.text.trim()) {
      continue;
    }

    const { width, height } = page.getSize();
    const font = await fontFor(ann);
    const { r, g, b } = hexToRgb(ann.color);
    const x = ann.x * width;
    // Annotation y is the top of the em box, but drawText positions the baseline.
    const ascent = font.heightAtSize(ann.fontSize, { descender: false });
    const y = height - ann.y * height - ascent;

    page.drawText(ann.text, {
      x,
      y,
      size: ann.fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  return pdfDoc.save();
}
