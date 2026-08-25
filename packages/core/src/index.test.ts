import { describe, expect, it } from "vitest";
import {
  clampNorm,
  exportPdfWithAnnotations,
  hexToRgb,
  newAnnotationId,
  type TextAnnotation,
} from "./index.js";

describe("coords", () => {
  it("converts hex colors", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 1, g: 0, b: 0 });
  });

  it("clamps normalized coordinates", () => {
    expect(clampNorm(1.5)).toBe(1);
    expect(clampNorm(-0.2)).toBe(0);
  });
});

describe("newAnnotationId", () => {
  it("returns unique ids", () => {
    expect(newAnnotationId()).not.toBe(newAnnotationId());
  });
});

describe("exportPdfWithAnnotations", () => {
  it("exports a PDF with overlay text", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([400, 300]);
    page.drawText("Original", { x: 40, y: 250, size: 12 });
    const bytes = await pdf.save();

    const annotation: TextAnnotation = {
      id: "test",
      pageIndex: 0,
      x: 0.1,
      y: 0.8,
      text: "PAID",
      fontSize: 18,
      color: "#b91c1c",
      fontFamily: "helvetica",
      bold: true,
    };

    const exported = await exportPdfWithAnnotations({
      pdfBytes: bytes,
      annotations: [annotation],
    });
    const reloaded = await PDFDocument.load(exported);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
