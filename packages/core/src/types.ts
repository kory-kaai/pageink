export type PageInkFontFamily = "helvetica" | "times" | "courier";

export type AnnotationSource = "extracted" | "added";

/** Normalized 0–1 rectangle used to cover original PDF glyphs. */
export type WhiteoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextAnnotation = {
  id: string;
  pageIndex: number;
  /** 0–1 from left edge of page */
  x: number;
  /** 0–1 from top edge of page */
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: PageInkFontFamily;
  bold: boolean;
  source: AnnotationSource;
  /** Original PDF text when source is extracted. */
  originalText?: string;
  /** Normalized width of the text box. */
  width?: number;
  /** Normalized height of the text box. */
  height?: number;
  /** Region to paint over before redraw on export and in the canvas preview. */
  whiteout?: WhiteoutRect;
};

export type PageInkEditorState = {
  annotations: TextAnnotation[];
};

export const PAGEINK_DEFAULT_FONT_SIZE = 14;
export const PAGEINK_DEFAULT_COLOR = "#111827";
export const PAGEINK_DEFAULT_TEXT = "Text";

export const PAGEINK_FONT_OPTIONS: { id: PageInkFontFamily; label: string }[] = [
  { id: "helvetica", label: "Helvetica" },
  { id: "times", label: "Times" },
  { id: "courier", label: "Courier" },
];

export const PAGEINK_COLOR_PRESETS = [
  "#111827",
  "#006039",
  "#1d4ed8",
  "#b91c1c",
  "#7c3aed",
  "#ffffff",
] as const;
