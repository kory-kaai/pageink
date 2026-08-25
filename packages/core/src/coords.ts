/** Parse #rrggbb to 0–1 RGB for pdf-lib. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16) / 255;
    const g = parseInt(normalized[1] + normalized[1], 16) / 255;
    const b = parseInt(normalized[2] + normalized[2], 16) / 255;
    return { r, g, b };
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return { r, g, b };
}

/** Clamp normalized coordinate to page bounds. */
export function clampNorm(value: number): number {
  return Math.min(1, Math.max(0, value));
}
