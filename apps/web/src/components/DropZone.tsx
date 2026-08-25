"use client";

import { useCallback, useState, type DragEvent } from "react";

interface DropZoneProps {
  onLoad: (pdfBytes: Uint8Array, fileName: string) => void;
}

async function readPdfFile(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export function DropZone({ onLoad }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please choose a PDF file.");
        return;
      }
      setError(null);
      try {
        const bytes = await readPdfFile(file);
        onLoad(bytes, file.name);
      } catch {
        setError("Could not read that PDF. Try another file.");
      }
    },
    [onLoad],
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      await handleFile(event.dataTransfer.files[0]);
    },
    [handleFile],
  );

  return (
    <section
      className={`dropzone${dragging ? " dropzone--active" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="dropzone-card">
        <h2>Open a PDF</h2>
        <p>Drag and drop a file here, or choose one from your device.</p>
        <label className="button button--primary">
          Choose PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <ul className="feature-list">
          <li>Click anywhere to place text</li>
          <li>Drag to move, resize with handles</li>
          <li>Undo, fonts, colors, download</li>
          <li>Files never leave your device</li>
        </ul>
      </div>
    </section>
  );
}
