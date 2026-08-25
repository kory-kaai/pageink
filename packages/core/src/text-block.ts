import { DEFAULT_TEXT_STYLE, type TextBlock, type TextBlockStyle } from "./types.js";

let nextId = 1;

export function createTextBlockId(): string {
  const id = `block-${nextId}`;
  nextId += 1;
  return id;
}

export function resetTextBlockIdCounter(): void {
  nextId = 1;
}

export function createTextBlock(
  partial: Pick<TextBlock, "pageIndex" | "x" | "y"> &
    Partial<Pick<TextBlock, "width" | "height" | "text" | "style">>,
): TextBlock {
  return {
    id: createTextBlockId(),
    width: partial.width ?? 200,
    height: partial.height ?? 32,
    text: partial.text ?? "New text",
    style: partial.style ?? { ...DEFAULT_TEXT_STYLE },
    pageIndex: partial.pageIndex,
    x: partial.x,
    y: partial.y,
  };
}

export function updateTextBlock(
  blocks: TextBlock[],
  id: string,
  patch: Partial<Omit<TextBlock, "id">>,
): TextBlock[] {
  return blocks.map((block) =>
    block.id === id ? { ...block, ...patch, style: patch.style ?? block.style } : block,
  );
}

export function removeTextBlock(blocks: TextBlock[], id: string): TextBlock[] {
  return blocks.filter((block) => block.id !== id);
}

export function duplicateTextBlock(
  blocks: TextBlock[],
  id: string,
  offset = 12,
): TextBlock[] {
  const source = blocks.find((block) => block.id === id);
  if (!source) {
    return blocks;
  }

  const copy: TextBlock = {
    ...source,
    id: createTextBlockId(),
    x: source.x + offset,
    y: source.y + offset,
    style: { ...source.style },
  };

  return [...blocks, copy];
}

export function mergeTextBlockStyle(
  style: TextBlockStyle,
  patch: Partial<TextBlockStyle>,
): TextBlockStyle {
  return { ...style, ...patch };
}
