import { describe, expect, it } from "vitest";
import {
  clampNorm,
  exportPdfWithAnnotations,
  getWhiteoutRect,
  guessBold,
  guessFontFamily,
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

describe("font guess", () => {
  it("maps PDF font names", () => {
    expect(guessFontFamily("Times-Bold")).toBe("times");
    expect(guessFontFamily("Courier")).toBe("courier");
    expect(guessBold("Helvetica-Bold")).toBe(true);
  });
});

describe("newAnnotationId", () => {
  it("returns unique ids", () => {
    expect(newAnnotationId()).not.toBe(newAnnotationId());
  });
});

describe("whiteout", () => {
  it("returns explicit whiteout rects", () => {
    const annotation: TextAnnotation = {
      id: "a",
      pageIndex: 0,
      x: 0.1,
      y: 0.2,
      text: "Hi",
      fontSize: 12,
      color: "#111827",
      fontFamily: "helvetica",
      bold: false,
      source: "extracted",
      whiteout: { x: 0.09, y: 0.19, width: 0.2, height: 0.05 },
    };
    expect(getWhiteoutRect(annotation)).toEqual(annotation.whiteout);
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
      source: "added",
    };

    const exported = await exportPdfWithAnnotations({
      pdfBytes: bytes,
      annotations: [annotation],
    });
    const reloaded = await PDFDocument.load(exported);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("whiteouts extracted text before redraw", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([400, 300]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("OLD", { x: 40, y: 250, size: 12, font });
    const bytes = await pdf.save();

    const annotation: TextAnnotation = {
      id: "test",
      pageIndex: 0,
      x: 0.1,
      y: 0.15,
      width: 0.2,
      height: 0.05,
      text: "NEW",
      fontSize: 12,
      color: "#111827",
      fontFamily: "helvetica",
      bold: false,
      source: "extracted",
      originalText: "OLD",
      whiteout: { x: 0.08, y: 0.14, width: 0.24, height: 0.07 },
    };

    const exported = await exportPdfWithAnnotations({
      pdfBytes: bytes,
      annotations: [annotation],
    });
    expect(exported.byteLength).toBeGreaterThan(0);
  });
});
