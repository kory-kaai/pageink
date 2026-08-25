import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hexToRgb } from "./coords.js";
import type { PageInkFontFamily, TextAnnotation } from "./types.js";

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

export async function exportPdfWithAnnotations(input: {
  pdfBytes: Uint8Array;
  annotations: TextAnnotation[];
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(input.pdfBytes);
  const pages = pdfDoc.getPages();
  const fontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();

  async function getFont(family: PageInkFontFamily, bold: boolean) {
    const key = `${family}-${bold}`;
    const cached = fontCache.get(key);
    if (cached) {
      return cached;
    }
    const font = await pdfDoc.embedFont(standardFont(family, bold));
    fontCache.set(key, font);
    return font;
  }

  for (const ann of input.annotations) {
    if (!ann.text.trim()) {
      continue;
    }
    const page = pages[ann.pageIndex];
    if (!page) {
      continue;
    }

    const { width, height } = page.getSize();
    const font = await getFont(ann.fontFamily, ann.bold);
    const { r, g, b } = hexToRgb(ann.color);
    const x = ann.x * width;
    const y = height - ann.y * height - ann.fontSize;

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
