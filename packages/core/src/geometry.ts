export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapToGrid(value: number, grid = 4): number {
  return Math.round(value / grid) * grid;
}

export function canvasYToPdfY(
  canvasY: number,
  fontSize: number,
  pageHeight: number,
): number {
  return pageHeight - canvasY - fontSize;
}

export function pdfYToCanvasY(
  pdfY: number,
  fontSize: number,
  pageHeight: number,
): number {
  return pageHeight - pdfY - fontSize;
}
