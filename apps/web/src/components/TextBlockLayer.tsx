import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { TextBlock } from "@korykaai/pageink-core";

interface TextBlockLayerProps {
  blocks: TextBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void;
}

type DragMode = "move" | "resize" | null;

export function TextBlockLayer({
  blocks,
  selectedId,
  onSelect,
  onUpdateBlock,
}: TextBlockLayerProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  const endDrag = useCallback(() => {
    setDragMode(null);
    dragState.current = null;
  }, []);

  useEffect(() => {
    const onPointerUp = () => endDrag();
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [endDrag]);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag) {
        return;
      }

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (dragMode === "move") {
        onUpdateBlock(drag.id, {
          x: Math.max(0, drag.originX + dx),
          y: Math.max(0, drag.originY + dy),
        });
        return;
      }

      if (dragMode === "resize") {
        onUpdateBlock(drag.id, {
          width: Math.max(80, drag.originWidth + dx),
          height: Math.max(24, drag.originHeight + dy),
        });
      }
    },
    [dragMode, onUpdateBlock],
  );

  const startDrag = (
    event: PointerEvent<HTMLElement>,
    block: TextBlock,
    mode: DragMode,
  ) => {
    event.stopPropagation();
    onSelect(block.id);
    setDragMode(mode);
    dragState.current = {
      id: block.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: block.x,
      originY: block.y,
      originWidth: block.width,
      originHeight: block.height,
    };
  };

  return (
    <div className="text-layer" onPointerMove={onPointerMove}>
      {blocks.map((block) => {
        const selected = block.id === selectedId;
        return (
          <div
            key={block.id}
            className={`text-block${selected ? " text-block--selected" : ""}`}
            style={{
              left: block.x,
              top: block.y,
              width: block.width,
              minHeight: block.height,
              color: block.style.color,
              fontFamily: block.style.fontFamily,
              fontSize: block.style.fontSize,
              fontWeight: block.style.bold ? 700 : 400,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(block.id);
            }}
          >
            <div
              className="text-block__handle"
              onPointerDown={(event) => startDrag(event, block, "move")}
            />
            <textarea
              className="text-block__input"
              value={block.text}
              rows={Math.max(1, Math.ceil(block.text.length / 24))}
              onChange={(event) =>
                onUpdateBlock(block.id, { text: event.target.value })
              }
              onPointerDown={(event) => event.stopPropagation()}
            />
            {selected ? (
              <button
                type="button"
                className="text-block__resize"
                aria-label="Resize text box"
                onPointerDown={(event) => startDrag(event, block, "resize")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
