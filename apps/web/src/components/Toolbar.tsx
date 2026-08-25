import {
  FONT_FAMILIES,
  PRESET_COLORS,
  type PdfFontFamily,
  type TextBlock,
  type TextBlockStyle,
} from "@korykaai/pageink-core";

interface ToolbarProps {
  fileName: string;
  selectedBlock: TextBlock | null;
  canUndo: boolean;
  canRedo: boolean;
  exporting: boolean;
  onStyleChange: (patch: Partial<TextBlockStyle>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onReset: () => void;
}

export function Toolbar({
  fileName,
  selectedBlock,
  canUndo,
  canRedo,
  exporting,
  onStyleChange,
  onDelete,
  onDuplicate,
  onUndo,
  onRedo,
  onDownload,
  onReset,
}: ToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-file">{fileName}</span>
        <button type="button" className="button" disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" className="button" disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
      </div>

      <div className="toolbar-group">
        <label>
          Font
          <select
            value={selectedBlock?.style.fontFamily ?? "Helvetica"}
            disabled={!selectedBlock}
            onChange={(event) =>
              onStyleChange({ fontFamily: event.target.value as PdfFontFamily })
            }
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </label>

        <label>
          Size
          <input
            type="number"
            min="8"
            max="72"
            value={selectedBlock?.style.fontSize ?? 14}
            disabled={!selectedBlock}
            onChange={(event) =>
              onStyleChange({ fontSize: Number(event.target.value) || 14 })
            }
          />
        </label>

        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={selectedBlock?.style.bold ?? false}
            disabled={!selectedBlock}
            onChange={(event) => onStyleChange({ bold: event.target.checked })}
          />
          Bold
        </label>

        <div className="color-swatches">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-swatch${
                selectedBlock?.style.color === color ? " color-swatch--active" : ""
              }`}
              style={{ backgroundColor: color }}
              disabled={!selectedBlock}
              aria-label={`Set color ${color}`}
              onClick={() => onStyleChange({ color })}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="button"
          disabled={!selectedBlock}
          onClick={onDuplicate}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={!selectedBlock}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={exporting}
          onClick={() => void onDownload()}
        >
          {exporting ? "Exporting…" : "Download PDF"}
        </button>
        <button type="button" className="button" onClick={onReset}>
          New file
        </button>
      </div>
    </section>
  );
}
