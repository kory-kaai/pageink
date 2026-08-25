"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  PAGEINK_COLOR_PRESETS,
  PAGEINK_DEFAULT_COLOR,
  PAGEINK_DEFAULT_FONT_SIZE,
  PAGEINK_DEFAULT_TEXT,
  PAGEINK_FONT_OPTIONS,
  clampNorm,
  exportPdfWithAnnotations,
  newAnnotationId,
  type TextAnnotation,
} from "@korykaai/pageink-core";
import { loadPdfDocument, renderPdfPage } from "@/lib/pdf-viewer";

type EditorMode = "select" | "add";

type DragState = {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const RENDER_SCALE = 1.35;

function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.replace(/\.pdf$/i, "") + "-edited.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PageInkEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState("document.pdf");
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("add");
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TextAnnotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const selected = useMemo(
    () => annotations.find((a) => a.id === selectedId) ?? null,
    [annotations, selectedId],
  );

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.pageIndex === pageIndex),
    [annotations, pageIndex],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const commitAnnotations = useCallback((next: TextAnnotation[]) => {
    setAnnotations(next);
    setHistoryIndex((idx) => {
      setHistory((prev) => [...prev.slice(0, idx + 1), next]);
      return idx + 1;
    });
  }, []);

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<TextAnnotation>) => {
      commitAnnotations(
        annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
    },
    [annotations, commitAnnotations],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      commitAnnotations(annotations.filter((a) => a.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [annotations, commitAnnotations, selectedId],
  );

  const undo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx <= 0) {
        return idx;
      }
      const nextIdx = idx - 1;
      setHistory((prev) => {
        setAnnotations(prev[nextIdx] ?? []);
        return prev;
      });
      setSelectedId(null);
      return nextIdx;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      setHistoryIndex((idx) => {
        if (idx >= prev.length - 1) {
          return idx;
        }
        const nextIdx = idx + 1;
        setAnnotations(prev[nextIdx] ?? []);
        setSelectedId(null);
        return nextIdx;
      });
      return prev;
    });
  }, []);

  const resetDocument = useCallback(() => {
    setPdfDoc((doc) => {
      void doc?.cleanup();
      return null;
    });
    setPdfBytes(null);
    setPageCount(0);
    setPageIndex(0);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setStatus(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Please choose a PDF file.");
      return;
    }
    setStatus("Loading PDF…");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await loadPdfDocument(buffer);
      setPdfDoc((prev) => {
        void prev?.cleanup();
        return doc;
      });
      setPdfBytes(bytes);
      setFileName(file.name);
      setPageCount(doc.numPages);
      setPageIndex(0);
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setSelectedId(null);
      setStatus(null);
    } catch {
      setStatus("Could not open this PDF. It may be encrypted or corrupted.");
    }
  }, []);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    setRendering(true);

    void (async () => {
      try {
        const rendered = await renderPdfPage({
          doc: pdfDoc,
          pageIndex,
          canvas: canvasRef.current!,
          scale: RENDER_SCALE,
        });
        if (cancelled) {
          return;
        }
        setStageSize({ width: rendered.cssWidth, height: rendered.cssHeight });
      } catch {
        if (!cancelled) {
          setStatus("Could not render this page.");
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex]);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        deleteAnnotation(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteAnnotation, redo, selectedId, undo]);

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void loadFile(file);
    }
    e.target.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void loadFile(file);
    }
  }

  function pointerToNorm(e: { clientX: number; clientY: number }) {
    const stage = stageRef.current;
    if (!stage || stageSize.width === 0) {
      return { x: 0, y: 0 };
    }
    const rect = stage.getBoundingClientRect();
    return {
      x: clampNorm((e.clientX - rect.left) / rect.width),
      y: clampNorm((e.clientY - rect.top) / rect.height),
    };
  }

  function onStageClick(e: MouseEvent<HTMLDivElement>) {
    if (mode !== "add" || !pdfDoc) {
      return;
    }
    if ((e.target as HTMLElement).closest(".pageink-annotation")) {
      return;
    }

    const { x, y } = pointerToNorm(e);
    const ann: TextAnnotation = {
      id: newAnnotationId(),
      pageIndex,
      x,
      y,
      text: PAGEINK_DEFAULT_TEXT,
      fontSize: PAGEINK_DEFAULT_FONT_SIZE,
      color: PAGEINK_DEFAULT_COLOR,
      fontFamily: "helvetica",
      bold: false,
    };
    commitAnnotations([...annotations, ann]);
    setSelectedId(ann.id);
    setMode("select");
  }

  function onAnnotationPointerDown(e: PointerEvent<HTMLDivElement>, ann: TextAnnotation) {
    e.stopPropagation();
    setSelectedId(ann.id);
    setMode("select");
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: ann.x,
      originY: ann.y,
    });
  }

  function onAnnotationPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag || drag.id !== selectedId) {
      return;
    }
    const stage = stageRef.current;
    if (!stage || stageSize.width === 0) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === drag.id
          ? { ...a, x: clampNorm(drag.originX + dx), y: clampNorm(drag.originY + dy) }
          : a,
      ),
    );
  }

  function onAnnotationPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!drag) {
      return;
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    commitAnnotations([...annotationsRef.current]);
    setDrag(null);
  }

  async function onExport() {
    if (!pdfBytes) {
      return;
    }
    setExporting(true);
    setStatus("Preparing download…");
    try {
      const out = await exportPdfWithAnnotations({ pdfBytes, annotations });
      downloadBytes(out, fileName);
      setStatus("Download started — your file never left this browser.");
    } catch {
      setStatus("Export failed. Try again or use a smaller PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="pageink">
      <header className="pageink-header">
        <div className="pageink-header__brand">
          <span className="pageink-header__logo" aria-hidden>
            ✒
          </span>
          <div>
            <h1 className="pageink-header__title">PageInk</h1>
            <p className="pageink-header__tagline">
              Add text to any PDF — private, in your browser.
            </p>
          </div>
        </div>
        <span className="pageink-header__badge">No upload · Open source</span>
      </header>

      {!pdfDoc ? (
        <div
          className="pageink-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="pageink-drop__glow" aria-hidden />
          <p className="pageink-drop__title">Drop a PDF here</p>
          <p className="pageink-drop__lead">
            Or choose a file — processing stays on your device.
          </p>
          <label className="pageink-btn pageink-btn--primary">
            Choose PDF
            <input type="file" accept="application/pdf,.pdf" onChange={onFileInput} hidden />
          </label>
          {status ? <p className="pageink-status pageink-status--error">{status}</p> : null}
        </div>
      ) : (
        <>
          <div className="pageink-toolbar" role="toolbar" aria-label="PDF editor tools">
            <div className="pageink-toolbar__group">
              <button
                type="button"
                className={`pageink-tool${mode === "add" ? " pageink-tool--active" : ""}`}
                onClick={() => setMode("add")}
              >
                + Add text
              </button>
              <button
                type="button"
                className={`pageink-tool${mode === "select" ? " pageink-tool--active" : ""}`}
                onClick={() => setMode("select")}
              >
                Select / move
              </button>
            </div>
            <div className="pageink-toolbar__group">
              <button type="button" className="pageink-tool" disabled={!canUndo} onClick={undo}>
                Undo
              </button>
              <button type="button" className="pageink-tool" disabled={!canRedo} onClick={redo}>
                Redo
              </button>
            </div>
            <div className="pageink-toolbar__group">
              <button
                type="button"
                className="pageink-tool"
                disabled={pageIndex <= 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <span className="pageink-toolbar__page">
                Page {pageIndex + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="pageink-tool"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next →
              </button>
            </div>
            <div className="pageink-toolbar__group pageink-toolbar__group--end">
              <button type="button" className="pageink-tool pageink-tool--ghost" onClick={resetDocument}>
                New file
              </button>
              <button
                type="button"
                className="pageink-btn pageink-btn--primary"
                disabled={exporting}
                onClick={() => void onExport()}
              >
                {exporting ? "Exporting…" : "Download PDF"}
              </button>
            </div>
          </div>

          <div className="pageink-workspace">
            <aside className="pageink-inspector" aria-label="Text properties">
              {selected ? (
                <>
                  <h2 className="pageink-inspector__title">Selected text</h2>
                  <label className="pageink-field">
                    Content
                    <input
                      className="pageink-input"
                      value={selected.text}
                      onChange={(e) => updateAnnotation(selected.id, { text: e.target.value })}
                    />
                  </label>
                  <label className="pageink-field">
                    Size (pt)
                    <input
                      className="pageink-input"
                      type="number"
                      min={6}
                      max={96}
                      value={selected.fontSize}
                      onChange={(e) =>
                        updateAnnotation(selected.id, {
                          fontSize: Number(e.target.value) || PAGEINK_DEFAULT_FONT_SIZE,
                        })
                      }
                    />
                  </label>
                  <label className="pageink-field">
                    Font
                    <select
                      className="pageink-input"
                      value={selected.fontFamily}
                      onChange={(e) =>
                        updateAnnotation(selected.id, {
                          fontFamily: e.target.value as TextAnnotation["fontFamily"],
                        })
                      }
                    >
                      {PAGEINK_FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pageink-field pageink-field--row">
                    <input
                      type="checkbox"
                      checked={selected.bold}
                      onChange={(e) => updateAnnotation(selected.id, { bold: e.target.checked })}
                    />
                    Bold
                  </label>
                  <div className="pageink-field">
                    <span className="pageink-field__label">Color</span>
                    <div className="pageink-swatches">
                      {PAGEINK_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`pageink-swatch${selected.color === color ? " pageink-swatch--active" : ""}`}
                          style={{ background: color }}
                          aria-label={`Color ${color}`}
                          onClick={() => updateAnnotation(selected.id, { color })}
                        />
                      ))}
                      <input
                        type="color"
                        className="pageink-color-input"
                        value={selected.color}
                        onChange={(e) => updateAnnotation(selected.id, { color: e.target.value })}
                        aria-label="Custom color"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pageink-tool pageink-tool--danger"
                    onClick={() => deleteAnnotation(selected.id)}
                  >
                    Delete text block
                  </button>
                </>
              ) : (
                <p className="pageink-inspector__empty">
                  {mode === "add"
                    ? "Click anywhere on the page to place text."
                    : "Select a text block to edit font, size, and color."}
                </p>
              )}
            </aside>

            <div className="pageink-stage-wrap">
              {rendering ? <p className="pageink-stage__loading">Rendering page…</p> : null}
              <div
                ref={stageRef}
                className={`pageink-stage${mode === "add" ? " pageink-stage--add" : ""}`}
                style={
                  stageSize.width
                    ? { width: stageSize.width, height: stageSize.height }
                    : undefined
                }
                onClick={onStageClick}
              >
                <canvas ref={canvasRef} className="pageink-stage__canvas" />
                {pageAnnotations.map((ann) => (
                  <div
                    key={ann.id}
                    className={`pageink-annotation${selectedId === ann.id ? " pageink-annotation--selected" : ""}`}
                    style={{
                      left: `${ann.x * 100}%`,
                      top: `${ann.y * 100}%`,
                      fontSize: `${ann.fontSize * RENDER_SCALE * 0.72}px`,
                      color: ann.color,
                      fontWeight: ann.bold ? 700 : 400,
                      fontFamily:
                        ann.fontFamily === "times"
                          ? "Times New Roman, serif"
                          : ann.fontFamily === "courier"
                            ? "Courier New, monospace"
                            : "Helvetica, Arial, sans-serif",
                    }}
                    onPointerDown={(e) => onAnnotationPointerDown(e, ann)}
                    onPointerMove={onAnnotationPointerMove}
                    onPointerUp={onAnnotationPointerUp}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    {ann.text || PAGEINK_DEFAULT_TEXT}
                  </div>
                ))}
              </div>
              <p className="pageink-stage__hint">
                {fileName} · {annotations.length} text block
                {annotations.length === 1 ? "" : "s"} · Ctrl+Z undo
              </p>
            </div>
          </div>

          {status ? <p className="pageink-status">{status}</p> : null}
        </>
      )}

      <footer className="pageink-footer">
        <a href="https://github.com/kory-kaai/pageink" target="_blank" rel="noopener noreferrer">
          PageInk on GitHub ↗
        </a>
        <a href="https://www.korykaai.com/open-source" target="_blank" rel="noopener noreferrer">
          All open source
        </a>
        <a href="https://www.korykaai.com/tools" target="_blank" rel="noopener noreferrer">
          More tools
        </a>
      </footer>
    </div>
  );
}
