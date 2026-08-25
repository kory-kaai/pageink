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

/** Widest horizontal gap, relative to font size, still treated as one run. */
const RUN_GAP_RATIO = 0.4;
/** Gap wide enough to imply a space character that carries no glyph. */
const SPACE_GAP_RATIO = 0.12;

function groupIntoLines(items: RawTextItem[]): RawTextItem[][] {
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

  return lines;
}

/**
 * A block is only editable as a unit if every glyph in it shares one style, so a
 * line is split wherever the font, the size, or the spacing changes. This keeps
 * a bold label and the regular value beside it as separate, individually
 * clickable blocks instead of collapsing both into the label's formatting.
 */
function splitLineIntoRuns(line: RawTextItem[]): RawTextItem[] {
  const sorted = [...line].sort((a, b) => a.x - b.x);
  const runs: RawTextItem[][] = [];
  let current: RawTextItem[] = [];

  for (const item of sorted) {
    const prev = current[current.length - 1];
    const startsNewRun =
      prev !== undefined &&
      (item.fontName !== prev.fontName ||
        Math.abs(item.fontSize - prev.fontSize) > 0.6 ||
        item.x - (prev.x + prev.width) > prev.fontSize * RUN_GAP_RATIO);

    if (startsNewRun) {
      runs.push(current);
      current = [];
    }
    current.push(item);
  }

  if (current.length > 0) {
    runs.push(current);
  }

  return runs
    .map(joinRun)
    .filter((item): item is RawTextItem => item !== null);
}

function joinRun(run: RawTextItem[]): RawTextItem | null {
  const first = run[0];
  const last = run[run.length - 1];
  if (!first || !last) {
    return null;
  }

  let str = first.str;
  for (let i = 1; i < run.length; i += 1) {
    const prev = run[i - 1];
    const item = run[i];
    const gap = item.x - (prev.x + prev.width);
    const needsSpace =
      gap > prev.fontSize * SPACE_GAP_RATIO &&
      !/\s$/.test(str) &&
      !/^\s/.test(item.str);
    str += needsSpace ? ` ${item.str}` : item.str;
  }

  str = str.replace(/\s+/g, " ").trim();
  if (str.length === 0) {
    return null;
  }

  return {
    str,
    x: first.x,
    y: Math.min(...run.map((part) => part.y)),
    width: last.x + last.width - first.x,
    height: Math.max(...run.map((part) => part.height)),
    fontSize: first.fontSize,
    fontName: first.fontName,
  } satisfies RawTextItem;
}

function extractRuns(items: RawTextItem[]): RawTextItem[] {
  return groupIntoLines(items).flatMap(splitLineIntoRuns);
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

    for (const item of extractRuns(rawItems)) {
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
