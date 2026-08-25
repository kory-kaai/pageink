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
  PAGEINK_DEFAULT_SIGNATURE_SIZE,
  PAGEINK_DEFAULT_SIGNATURE_STYLE,
  PAGEINK_DEFAULT_TEXT,
  PAGEINK_FONT_OPTIONS,
  PAGEINK_SIGNATURE_STYLES,
  annotationsOnSameLine,
  clampNorm,
  exportPdfWithAnnotations,
  getWhiteoutRect,
  isAnnotationModified,
  isSignatureAnnotation,
  newAnnotationId,
  withUpdatedWhiteout,
  type PageInkSignatureStyle,
  type TextAnnotation,
  type WhiteoutRect,
} from "@korykaai/pageink-core";
import { SignatureComposer, type SignatureDraft } from "@/components/SignatureComposer";
import { extractTextAnnotations, resolveExtractedFontStyles } from "@/lib/pdf-text-extract";
import { isBenignRenderError, loadPdfDocument, renderPdfPage } from "@/lib/pdf-viewer";
import { SIGNATURE_FONT_STACKS, loadSignatureFontBytes, preloadSignatureFonts } from "@/lib/signature-fonts";
import { sampleTextColor } from "@/lib/text-color";

type EditorMode = "select" | "add" | "sign";

type DragState = {
  id: string;
  startX: number;
  startY: number;
  /** Every run that shares this baseline — a signature rule travels with its label. */
  origins: { id: string; x: number; y: number }[];
  /** Becomes true only once the pointer passes the drag threshold. */
  moved: boolean;
};

const RENDER_SCALE = 1.35;

/**
 * A click always jitters a pixel or two between pointerdown and pointerup.
 * Movement below this (in px) counts as a click that selects but does not move —
 * so extracted text is not flagged "modified" (and whited out) just by clicking it.
 */
const DRAG_THRESHOLD_PX = 3;

const FONT_STACKS: Record<TextAnnotation["fontFamily"], string> = {
  times: "Times New Roman, serif",
  courier: "Courier New, monospace",
  helvetica: "Helvetica, Arial, sans-serif",
};

const SIGNATURE_STORAGE_KEY = "pageink.signature.v1";

const DEFAULT_SIGNATURE_DRAFT: SignatureDraft = {
  text: "",
  style: PAGEINK_DEFAULT_SIGNATURE_STYLE,
  fontSize: PAGEINK_DEFAULT_SIGNATURE_SIZE,
  color: PAGEINK_DEFAULT_COLOR,
};

function describeStyle(ann: TextAnnotation): string {
  if (isSignatureAnnotation(ann)) {
    const style = PAGEINK_SIGNATURE_STYLES.find((item) => item.id === ann.signatureStyle);
    return `${style?.label ?? "Signature"} · ${ann.fontSize}pt`;
  }
  const label = PAGEINK_FONT_OPTIONS.find((f) => f.id === ann.fontFamily)?.label ?? ann.fontFamily;
  return `${label} · ${ann.bold ? "Bold" : "Regular"} · ${ann.fontSize}pt`;
}

function overlayFontFamily(ann: TextAnnotation): string {
  if (isSignatureAnnotation(ann) && ann.signatureStyle) {
    return SIGNATURE_FONT_STACKS[ann.signatureStyle];
  }
  return FONT_STACKS[ann.fontFamily];
}

