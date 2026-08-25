export type PageInkFontFamily = "helvetica" | "times" | "courier";

export type PageInkSignatureStyle = "formal" | "elegant" | "casual" | "friendly" | "bold-script";

export type AnnotationSource = "extracted" | "added";

export type AnnotationKind = "text" | "signature";

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
  /** Distinguishes typed signatures from ordinary overlay text. */
  kind?: AnnotationKind;
  /** Script face used when kind is signature. */
  signatureStyle?: PageInkSignatureStyle;
  /** Original PDF text when source is extracted. */
  originalText?: string;
  /**
   * PDF.js internal font key (e.g. "g_d0_f3") for extracted blocks. The real font
   * name (and thus weight/family) is only known once the page renders and the font
   * lands in commonObjs, so this key lets a post-render pass recover it. Not used
   * on export.
   */
  sourceFontKey?: string;
  /**
   * Extracted blocks only cover the original glyphs once the user changes them.
   * Until then the untouched PDF rendering stays visible.
   */
  modified?: boolean;
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
export const PAGEINK_DEFAULT_SIGNATURE_STYLE: PageInkSignatureStyle = "formal";
export const PAGEINK_DEFAULT_SIGNATURE_SIZE = 28;

export const PAGEINK_FONT_OPTIONS: { id: PageInkFontFamily; label: string }[] = [
  { id: "helvetica", label: "Helvetica" },
  { id: "times", label: "Times" },
  { id: "courier", label: "Courier" },
];

export const PAGEINK_SIGNATURE_STYLES: {
  id: PageInkSignatureStyle;
  label: string;
  description: string;
}[] = [
  { id: "formal", label: "Formal", description: "Classic pointed script" },
  { id: "elegant", label: "Elegant", description: "Fine calligraphy" },
  { id: "casual", label: "Casual", description: "Everyday handwriting" },
  { id: "friendly", label: "Friendly", description: "Warm rounded script" },
  { id: "bold-script", label: "Bold", description: "Heavy brush script" },
];

export const PAGEINK_COLOR_PRESETS = [
  "#111827",
  "#006039",
  "#1d4ed8",
  "#b91c1c",
  "#7c3aed",
  "#ffffff",
] as const;

export function isSignatureAnnotation(annotation: Pick<TextAnnotation, "kind">): boolean {
  return annotation.kind === "signature";
}
