import { describe, expect, it } from "vitest";
import {
  createTextBlock,
  duplicateTextBlock,
  exportPdfWithText,
  hexToRgb,
  removeTextBlock,
  snapToGrid,
  UndoStack,
  updateTextBlock,
} from "./index.js";

describe("text blocks", () => {
  it("creates blocks with defaults", () => {
    const block = createTextBlock({ pageIndex: 0, x: 10, y: 20 });
    expect(block.text).toBe("New text");
    expect(block.style.fontSize).toBe(14);
  });

  it("updates and removes blocks", () => {
    const block = createTextBlock({ pageIndex: 0, x: 0, y: 0 });
    const updated = updateTextBlock([block], block.id, { text: "Signed" });
    expect(updated[0]?.text).toBe("Signed");
    expect(removeTextBlock(updated, block.id)).toEqual([]);
  });

  it("duplicates blocks with an offset", () => {
    const block = createTextBlock({ pageIndex: 0, x: 10, y: 10 });
    const duplicated = duplicateTextBlock([block], block.id);
    expect(duplicated).toHaveLength(2);
    expect(duplicated[1]?.x).toBe(22);
  });
});

describe("undo stack", () => {
  it("tracks undo and redo", () => {
    const stack = new UndoStack<string>();
    stack.push("a");
    stack.push("b");
    expect(stack.undo("c")).toBe("b");
    expect(stack.redo("a")).toBe("c");
  });
});

describe("geometry", () => {
  it("converts hex colors", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 1, g: 0, b: 0 });
  });

  it("snaps values to a grid", () => {
    expect(snapToGrid(13, 4)).toBe(12);
  });
});

describe("exportPdfWithText", () => {
  it("exports a PDF with overlay text", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([400, 300]);
    page.drawText("Original", { x: 40, y: 250, size: 12 });
    const bytes = await pdf.save();

    const block = createTextBlock({
      pageIndex: 0,
      x: 40,
      y: 40,
      text: "PAID",
      style: {
        fontFamily: "Helvetica",
        fontSize: 18,
        color: "#dc2626",
        bold: true,
      },
    });

    const exported = await exportPdfWithText(bytes, [block]);
    const reloaded = await PDFDocument.load(exported);
    expect(reloaded.getPageCount()).toBe(1);

    const embedded = await reloaded.embedFont(StandardFonts.HelveticaBold);
    expect(embedded.widthOfTextAtSize("PAID", 18)).toBeGreaterThan(0);
  });
});
