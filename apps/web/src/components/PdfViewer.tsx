"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import type { TextBlock } from "@korykaai/pageink-core";
import { getPdfjs } from "@/lib/pdfjs";
import { TextBlockLayer } from "@/components/TextBlockLayer";

interface PdfViewerProps {
  pdfBytes: Uint8Array;
  blocks: TextBlock[];
  pageIndex: number;
  selectedId: string | null;
  onPageChange: (pageIndex: number) => void;
  onSelect: (id: string | null) => void;
  onAddText: (x: number, y: number) => void;
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void;
}

export function PdfViewer({
  pdfBytes,
  blocks,
  pageIndex,
  selectedId,
  onPageChange,
  onSelect,
  onAddText,
  onUpdateBlock,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const pdfjs = await getPdfjs();
      const task = pdfjs.getDocument({ data: pdfBytes.slice() });
      const pdf = await task.promise;

      if (cancelled) {
        await task.destroy();
        return;
      }

      setPageCount(pdf.numPages);
      if (pageIndex >= pdf.numPages) {
        onPageChange(pdf.numPages - 1);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [onPageChange, pageIndex, pdfBytes]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    setLoading(true);

    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const pdfjs = await getPdfjs();
      const pdf = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
      if (cancelled) {
        return;
      }

      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ width: viewport.width, height: viewport.height });

      renderTask = page.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
      if (!cancelled) {
        setLoading(false);
      }
    };

    void render().catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageIndex, pdfBytes, scale]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest(".text-block")) {
        return;
      }
      const bounds = pageRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      onSelect(null);
      onAddText(event.clientX - bounds.left, event.clientY - bounds.top);
    },
    [onAddText, onSelect],
  );

  const pageBlocks = blocks.filter((block) => block.pageIndex === pageIndex);

  return (
    <section className="viewer">
      <div className="viewer-controls">
        <button
          type="button"
          className="button"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          Previous
        </button>
        <span>
          Page {pageIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          className="button"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Next
        </button>
        <label className="zoom-control">
          Zoom
          <input
            type="range"
            min="0.8"
            max="2"
            step="0.1"
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="viewer-stage">
        <div
          ref={pageRef}
          className="viewer-page"
          style={{ width: pageSize.width, height: pageSize.height }}
          onClick={handleCanvasClick}
        >
          <canvas ref={canvasRef} className="viewer-canvas" />
          {loading ? <div className="viewer-loading">Rendering page…</div> : null}
          <TextBlockLayer
            blocks={pageBlocks}
            selectedId={selectedId}
            onSelect={onSelect}
            onUpdateBlock={onUpdateBlock}
          />
        </div>
      </div>
    </section>
  );
}
