"use client";

import { useEffect } from "react";
import {
  PAGEINK_COLOR_PRESETS,
  PAGEINK_SIGNATURE_STYLES,
  type PageInkSignatureStyle,
} from "@korykaai/pageink-core";
import { SIGNATURE_FONT_STACKS, preloadSignatureFonts } from "@/lib/signature-fonts";

export type SignatureDraft = {
  text: string;
  style: PageInkSignatureStyle;
  fontSize: number;
  color: string;
};

export function SignatureComposer({
  value,
  onChange,
  onPlace,
  placeDisabled,
  placeLabel,
  hint,
}: {
  value: SignatureDraft;
  onChange: (patch: Partial<SignatureDraft>) => void;
  onPlace?: () => void;
  placeDisabled?: boolean;
  placeLabel?: string;
  hint?: string;
}) {
  const previewName = value.text.trim() || "Your name";

  useEffect(() => {
    preloadSignatureFonts();
  }, []);

  return (
    <div className="pageink-sign">
      <div className="pageink-sign__preview" aria-hidden>
        <p
          className="pageink-sign__preview-name"
          style={{
            fontFamily: SIGNATURE_FONT_STACKS[value.style],
            color: value.color,
            fontSize: `${Math.max(22, Math.min(36, value.fontSize))}px`,
          }}
        >
          {previewName}
        </p>
      </div>

      <label className="pageink-field">
        Name
        <input
          className="pageink-input pageink-input--sign"
          type="text"
          autoComplete="name"
          spellCheck={false}
          placeholder="Type your name"
          value={value.text}
          style={{
            fontFamily: SIGNATURE_FONT_STACKS[value.style],
            color: value.color,
          }}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>

      <fieldset className="pageink-sign__styles">
        <legend className="pageink-field__label">Style</legend>
        <div className="pageink-sign__style-grid" role="radiogroup" aria-label="Signature style">
          {PAGEINK_SIGNATURE_STYLES.map((style) => {
            const selected = value.style === style.id;
            return (
              <button
                key={style.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`pageink-sign__style${selected ? " pageink-sign__style--active" : ""}`}
                title={style.description}
                onClick={() => onChange({ style: style.id })}
              >
                <span
                  className="pageink-sign__style-sample"
                  style={{ fontFamily: SIGNATURE_FONT_STACKS[style.id] }}
                >
                  {previewName}
                </span>
                <span className="pageink-sign__style-label">{style.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="pageink-field">
        <span className="pageink-sign__size-row">
          Size
          <span className="pageink-sign__size-value">{value.fontSize} pt</span>
        </span>
        <input
          className="pageink-sign__size"
          type="range"
          min={16}
          max={64}
          value={value.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) || 28 })}
        />
      </label>

      <div className="pageink-field">
        <span className="pageink-field__label">Ink</span>
        <div className="pageink-swatches">
          {PAGEINK_COLOR_PRESETS.filter((color) => color !== "#ffffff").map((color) => (
            <button
              key={color}
              type="button"
              className={`pageink-swatch${value.color === color ? " pageink-swatch--active" : ""}`}
              style={{ background: color }}
              aria-label={`Ink ${color}`}
              onClick={() => onChange({ color })}
            />
          ))}
          <input
            type="color"
            className="pageink-color-input"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            aria-label="Custom ink color"
          />
        </div>
      </div>

      {onPlace ? (
        <button
          type="button"
          className="pageink-btn pageink-btn--primary pageink-sign__place"
          disabled={placeDisabled}
          onClick={onPlace}
        >
          {placeLabel ?? "Place on page"}
        </button>
      ) : null}

      {hint ? <p className="pageink-sign__hint">{hint}</p> : null}
    </div>
  );
}
