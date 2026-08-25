import type { PDFDocumentProxy } from "pdfjs-dist";

let workerConfigured = false;

async function configurePdfJsWorker() {
  if (workerConfigured || typeof window === "undefined") {
    return;
  }
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

export async function renderPdfPage(input: {
  doc: PDFDocumentProxy;
  pageIndex: number;
  canvas: HTMLCanvasElement;
  scale: number;
}): Promise<RenderedPage> {
  const page = await input.doc.getPage(input.pageIndex + 1);
  const viewport = page.getViewport({ scale: input.scale });
  const canvas = input.canvas;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const [, , pdfWidth, pdfHeight] = page.view;
  return {
    cssWidth: viewport.width,
    cssHeight: viewport.height,
    pdfWidth,
    pdfHeight,
  };
}
