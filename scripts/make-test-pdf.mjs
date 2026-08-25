import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "node:fs";

const doc = await PDFDocument.create();
const page = doc.addPage([612, 792]);
const helv = await doc.embedFont(StandardFonts.Helvetica);
const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

page.drawText("Invoice #1042", { x: 60, y: 720, size: 24, font: helvBold, color: rgb(0, 0, 0) });
page.drawText("Firma del proprietario: ___________________________", {
  x: 60,
  y: 120,
  size: 12,
  font: helv,
  color: rgb(0, 0, 0),
});

const bytes = await doc.save();
writeFileSync(new URL("../apps/web/public/test.pdf", import.meta.url), bytes);
console.log("wrote", bytes.length, "bytes");
