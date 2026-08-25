let pdfjsModule: typeof import("pdfjs-dist") | null = null;

export async function getPdfjs() {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");
    if (typeof window !== "undefined") {
      pdfjsModule.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
  }

  return pdfjsModule;
}
