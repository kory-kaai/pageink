export { clampNorm, hexToRgb } from "./coords.js";
export { guessBold, guessFontFamily } from "./font-guess.js";
export { newAnnotationId } from "./id.js";
export { exportPdfWithAnnotations } from "./pdf-export.js";
export { createWhiteoutForAnnotation, getPageWhiteoutRects, getWhiteoutRect, withUpdatedWhiteout } from "./whiteout.js";
export {
  PAGEINK_COLOR_PRESETS,
  PAGEINK_DEFAULT_COLOR,
  PAGEINK_DEFAULT_FONT_SIZE,
  PAGEINK_DEFAULT_TEXT,
  PAGEINK_FONT_OPTIONS,
  type AnnotationSource,
  type PageInkEditorState,
  type PageInkFontFamily,
  type TextAnnotation,
  type WhiteoutRect,
} from "./types.js";
