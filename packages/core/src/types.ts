export type PageInkFontFamily = "helvetica" | "times" | "courier";

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
