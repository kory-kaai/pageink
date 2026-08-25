import type { TextAnnotation } from "./types.js";

/**
 * Runs on the same baseline are extracted separately when their font or weight
 * differs (a bold label beside a regular value, or a label beside a signature
 * rule). Editing still targets one run, but a drag should take the whole visual
 * line so the rule does not leave its label behind.
 *
 * Newly added boxes are never grouped: they are not part of the original line,
 * so dragging one must not pick up neighbouring PDF text.
 */
export function annotationsOnSameLine(
  annotation: Pick<TextAnnotation, "id" | "pageIndex" | "y" | "height" | "source">,
  annotations: TextAnnotation[],
): TextAnnotation[] {
  if (annotation.source !== "extracted") {
    return annotations.filter((other) => other.id === annotation.id);
  }

  const height = annotation.height ?? 0.03;

  return annotations.filter((other) => {
    if (other.id === annotation.id) {
      return true;
    }
    if (other.source !== "extracted" || other.pageIndex !== annotation.pageIndex) {
      return false;
    }
    const otherHeight = other.height ?? 0.03;
    return Math.abs(other.y - annotation.y) < Math.max(height, otherHeight) * 0.6;
  });
}
