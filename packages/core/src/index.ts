export { clampNorm, hexToRgb } from "./coords.js";
export { guessBold, guessFontFamily } from "./font-guess.js";
export { newAnnotationId } from "./id.js";
export { annotationsOnSameLine } from "./line-group.js";
export { exportPdfWithAnnotations } from "./pdf-export.js";
export {
  createWhiteoutForAnnotation,
  getPageWhiteoutRects,
  getWhiteoutRect,
  isAnnotationModified,
  withUpdatedWhiteout,
} from "./whiteout.js";
export {
  PAGEINK_COLOR_PRESETS,
  PAGEINK_DEFAULT_COLOR,
  PAGEINK_DEFAULT_FONT_SIZE,
  PAGEINK_DEFAULT_SIGNATURE_SIZE,
  PAGEINK_DEFAULT_SIGNATURE_STYLE,
  PAGEINK_DEFAULT_TEXT,
  PAGEINK_FONT_OPTIONS,
  PAGEINK_SIGNATURE_STYLES,
  isSignatureAnnotation,
  type AnnotationKind,
  type AnnotationSource,
  type PageInkEditorState,
  type PageInkFontFamily,
  type PageInkSignatureStyle,
  type TextAnnotation,
  type WhiteoutRect,
} from "./types.js";