function readStoredSignature(): SignatureDraft {
  if (typeof window === "undefined") {
    return DEFAULT_SIGNATURE_DRAFT;
  }
  try {
    const raw = window.localStorage.getItem(SIGNATURE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SIGNATURE_DRAFT;
    }
    const parsed = JSON.parse(raw) as Partial<SignatureDraft>;
    const style = PAGEINK_SIGNATURE_STYLES.some((item) => item.id === parsed.style)
      ? (parsed.style as PageInkSignatureStyle)
      : DEFAULT_SIGNATURE_DRAFT.style;
    return {
      text: typeof parsed.text === "string" ? parsed.text : "",
      style,
      fontSize:
        typeof parsed.fontSize === "number" && parsed.fontSize >= 16 && parsed.fontSize <= 64
          ? parsed.fontSize
          : DEFAULT_SIGNATURE_DRAFT.fontSize,
      color: typeof parsed.color === "string" ? parsed.color : DEFAULT_SIGNATURE_DRAFT.color,
    };
  } catch {
    return DEFAULT_SIGNATURE_DRAFT;
  }
}

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
  const [mode, setMode] = useState<EditorMode>("select");
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [extractedCount, setExtractedCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<SignatureDraft>(readStoredSignature);
  const [history, setHistory] = useState<TextAnnotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  pdfDocRef.current = pdfDoc;
  const sampledPagesRef = useRef<Set<number>>(new Set());
  const resolvedFontPagesRef = useRef<Set<number>>(new Set());

  const selected = useMemo(
    () => annotations.find((a) => a.id === selectedId) ?? null,
    [annotations, selectedId],
  );

  const selectedSignature = selected && isSignatureAnnotation(selected) ? selected : null;

  useEffect(() => {
    preloadSignatureFonts();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(signatureDraft));
    } catch {
      /* private mode or blocked storage — draft still works for this session */
    }
  }, [signatureDraft]);

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
        annotations.map((a) => {
          if (a.id !== id) {
            return a;
          }
          const next = { ...a, ...patch };
          return a.source === "extracted" ? withUpdatedWhiteout(next) : next;
        }),
      );
    },
    [annotations, commitAnnotations],
  );

  const placeSignatureAt = useCallback(
    (x: number, y: number) => {
      const text = signatureDraft.text.trim();
      if (!text) {
        setStatus("Type a name to create your signature.");
        return;
      }
      const ann: TextAnnotation = {
        id: newAnnotationId(),
        pageIndex,
        source: "added",
        kind: "signature",
        signatureStyle: signatureDraft.style,
        x,
        y,
        text,
        fontSize: signatureDraft.fontSize,
        color: signatureDraft.color,
        fontFamily: "helvetica",
        bold: false,
      };
      commitAnnotations([...annotations, ann]);
      setSelectedId(ann.id);
      setMode("select");
      setStatus("Signature placed — drag it into position.");
      window.setTimeout(() => {
        document
          .querySelector(".pageink-annotation--signature.pageink-annotation--selected")
          ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }, 0);
    },
    [annotations, commitAnnotations, pageIndex, signatureDraft],
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
    setExtractedCount(0);
    sampledPagesRef.current = new Set();
    resolvedFontPagesRef.current = new Set();
  }, []);

  /**
   * Recover each block's real ink color from the rendered page. This corrects the
   * placeholder color assigned during extraction, so a block keeps its own color
   * the moment it is selected instead of snapping to the default.
   */
  const sampleColorsForPage = useCallback((page: number) => {
    const canvas = canvasRef.current;
    if (!canvas || sampledPagesRef.current.has(page)) {
      return;
    }
    sampledPagesRef.current.add(page);

    const colors = new Map<string, string>();
    for (const ann of annotationsRef.current) {
      if (ann.pageIndex !== page || ann.source !== "extracted") {
        continue;
      }
      if (ann.width === undefined || ann.height === undefined) {
        continue;
      }
      const color = sampleTextColor(canvas, {
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
      });
      if (color && color !== ann.color) {
        colors.set(ann.id, color);
      }
    }

    if (colors.size === 0) {
      return;
    }

    const applyColors = (list: TextAnnotation[]) =>
      list.map((a) => {
        const color = colors.get(a.id);
        return color ? { ...a, color } : a;
      });

    // Reading back the original color is not an edit, so it stays out of undo history.
    setAnnotations(applyColors);
    setHistory((prev) => prev.map(applyColors));
  }, []);

  /**
   * Recover real weight/family once the page has rendered. Text extraction only
   * exposes generic families (so bold is lost); the loaded fonts become readable
   * in commonObjs after render, letting us mark bold blocks bold in the inspector.
   */
  const resolveFontsForPage = useCallback((page: number) => {
    const doc = pdfDocRef.current;
    if (!doc || resolvedFontPagesRef.current.has(page)) {
      return;
    }
    resolvedFontPagesRef.current.add(page);

    const keys = new Set<string>();
    for (const ann of annotationsRef.current) {
      if (ann.pageIndex === page && ann.source === "extracted" && ann.sourceFontKey) {
        keys.add(ann.sourceFontKey);
      }
    }
    if (keys.size === 0) {
      return;
    }

    void (async () => {
      const pdfPage = await doc.getPage(page + 1);
      const styles = await resolveExtractedFontStyles(pdfPage, [...keys]);
      if (styles.size === 0) {
        return;
      }

      const applyFonts = (list: TextAnnotation[]) =>
        list.map((a) => {
          if (a.source !== "extracted" || !a.sourceFontKey) {
            return a;
          }
          const style = styles.get(a.sourceFontKey);
          if (!style || (a.bold === style.bold && a.fontFamily === style.fontFamily)) {
            return a;
          }
          return { ...a, bold: style.bold, fontFamily: style.fontFamily };
        });

      // Detecting the original weight is not a user edit, so keep it out of undo history.
      setAnnotations(applyFonts);
      setHistory((prev) => prev.map(applyFonts));
    })();
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
      setSelectedId(null);
      sampledPagesRef.current = new Set();
      resolvedFontPagesRef.current = new Set();

      setStatus("Extracting existing text…");
      const extracted = await extractTextAnnotations(doc);
      setExtractedCount(extracted.length);
      setAnnotations(extracted);
      setHistory([extracted]);
      setHistoryIndex(0);
      setMode(extracted.length > 0 ? "select" : "add");

      if (extracted.length > 0) {
        setStatus(
          `Found ${extracted.length} editable text block${extracted.length === 1 ? "" : "s"} — click any text to edit.`,
        );
      } else {
        setStatus(
          "No text layer found (this may be a scanned PDF). You can still add new text.",
        );
      }
    } catch {
      setStatus("Could not open this PDF. It may be encrypted or corrupted.");
    }
  }, []);

  /**
   * An extracted block only hides the original glyphs once it is being edited or
   * has already been changed. Everything else renders straight from the PDF.
   */
  const isActiveBlock = useCallback(
    (annotation: TextAnnotation) =>
      annotation.source === "added" ||
      annotation.id === selectedId ||
      isAnnotationModified(annotation),
    [selectedId],
  );

  const pageWhiteouts = useMemo(
    () =>
      pageAnnotations
        .filter((a) => a.source === "extracted" && isActiveBlock(a))
        .map((a) => {
          const rect = getWhiteoutRect(a);
          return rect ? { id: a.id, rect } : null;
        })
        .filter((entry): entry is { id: string; rect: WhiteoutRect } => entry !== null),
    [isActiveBlock, pageAnnotations],
  );

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
        sampleColorsForPage(pageIndex);
        resolveFontsForPage(pageIndex);
      } catch (error) {
        if (!cancelled && !isBenignRenderError(error)) {
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
  }, [pageIndex, pdfDoc, sampleColorsForPage, resolveFontsForPage]);

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
    if (!pdfDoc) {
      return;
    }
    const onAnnotation = (e.target as HTMLElement).closest(".pageink-annotation");
    if (mode === "sign") {
      if (onAnnotation) {
        return;
      }
      const { x, y } = pointerToNorm(e);
      placeSignatureAt(x, y);
      return;
    }
    if (mode !== "add") {
      // Clicking empty page area clears the current selection box.
      if (!onAnnotation) {
        setSelectedId(null);
      }
      return;
    }
    if (onAnnotation) {
      return;
    }

    const { x, y } = pointerToNorm(e);
    const ann: TextAnnotation = {
      id: newAnnotationId(),
      pageIndex,
      source: "added",
      kind: "text",
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
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation for tracking the pointer outside the block;
      // without it dragging still works, so never let it break selection.
    }
    setDrag({
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origins: annotationsOnSameLine(ann, annotationsRef.current).map((block) => ({
        id: block.id,
        x: block.x,
        y: block.y,
      })),
      moved: false,
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
    const pxDx = e.clientX - drag.startX;
    const pxDy = e.clientY - drag.startY;
    // Below the threshold this is a click, not a drag — leave the block untouched.
    if (!drag.moved && Math.hypot(pxDx, pxDy) < DRAG_THRESHOLD_PX) {
      return;
    }
    if (!drag.moved) {
      setDrag({ ...drag, moved: true });
    }

    const rect = stage.getBoundingClientRect();
    const dx = pxDx / rect.width;
    const dy = pxDy / rect.height;
    const origins = new Map(drag.origins.map((origin) => [origin.id, origin]));
    setAnnotations((prev) =>
      prev.map((a) => {
        const origin = origins.get(a.id);
        if (!origin) {
          return a;
        }
        const moved = {
          ...a,
          x: clampNorm(origin.x + dx),
          y: clampNorm(origin.y + dy),
        };
        return a.source === "extracted" ? withUpdatedWhiteout(moved) : moved;
      }),
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
    // Only record history if the block actually moved; a plain click is not an edit.
    if (drag.moved) {
      commitAnnotations([...annotationsRef.current]);
    }
    setDrag(null);
  }

  async function onExport() {
    if (!pdfBytes) {
      return;
    }
    setExporting(true);
    setStatus("Preparing download…");
    try {
      const signatureStyles = annotations
        .filter(isSignatureAnnotation)
        .map((ann) => ann.signatureStyle)
        .filter((style): style is PageInkSignatureStyle => style !== undefined);
      const customFonts =
        signatureStyles.length > 0 ? await loadSignatureFontBytes(signatureStyles) : undefined;
      const out = await exportPdfWithAnnotations({ pdfBytes, annotations, customFonts });
      downloadBytes(out, fileName);
      setStatus("Download started — your file never left this browser.");
    } catch (error) {
      console.error("PageInk export failed", error);
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
              Add and edit text on any PDF — private, in your browser.
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
                className={`pageink-tool${mode === "sign" ? " pageink-tool--active" : ""}`}
                onClick={() => {
                  setSelectedId(null);
                  setMode("sign");
                }}
              >
                Sign
              </button>
              <button
                type="button"
                className={`pageink-tool${mode === "select" ? " pageink-tool--active" : ""}`}
                onClick={() => setMode("select")}
              >
                Edit / move
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
              {selectedSignature ? (
                <>
                  <h2 className="pageink-inspector__title">Signature</h2>
                  <p className="pageink-inspector__style">{describeStyle(selectedSignature)}</p>
                  <SignatureComposer
                    value={{
                      text: selectedSignature.text,
                      style: selectedSignature.signatureStyle ?? PAGEINK_DEFAULT_SIGNATURE_STYLE,
                      fontSize: selectedSignature.fontSize,
                      color: selectedSignature.color,
                    }}
                    onChange={(patch) => {
                      setSignatureDraft((prev) => ({ ...prev, ...patch }));
                      updateAnnotation(selectedSignature.id, {
                        ...(patch.text !== undefined ? { text: patch.text } : {}),
                        ...(patch.style !== undefined ? { signatureStyle: patch.style } : {}),
                        ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
                        ...(patch.color !== undefined ? { color: patch.color } : {}),
                      });
                    }}
                    hint="Drag the signature anywhere on the page."
                  />
                  <button
                    type="button"
                    className="pageink-tool pageink-tool--danger"
                    onClick={() => deleteAnnotation(selectedSignature.id)}
                  >
                    Delete signature
                  </button>
                </>
              ) : mode === "sign" ? (
                <>
                  <h2 className="pageink-inspector__title">Signature</h2>
                  <p className="pageink-inspector__style">Type a name, pick a style, place it.</p>
                  <SignatureComposer
                    value={signatureDraft}
                    onChange={(patch) => setSignatureDraft((prev) => ({ ...prev, ...patch }))}
                    onPlace={() => placeSignatureAt(0.16, 0.62)}
                    placeDisabled={!signatureDraft.text.trim()}
                    placeLabel="Place on page"
                    hint="Or click anywhere on the page to drop it."
                  />
                </>
              ) : selected ? (
                <>
                  <h2 className="pageink-inspector__title">
                    {selected.source === "extracted" ? "PDF text" : "Added text"}
                  </h2>
                  <p className="pageink-inspector__style">{describeStyle(selected)}</p>
                  <label className="pageink-field">
                    Content
                    <textarea
                      className="pageink-input pageink-input--content"
                      rows={2}
                      value={selected.text}
                      style={{
                        fontFamily: overlayFontFamily(selected),
                        fontWeight: selected.bold ? 700 : 400,
                      }}
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
                    ? "Click anywhere on the page to place new text."
                    : extractedCount > 0
                      ? "Click existing text on the page to edit it, or use Sign to add a signature."
                      : "Select a text block to edit font, size, and color."}
                </p>
              )}
            </aside>

            <div className="pageink-stage-wrap">
              {rendering ? <p className="pageink-stage__loading">Rendering page…</p> : null}
              <div
                ref={stageRef}
                className={`pageink-stage${mode === "add" || mode === "sign" ? " pageink-stage--add" : ""}`}
                style={
                  stageSize.width
                    ? { width: stageSize.width, height: stageSize.height }
                    : undefined
                }
                onClick={onStageClick}
              >
                <canvas ref={canvasRef} className="pageink-stage__canvas" />
                {pageWhiteouts.map(({ id, rect }) => (
                  <div
                    key={`whiteout-${id}`}
                    className="pageink-whiteout"
                    aria-hidden
                    style={{
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.width * 100}%`,
                      height: `${rect.height * 100}%`,
                    }}
                  />
                ))}
                {pageAnnotations.map((ann) => {
                  const active = isActiveBlock(ann);
                  return (
                    <div
                      key={ann.id}
                      className={`pageink-annotation${
                        selectedId === ann.id ? " pageink-annotation--selected" : ""
                      }${ann.source === "extracted" ? " pageink-annotation--extracted" : ""}${
                        isSignatureAnnotation(ann) ? " pageink-annotation--signature" : ""
                      }${
                        isAnnotationModified(ann) && ann.source === "extracted"
                          ? " pageink-annotation--modified"
                          : ""
                      }${active ? "" : " pageink-annotation--ghost"}`}
                      role={isSignatureAnnotation(ann) ? "img" : undefined}
                      aria-label={
                        isSignatureAnnotation(ann) ? `Signature ${ann.text}` : undefined
                      }
                      title={active ? undefined : "Click to edit this text"}
                      style={{
                        left: `${ann.x * 100}%`,
                        top: `${ann.y * 100}%`,
                        minWidth: ann.width ? `${ann.width * 100}%` : undefined,
                        minHeight: ann.height ? `${ann.height * 100}%` : undefined,
                        fontSize: `${ann.fontSize * RENDER_SCALE}px`,
                        color: ann.color,
                        fontWeight: isSignatureAnnotation(ann) ? 400 : ann.bold ? 700 : 400,
                        fontFamily: overlayFontFamily(ann),
                      }}
                      onPointerDown={(e) => onAnnotationPointerDown(e, ann)}
                      onPointerMove={onAnnotationPointerMove}
                      onPointerUp={onAnnotationPointerUp}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      {active ? ann.text || PAGEINK_DEFAULT_TEXT : null}
                    </div>
                  );
                })}
              </div>
              <p className="pageink-stage__hint">
                {fileName} · {pageAnnotations.length} on this page · {annotations.length} total
                {extractedCount > 0 ? ` · ${extractedCount} from PDF` : ""} · Ctrl+Z undo
              </p>
            </div>
          </div>

          {status ? <p className="pageink-status">{status}</p> : null}
        </>
      )}
    </div>
  );
}
