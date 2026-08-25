import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const destination = join(here, "../public/pdf.worker.min.mjs");
const candidates = [
  join(here, "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  join(here, "../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
];

const source = candidates.find((candidate) => existsSync(candidate));
if (!source) {
  console.warn("pdf.worker.min.mjs not found — run npm install from the repo root.");
  process.exit(0);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log("Copied pdf.worker.min.mjs to public/");
