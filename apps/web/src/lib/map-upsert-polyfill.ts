/*
 * pdfjs-dist 5.x calls Map.prototype.getOrInsertComputed (the TC39 "upsert"
 * proposal) many times but ships no polyfill of its own. In any browser that has
 * not implemented the proposal yet the call throws, which aborts every page
 * render and leaves the canvas blank — an all-black page. Install a spec-shaped
 * polyfill on Map and WeakMap before PDF.js runs so rendering works everywhere.
 *
 * The worker bundle needs the same guard; see scripts/copy-pdf-worker.mjs, which
 * prepends an equivalent snippet to the copied worker file.
 */

type Upsertable = {
  has(key: unknown): boolean;
  get(key: unknown): unknown;
  set(key: unknown, value: unknown): unknown;
  getOrInsert?: unknown;
  getOrInsertComputed?: unknown;
};

function defineUpsert(proto: Upsertable): void {
  if (typeof proto.getOrInsert !== "function") {
    Object.defineProperty(proto, "getOrInsert", {
      value(this: Upsertable, key: unknown, defaultValue: unknown): unknown {
        if (this.has(key)) {
          return this.get(key);
        }
        this.set(key, defaultValue);
        return defaultValue;
      },
      configurable: true,
      writable: true,
    });
  }

  if (typeof proto.getOrInsertComputed !== "function") {
    Object.defineProperty(proto, "getOrInsertComputed", {
      value(
        this: Upsertable,
        key: unknown,
        callbackfn: (key: unknown) => unknown,
      ): unknown {
        if (this.has(key)) {
          return this.get(key);
        }
        const value = callbackfn(key);
        this.set(key, value);
        return value;
      },
      configurable: true,
      writable: true,
    });
  }
}

export function installMapUpsertPolyfill(): void {
  defineUpsert(Map.prototype as unknown as Upsertable);
  defineUpsert(WeakMap.prototype as unknown as Upsertable);
}
