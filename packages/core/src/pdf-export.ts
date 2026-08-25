import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hexToRgb } from "./coords.js";
import { getWhiteoutRect } from "./whiteout.js";
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
    const page = pages[ann.pageIndex];
    if (!page) {
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
