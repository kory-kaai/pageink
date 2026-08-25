import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { installMapUpsertPolyfill } from "./map-upsert-polyfill";

// PDF.js 5.x relies on Map.prototype.getOrInsertComputed; install it before any use.
installMapUpsertPolyfill();

let workerConfigured = false;

async function configurePdfJsWorker() {
  if (workerConfigured || typeof window === "undefined") {
    return;
  }
  installMapUpsertPolyfill();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerConfigured = true;
}

export async function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  await configurePdfJsWorker();
  const pdfjs = await import("pdfjs-dist");
  const copy = data.slice(0);
  const task = pdfjs.getDocument({ data: copy });
  return task.promise;
}

export type RenderedPage = {
  cssWidth: number;
  cssHeight: number;
  pdfWidth: number;
  pdfHeight: number;
};

/**
 * Thrown when a newer render for the same canvas started while this one was
 * awaiting. The caller should treat it as benign, not a real failure.
 */
export class RenderSupersededError extends Error {
  constructor() {
    super("PDF render superseded by a newer render");
    this.name = "RenderSupersededError";
  }
}

export function isBenignRenderError(error: unknown): boolean {
  return (
    error instanceof RenderSupersededError ||
    (error instanceof Error && error.name === "RenderingCancelledException")
  );
}

/*
 * A canvas can only host one PDF render at a time. Effects can fire twice (React
 * StrictMode) or in quick succession (fast page flips), and two renders sharing
 * one canvas corrupt each other — each `canvas.width` write clears the other's
 * output, leaving a blank (transparent) canvas that reads as an all-black page.
 *
 * Guard with a per-canvas generation claimed synchronously before any await, and
 * cancel the previous in-flight RenderTask. A stale render bails out before it
 * touches the canvas, so only the latest render ever paints.
 */
const renderGeneration = new WeakMap<HTMLCanvasElement, number>();
const activeRenderTask = new WeakMap<HTMLCanvasElement, RenderTask>();

export async function renderPdfPage(input: {
  doc: PDFDocumentProxy;
  pageIndex: number;
  canvas: HTMLCanvasElement;
  scale: number;
}): Promise<RenderedPage> {
  const canvas = input.canvas;
  const myGeneration = (renderGeneration.get(canvas) ?? 0) + 1;
  renderGeneration.set(canvas, myGeneration);
  activeRenderTask.get(canvas)?.cancel();

  const page = await input.doc.getPage(input.pageIndex + 1);
  if (renderGeneration.get(canvas) !== myGeneration) {
    throw new RenderSupersededError();
  }

  const viewport = page.getViewport({ scale: input.scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // Match the flag used for color sampling. Requesting a different willReadFrequently
  // value later makes Chromium reallocate the backing store, which wipes the rendered
  // page and leaves a blank (black) canvas, so both readers must agree from the start.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const task = page.render({ canvasContext: ctx, viewport, canvas });
  activeRenderTask.set(canvas, task);
  try {
    await task.promise;
  } finally {
    if (activeRenderTask.get(canvas) === task) {
      activeRenderTask.delete(canvas);
    }
  }

  if (renderGeneration.get(canvas) !== myGeneration) {
    throw new RenderSupersededError();
  }

  const [, , pdfWidth, pdfHeight] = page.view;
  return {
    cssWidth: viewport.width,
    cssHeight: viewport.height,
    pdfWidth,
    pdfHeight,
  };
}
