export type PdfFontFamily = "Helvetica" | "TimesRoman" | "Courier";

export interface TextBlockStyle {
  fontFamily: PdfFontFamily;
  fontSize: number;
  color: string;
  bold: boolean;
}

export interface TextBlock {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: TextBlockStyle;
}

export interface PageinkDocument {
  blocks: TextBlock[];
}

export const DEFAULT_TEXT_STYLE: TextBlockStyle = {
  fontFamily: "Helvetica",
  fontSize: 14,
  color: "#111827",
  bold: false,
};

export const FONT_FAMILIES: readonly PdfFontFamily[] = [
  "Helvetica",
  "TimesRoman",
  "Courier",
] as const;

export const PRESET_COLORS = [
  "#111827",
  "#1d4ed8",
  "#dc2626",
  "#15803d",
  "#7c3aed",
  "#ffffff",
] as const;
