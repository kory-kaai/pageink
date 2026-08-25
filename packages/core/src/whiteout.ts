import type { TextAnnotation, WhiteoutRect } from "./types.js";

/**
 * Horizontal bleed stays tight so covering one run never erases its neighbour
 * on the same line. Vertical bleed has to reach below the baseline: PDF.js
 * boxes stop at the em square, but descenders (g, y, p, q, j, commas) and
 * underscore rules paint below it, and those leftover specks read as black dots.
 */
const WHITEOUT_BLEED_X = 0.0015;
const WHITEOUT_BLEED_Y_RATIO = 0.16;
const WHITEOUT_DESCENDER_BLEED_Y_RATIO = 0.5;
/** Underscores sit on the baseline as a thick stroke and need extra cover. */
const WHITEOUT_RULE_BLEED_Y_RATIO = 0.55;
/** Extra page-space below the box so anti-aliased specks are not left behind. */
const WHITEOUT_BLEED_Y_ABS = 0.004;

function isRuleText(text: string | undefined): boolean {
  return typeof text === "string" && /[_⎯─—–-]{3,}/.test(text);
}

function bottomBleed(height: number, text: string | undefined): number {
  return height * (isRuleText(text) ? WHITEOUT_RULE_BLEED_Y_RATIO : WHITEOUT_DESCENDER_BLEED_Y_RATIO) + WHITEOUT_BLEED_Y_ABS;
}

export function createWhiteoutForAnnotation(
  annotation: Pick<TextAnnotation, "x" | "y" | "width" | "height" | "text" | "originalText">,
): WhiteoutRect {
  const width = annotation.width ?? 0.2;
  const height = annotation.height ?? 0.03;
  const padTop = height * WHITEOUT_BLEED_Y_RATIO;
  const padBottom = bottomBleed(height, annotation.originalText ?? annotation.text);

  const x = Math.max(0, annotation.x - WHITEOUT_BLEED_X);
  const y = Math.max(0, annotation.y - padTop);

  return {
    x,
    y,
    width: Math.min(1 - x, width + WHITEOUT_BLEED_X * 2),
    height: Math.min(1 - y, height + padTop + padBottom),
  };
}

/**
 * Grow an already-anchored cover downward so descenders are included, without
 * moving it to the block's current (possibly dragged) position.
 */
function expandWhiteoutForDescenders(
  rect: WhiteoutRect,
  annotation: Pick<TextAnnotation, "height" | "text" | "originalText">,
): WhiteoutRect {
  const height = annotation.height ?? 0.03;
  const needed =
    height + height * WHITEOUT_BLEED_Y_RATIO + bottomBleed(height, annotation.originalText ?? annotation.text);
  if (rect.height >= needed - 1e-6) {
    return rect;
  }
  return {
    ...rect,
    height: Math.min(1 - rect.y, needed),
  };
}

export function withUpdatedWhiteout(annotation: TextAnnotation): TextAnnotation {
  if (annotation.source !== "extracted") {
    return annotation;
  }
  const anchored = annotation.whiteout ?? createWhiteoutForAnnotation(annotation);
  return {
    ...annotation,
    modified: true,
    /*
     * The cover has to stay on the glyphs baked into the page, and those never
     * move. Recomputing it from the block's current position would drag the cover
     * along with the block, leaving the original text visible where it started.
     * The rect captured at extraction is that original location, so keep it —
     * only expand downward if the original cover was too short for descenders.
     */
    whiteout: expandWhiteoutForDescenders(anchored, annotation),
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
    return expandWhiteoutForDescenders(annotation.whiteout, annotation);
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
