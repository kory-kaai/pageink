import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  annotationsOnSameLine,
  clampNorm,
  createWhiteoutForAnnotation,
  exportPdfWithAnnotations,
  getWhiteoutRect,
  guessBold,
  guessFontFamily,
  hexToRgb,
  isAnnotationModified,
  isSignatureAnnotation,
  newAnnotationId,
  withUpdatedWhiteout,
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
  const extracted: TextAnnotation = {
    id: "a",
    pageIndex: 0,
    x: 0.1,
    y: 0.2,
    text: "Hi",
    originalText: "Hi",
    fontSize: 12,
    color: "#111827",
    fontFamily: "helvetica",
    bold: false,
    source: "extracted",
    whiteout: { x: 0.09, y: 0.19, width: 0.2, height: 0.08 },
  };

  it("leaves untouched PDF text uncovered", () => {
    expect(isAnnotationModified(extracted)).toBe(false);
    expect(getWhiteoutRect(extracted)).toBeNull();
  });

  it("covers extracted text once its content changed", () => {
    const edited = { ...extracted, text: "Hello" };
    expect(isAnnotationModified(edited)).toBe(true);
    expect(getWhiteoutRect(edited)).toEqual(extracted.whiteout);
  });

  it("covers extracted text once it is moved", () => {
    const moved = withUpdatedWhiteout({ ...extracted, x: 0.4 });
    expect(isAnnotationModified(moved)).toBe(true);
    expect(getWhiteoutRect(moved)).not.toBeNull();
  });

  it("keeps the cover on the original glyphs when a block is dragged away", () => {
    const moved = withUpdatedWhiteout({ ...extracted, x: 0.7, y: 0.8 });
    // The cover must not follow the block, or the original text stays visible.
    expect(getWhiteoutRect(moved)).toEqual(extracted.whiteout);
  });

  it("still covers a moved block that never recorded a whiteout", () => {
    const bare = { ...extracted, whiteout: undefined, width: 0.2, height: 0.05 };
    expect(getWhiteoutRect(withUpdatedWhiteout(bare))).not.toBeNull();
  });

  it("keeps the cover clear of the next run on the same line", () => {
    const run = { x: 0.1, y: 0.2, width: 0.08, height: 0.02 };
    const rect = createWhiteoutForAnnotation(run);
    const neighbourStart = run.x + run.width + 0.005;
    expect(rect.x + rect.width).toBeLessThan(neighbourStart);
    expect(rect.x).toBeLessThanOrEqual(run.x);
  });

  it("never covers newly added text", () => {
    const added: TextAnnotation = { ...extracted, source: "added", whiteout: undefined };
    expect(getWhiteoutRect(added)).toBeNull();
  });

  it("covers underscore rules further below the em box than regular text", () => {
    const box = { x: 0.1, y: 0.2, width: 0.2, height: 0.02 };
    const word = createWhiteoutForAnnotation({ ...box, text: "Hello" });
    const rule = createWhiteoutForAnnotation({ ...box, text: ": ___________" });
    expect(rule.y + rule.height).toBeGreaterThan(word.y + word.height);
    expect(rule.y).toBe(word.y);
  });

  it("covers descenders that sit below the em box", () => {
    const run = { x: 0.1, y: 0.2, width: 0.2, height: 0.02, text: "paying" };
    const rect = createWhiteoutForAnnotation(run);
    expect(rect.y + rect.height).toBeGreaterThan(run.y + run.height);
  });

  it("lengthens an existing cover that was too short for descenders", () => {
    const short = {
      ...extracted,
      height: 0.02,
      whiteout: { x: 0.1, y: 0.2, width: 0.2, height: 0.022 },
      modified: true,
    };
    const rect = getWhiteoutRect(short);
    expect(rect).not.toBeNull();
    expect(rect!.height).toBeGreaterThan(short.whiteout.height);
    expect(rect!.x).toBe(short.whiteout.x);
    expect(rect!.y).toBe(short.whiteout.y);
  });
});

