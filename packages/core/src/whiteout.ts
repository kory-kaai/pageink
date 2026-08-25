import type { TextAnnotation, WhiteoutRect } from "./types.js";

/**
 * Just enough bleed to swallow anti-aliased glyph edges. Kept tight, and scaled
 * to the block's own height rather than the page, so covering one run never
 * erases the neighbouring run on the same line.
 */
const WHITEOUT_BLEED_X = 0.0015;
const WHITEOUT_BLEED_Y_RATIO = 0.16;

export function createWhiteoutForAnnotation(
  annotation: Pick<TextAnnotation, "x" | "y" | "width" | "height">,
): WhiteoutRect {
  const width = annotation.width ?? 0.2;
  const height = annotation.height ?? 0.03;
  const padY = height * WHITEOUT_BLEED_Y_RATIO;

  const x = Math.max(0, annotation.x - WHITEOUT_BLEED_X);
  const y = Math.max(0, annotation.y - padY);

  return {
    x,
    y,
    width: Math.min(1 - x, width + WHITEOUT_BLEED_X * 2),
    height: Math.min(1 - y, height + padY * 2),
  };
}

export function withUpdatedWhiteout(annotation: TextAnnotation): TextAnnotation {
  if (annotation.source !== "extracted") {
    return annotation;
  }
  return {
    ...annotation,
    modified: true,
    whiteout: createWhiteoutForAnnotation(annotation),
  };
}

/** Extracted text counts as modified once its content or placement changed. */
export function isAnnotationModified(annotation: TextAnnotation): boolean {
  if (annotation.source !== "extracted") {
    return true;
  }
  return annotation.modified === true || annotation.text !== annotation.originalText;
}

export function getWhiteoutRect(annotation: TextAnnotation): WhiteoutRect | null {
  if (annotation.source !== "extracted") {
    return null;
  }
  if (!isAnnotationModified(annotation)) {
    return null;
  }
  if (annotation.whiteout) {
    return annotation.whiteout;
  }
  if (annotation.width === undefined || annotation.height === undefined) {
    return null;
  }
  return createWhiteoutForAnnotation(annotation);
}

export function getPageWhiteoutRects(
  annotations: TextAnnotation[],
  pageIndex: number,
): WhiteoutRect[] {
  return annotations
    .filter((annotation) => annotation.pageIndex === pageIndex)
    .map(getWhiteoutRect)
    .filter((rect): rect is WhiteoutRect => rect !== null);
}
