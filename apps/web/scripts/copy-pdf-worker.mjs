import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

// pdfjs-dist 5.x calls Map.prototype.getOrInsertComputed inside the worker too, and
// ships no polyfill, so prepend one or the worker throws and no page ever renders.
const UPSERT_POLYFILL = `(() => {
  const define = (proto) => {
    if (typeof proto.getOrInsert !== "function") {
      Object.defineProperty(proto, "getOrInsert", {
        value(key, defaultValue) {
          if (this.has(key)) return this.get(key);
          this.set(key, defaultValue);
          return defaultValue;
        },
        configurable: true,
        writable: true,
      });
    }
    if (typeof proto.getOrInsertComputed !== "function") {
      Object.defineProperty(proto, "getOrInsertComputed", {
        value(key, callbackfn) {
          if (this.has(key)) return this.get(key);
          const value = callbackfn(key);
          this.set(key, value);
          return value;
        },
        configurable: true,
        writable: true,
      });
    }
  };
  define(Map.prototype);
  define(WeakMap.prototype);
})();
`;

const workerSource = readFileSync(source, "utf8");
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `${UPSERT_POLYFILL}${workerSource}`);
console.log("Copied pdf.worker.min.mjs to public/ (with getOrInsertComputed polyfill)");