describe("line group", () => {
  const base: TextAnnotation = {
    id: "a",
    pageIndex: 0,
    x: 0.1,
    y: 0.2,
    text: "Hi",
    originalText: "Hi",
    fontSize: 12,
    color: "#111827",
    fontFamily: "helvetica",
    bold: false,
    source: "extracted",
  };
  const label: TextAnnotation = {
    ...base,
    id: "label",
    text: "Firma del proprietario",
    originalText: "Firma del proprietario",
    y: 0.5,
    height: 0.015,
    width: 0.19,
    bold: true,
  };
  const rule: TextAnnotation = {
    ...base,
    id: "rule",
    text: ": ___________",
    originalText: ": ___________",
    x: 0.31,
    y: 0.5,
    height: 0.015,
    width: 0.28,
  };
  const nextLine: TextAnnotation = {
    ...base,
    id: "next",
    text: "Data: 08/01/2026",
    originalText: "Data: 08/01/2026",
    y: 0.545,
    height: 0.015,
  };

  it("keeps a signature rule with its label on the same baseline", () => {
    const line = annotationsOnSameLine(rule, [label, rule, nextLine]);
    expect(line.map((a) => a.id)).toEqual(["label", "rule"]);
  });

  it("does not pull in the following line", () => {
    expect(annotationsOnSameLine(nextLine, [label, rule, nextLine]).map((a) => a.id)).toEqual(["next"]);
  });

  it("does not drag neighbouring PDF text when moving an added box", () => {
    const added: TextAnnotation = {
      ...base,
      id: "added",
      source: "added",
      y: 0.5,
      height: 0.02,
      text: "Text",
    };
    expect(annotationsOnSameLine(added, [label, rule, added]).map((a) => a.id)).toEqual(["added"]);
  });

  it("does not take an added box along when dragging a PDF line", () => {
    const added: TextAnnotation = {
      ...base,
      id: "added",
      source: "added",
      y: 0.5,
      height: 0.02,
      text: "Text",
    };
    expect(annotationsOnSameLine(rule, [label, rule, added]).map((a) => a.id)).toEqual(["label", "rule"]);
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

  it("embeds a typed signature with a custom script font", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    pdf.addPage([400, 300]);
    const bytes = await pdf.save();
    const fontPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/web/public/fonts/signatures/GreatVibes-Regular.ttf",
    );
    const signature: TextAnnotation = {
      id: "sig",
      pageIndex: 0,
      x: 0.12,
      y: 0.7,
      text: "Ada Lovelace",
      fontSize: 28,
      color: "#111827",
      fontFamily: "helvetica",
      bold: false,
      source: "added",
      kind: "signature",
      signatureStyle: "formal",
    };
    expect(isSignatureAnnotation(signature)).toBe(true);
    expect(getWhiteoutRect(signature)).toBeNull();
    expect(isAnnotationModified(signature)).toBe(true);

    const exported = await exportPdfWithAnnotations({
      pdfBytes: bytes,
      annotations: [signature],
      customFonts: { formal: new Uint8Array(readFileSync(fontPath)) },
    });
    expect(exported.byteLength).toBeGreaterThan(bytes.byteLength);
  });

  it("refuses to export a signature without its script font", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    pdf.addPage([400, 300]);
    const bytes = await pdf.save();
    const signature: TextAnnotation = {
      id: "sig",
      pageIndex: 0,
      x: 0.12,
      y: 0.7,
      text: "Ada Lovelace",
      fontSize: 28,
      color: "#111827",
      fontFamily: "helvetica",
      bold: false,
      source: "added",
      kind: "signature",
      signatureStyle: "formal",
    };
    await expect(
      exportPdfWithAnnotations({ pdfBytes: bytes, annotations: [signature] }),
    ).rejects.toThrow(/Missing signature font/);
  });
});
