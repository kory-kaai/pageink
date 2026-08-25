import type { WhiteoutRect } from "@korykaai/pageink-core";

/** Above this luminance a box is assumed to hold no glyphs worth sampling. */
const BACKGROUND_LUMINANCE = 236;
/** Ignore pixels that are mostly transparent, they carry no reliable color. */
const MIN_ALPHA = 200;

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * PDF.js text content exposes position and font but not fill color, so read the
 * color back off the rendered page instead. The darkest opaque pixel inside a
 * run is its glyph core; anti-aliased edges blend toward the background, so
 * taking the minimum luminance recovers the author's original color.
 *
 * Returns null when the box holds no discernible glyphs, so the caller can keep
 * whatever color it already had rather than guessing.
 */
export function sampleTextColor(
  canvas: HTMLCanvasElement,
  rect: WhiteoutRect,
): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    return null;
  }

  const left = Math.max(0, Math.floor(rect.x * canvas.width));
  const top = Math.max(0, Math.floor(rect.y * canvas.height));
  const right = Math.min(canvas.width, Math.ceil((rect.x + rect.width) * canvas.width));
  const bottom = Math.min(canvas.height, Math.ceil((rect.y + rect.height) * canvas.height));
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(left, top, width, height).data;
  } catch {
    return null;
  }

  let darkest: [number, number, number] | null = null;
  let darkestLuminance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) {
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = luminance(r, g, b);
    if (lum < darkestLuminance) {
      darkestLuminance = lum;
      darkest = [r, g, b];
    }
  }

  if (!darkest || darkestLuminance > BACKGROUND_LUMINANCE) {
    return null;
  }

  return toHex(darkest[0], darkest[1], darkest[2]);
}
