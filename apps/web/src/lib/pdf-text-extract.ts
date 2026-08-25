import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  PAGEINK_DEFAULT_COLOR,
  clampNorm,
  createWhiteoutForAnnotation,
  guessBold,
  guessFontFamily,
  newAnnotationId,
  type TextAnnotation,
} from "@korykaai/pageink-core";

type RawTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
};

function mergeLineItems(items: RawTextItem[]): RawTextItem[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: RawTextItem[][] = [];

  for (const item of sorted) {
    const line = lines.find(
      (group) => Math.abs(group[0].y - item.y) < item.height * 0.6,
    );
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((line) => {
      line.sort((a, b) => a.x - b.x);
      const first = line[0];
      const last = line[line.length - 1];
      if (!first || !last) {
        return null;
      }

      return {
        str: line
          .map((part) => part.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
        x: first.x,
        y: Math.min(...line.map((part) => part.y)),
        width: last.x + last.width - first.x,
        height: Math.max(...line.map((part) => part.height)),
        fontSize: first.fontSize,
        fontName: first.fontName,
      } satisfies RawTextItem;
    })
    .filter((item): item is RawTextItem => item !== null && item.str.length > 0);
}

function buildWhiteout(
  normX: number,
  normY: number,
  normW: number,
  normH: number,
) {
  return createWhiteoutForAnnotation({
    x: normX,
    y: normY,
    width: normW,
    height: normH,
  });
}

export async function extractTextAnnotations(
  doc: PDFDocumentProxy,
): Promise<TextAnnotation[]> {
  const pdfjs = await import("pdfjs-dist");
  const annotations: TextAnnotation[] = [];

  for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const rawItems: RawTextItem[] = [];

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }

      const transform = pdfjs.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(transform[2], transform[3]);
      const x = transform[4];
      const y = transform[5] - fontHeight;

      rawItems.push({
        str: item.str,
        x,
        y,
        width: item.width,
        height: fontHeight,
        fontSize: fontHeight,
        fontName: item.fontName,
      });
    }

    for (const item of mergeLineItems(rawItems)) {
      const normX = clampNorm(item.x / viewport.width);
      const normY = clampNorm(item.y / viewport.height);
      const normW = clampNorm(item.width / viewport.width);
      const normH = clampNorm(item.height / viewport.height);

      annotations.push({
        id: newAnnotationId(),
        pageIndex,
        source: "extracted",
        x: normX,
        y: normY,
        width: normW,
        height: normH,
        text: item.str,
        originalText: item.str,
        fontSize: Math.max(6, Math.round(item.fontSize)),
        color: PAGEINK_DEFAULT_COLOR,
        fontFamily: guessFontFamily(item.fontName),
        bold: guessBold(item.fontName),
        whiteout: buildWhiteout(normX, normY, normW, normH),
      });
    }
  }

  return annotations;
}
