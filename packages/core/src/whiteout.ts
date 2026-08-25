import type { TextAnnotation, WhiteoutRect } from "./types.js";

const WHITEOUT_PAD_X = 0.008;
const WHITEOUT_PAD_Y = 0.006;

export function createWhiteoutForAnnotation(
  annotation: Pick<TextAnnotation, "x" | "y" | "width" | "height">,
): WhiteoutRect {
  const width = annotation.width ?? 0.2;
  const height = annotation.height ?? 0.03;

  return {
    x: Math.max(0, annotation.x - WHITEOUT_PAD_X),
    y: Math.max(0, annotation.y - WHITEOUT_PAD_Y),
    width: Math.min(1 - Math.max(0, annotation.x - WHITEOUT_PAD_X), width + WHITEOUT_PAD_X * 2),
    height: Math.min(1 - Math.max(0, annotation.y - WHITEOUT_PAD_Y), height + WHITEOUT_PAD_Y * 2),
  };
}

export function withUpdatedWhiteout(annotation: TextAnnotation): TextAnnotation {
  if (annotation.source !== "extracted") {
    return annotation;
  }
  return {
    ...annotation,
    whiteout: createWhiteoutForAnnotation(annotation),
  };
}

export function getWhiteoutRect(annotation: TextAnnotation): WhiteoutRect | null {
  if (annotation.whiteout) {
    return annotation.whiteout;
  }
  if (annotation.source !== "extracted") {
    return null;
  }
  if (annotation.width === undefined || annotation.height === undefined) {
    return null;
  }
  return {
    x: annotation.x,
    y: annotation.y,
    width: annotation.width,
    height: annotation.height,
  };
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
