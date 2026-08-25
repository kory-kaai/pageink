import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  UndoStack,
  createTextBlock,
  duplicateTextBlock,
  exportPdfWithText,
  mergeTextBlockStyle,
  removeTextBlock,
  updateTextBlock,
  type TextBlock,
  type TextBlockStyle,
} from "@korykaai/pageink-core";
import { DropZone } from "./components/DropZone";
import { PdfViewer } from "./components/PdfViewer";
import { PrivacyBadge } from "./components/PrivacyBadge";
import { Toolbar } from "./components/Toolbar";

interface EditorState {
  pdfBytes: Uint8Array | null;
  fileName: string;
  blocks: TextBlock[];
  selectedId: string | null;
  pageIndex: number;
  exporting: boolean;
  error: string | null;
}

type EditorAction =
  | { type: "load"; pdfBytes: Uint8Array; fileName: string }
  | { type: "set-blocks"; blocks: TextBlock[] }
  | { type: "select"; id: string | null }
  | { type: "set-page"; pageIndex: number }
  | { type: "export-start" }
  | { type: "export-end" }
  | { type: "error"; message: string }
  | { type: "reset" };

const initialState: EditorState = {
  pdfBytes: null,
  fileName: "document.pdf",
  blocks: [],
  selectedId: null,
  pageIndex: 0,
  exporting: false,
  error: null,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return {
        ...initialState,
        pdfBytes: action.pdfBytes,
        fileName: action.fileName,
      };
    case "set-blocks":
      return { ...state, blocks: action.blocks, error: null };
    case "select":
      return { ...state, selectedId: action.id };
    case "set-page":
      return { ...state, pageIndex: action.pageIndex };
    case "export-start":
      return { ...state, exporting: true, error: null };
    case "export-end":
      return { ...state, exporting: false };
    case "error":
      return { ...state, exporting: false, error: action.message };
    case "reset":
      return initialState;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const undoStack = useRef(new UndoStack<TextBlock[]>());

  const selectedBlock = useMemo(
    () => state.blocks.find((block) => block.id === state.selectedId) ?? null,
    [state.blocks, state.selectedId],
  );

  const commitBlocks = useCallback((nextBlocks: TextBlock[]) => {
    undoStack.current.push(state.blocks);
    dispatch({ type: "set-blocks", blocks: nextBlocks });
  }, [state.blocks]);

  const handleLoad = useCallback((pdfBytes: Uint8Array, fileName: string) => {
    undoStack.current.clear();
    dispatch({ type: "load", pdfBytes, fileName });
  }, []);

  const handleAddText = useCallback(
    (x: number, y: number) => {
      const block = createTextBlock({
        pageIndex: state.pageIndex,
        x,
        y,
      });
      commitBlocks([...state.blocks, block]);
      dispatch({ type: "select", id: block.id });
    },
    [commitBlocks, state.blocks, state.pageIndex],
  );

  const handleUpdateBlock = useCallback(
    (id: string, patch: Partial<TextBlock>) => {
      commitBlocks(updateTextBlock(state.blocks, id, patch));
    },
    [commitBlocks, state.blocks],
  );

  const handleStyleChange = useCallback(
    (patch: Partial<TextBlockStyle>) => {
      if (!selectedBlock) {
        return;
      }
      commitBlocks(
        updateTextBlock(state.blocks, selectedBlock.id, {
          style: mergeTextBlockStyle(selectedBlock.style, patch),
        }),
      );
    },
    [commitBlocks, selectedBlock, state.blocks],
  );

  const handleDelete = useCallback(() => {
    if (!selectedBlock) {
      return;
    }
    commitBlocks(removeTextBlock(state.blocks, selectedBlock.id));
    dispatch({ type: "select", id: null });
  }, [commitBlocks, selectedBlock, state.blocks]);

  const handleDuplicate = useCallback(() => {
    if (!selectedBlock) {
      return;
    }
    const next = duplicateTextBlock(state.blocks, selectedBlock.id);
    commitBlocks(next);
    const copy = next[next.length - 1];
    if (copy) {
      dispatch({ type: "select", id: copy.id });
    }
  }, [commitBlocks, selectedBlock, state.blocks]);

  const handleUndo = useCallback(() => {
    const previous = undoStack.current.undo(state.blocks);
    if (previous) {
      dispatch({ type: "set-blocks", blocks: previous });
    }
  }, [state.blocks]);

  const handleRedo = useCallback(() => {
    const next = undoStack.current.redo(state.blocks);
    if (next) {
      dispatch({ type: "set-blocks", blocks: next });
    }
  }, [state.blocks]);

  const handleDownload = useCallback(async () => {
    if (!state.pdfBytes) {
      return;
    }
    dispatch({ type: "export-start" });
    try {
      const exported = await exportPdfWithText(state.pdfBytes, state.blocks);
      const baseName = state.fileName.replace(/\.pdf$/i, "");
      downloadBytes(exported, `${baseName}-pageink.pdf`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export PDF";
      dispatch({ type: "error", message });
    } finally {
      dispatch({ type: "export-end" });
    }
  }, [state.blocks, state.fileName, state.pdfBytes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      if (mod && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
        event.preventDefault();
        handleRedo();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedBlock) {
        event.preventDefault();
        handleDelete();
      }
      if (selectedBlock && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const delta = event.shiftKey ? 10 : 1;
        const patch: Partial<TextBlock> = {};
        if (event.key === "ArrowUp") patch.y = selectedBlock.y - delta;
        if (event.key === "ArrowDown") patch.y = selectedBlock.y + delta;
        if (event.key === "ArrowLeft") patch.x = selectedBlock.x - delta;
        if (event.key === "ArrowRight") patch.x = selectedBlock.x + delta;
        handleUpdateBlock(selectedBlock.id, patch);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDelete, handleRedo, handleUndo, handleUpdateBlock, selectedBlock]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            Pi
          </span>
          <div>
            <h1>PageInk</h1>
            <p>Add text to any PDF in your browser.</p>
          </div>
        </div>
        <PrivacyBadge />
      </header>

      {!state.pdfBytes ? (
        <DropZone onLoad={handleLoad} />
      ) : (
        <>
          <Toolbar
            fileName={state.fileName}
            selectedBlock={selectedBlock}
            canUndo={undoStack.current.canUndo()}
            canRedo={undoStack.current.canRedo()}
            exporting={state.exporting}
            onStyleChange={handleStyleChange}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDownload={handleDownload}
            onReset={() => dispatch({ type: "reset" })}
          />
          {state.error ? <p className="error-banner">{state.error}</p> : null}
          <PdfViewer
            pdfBytes={state.pdfBytes}
            blocks={state.blocks}
            pageIndex={state.pageIndex}
            selectedId={state.selectedId}
            onPageChange={(pageIndex) => dispatch({ type: "set-page", pageIndex })}
            onSelect={(id) => dispatch({ type: "select", id })}
            onAddText={handleAddText}
            onUpdateBlock={handleUpdateBlock}
          />
        </>
      )}

      <footer className="app-footer">
        <a href="https://github.com/kory-kaai/pageink" target="_blank" rel="noreferrer">
          Open source on GitHub
        </a>
        <span>·</span>
        <a href="https://www.korykaai.com/open-source" target="_blank" rel="noreferrer">
          Kory Kaai open source
        </a>
      </footer>
    </div>
  );
}
