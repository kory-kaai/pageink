import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { canvasYToPdfY, hexToRgb } from "./geometry.js";
import type { PdfFontFamily, TextBlock } from "./types.js";

function standardFontName(
  family: PdfFontFamily,
  bold: boolean,
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  switch (family) {
    case "TimesRoman":
      return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
    case "Courier":
      return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
    case "Helvetica":
      return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
    default: {
      const exhaustive: never = family;
      return exhaustive;
    }
  }
}

export async function exportPdfWithText(
  pdfBytes: Uint8Array,
  blocks: TextBlock[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const fontCache = new Map<string, PDFFont>();

  for (const block of blocks) {
    const page = pages[block.pageIndex];
    if (!page || !block.text.trim()) {
      continue;
    }

    const fontKey = `${block.style.fontFamily}-${block.style.bold}`;
    let font = fontCache.get(fontKey);
    if (!font) {
      font = await pdfDoc.embedFont(
        standardFontName(block.style.fontFamily, block.style.bold),
      );
      fontCache.set(fontKey, font);
    }

    const { height: pageHeight } = page.getSize();
    const { r, g, b } = hexToRgb(block.style.color);

    page.drawText(block.text, {
      x: block.x,
      y: canvasYToPdfY(block.y, block.style.fontSize, pageHeight),
      size: block.style.fontSize,
      font,
      color: rgb(r, g, b),
      maxWidth: block.width,
      lineHeight: block.style.fontSize * 1.2,
    });
  }

  return pdfDoc.save();
}

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}
