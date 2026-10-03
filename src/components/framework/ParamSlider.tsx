import type { ReactNode } from "react";
import { AutoMath } from "./AutoMath";
import "./ParamSlider.css";

interface ParamSliderProps {
  /** Label rendered before the range input (KaTeX node, string with $...$, or plain text). */
  label: ReactNode;
  /** Allow prose wrapping, adaptive layout, or stacked top-label / full-width slider. */
  labelMode?: "flow" | "adaptive" | "stacked";
  min: number;
  max: number;
  step: number;
  value: number;
  onChange(value: number): void;
  widthClass?: string;
  /** Override the displayed value (e.g. "8³" for density). */
  display?: string;
  digits?: number;
}

/** Labeled range slider with a tabular-numeric readout (shared control). */
export default function ParamSlider({
  label,
  labelMode = "flow",
  min,
  max,
  step,
  value,
  onChange,
  widthClass = "w-44",
  display,
  digits = 2,
}: ParamSliderProps) {
  const renderedLabel =
    typeof label === "string" ? (
      <AutoMath as="span" className="text-sm">
        {label}
      </AutoMath>
    ) : (
      label
    );

  const renderedDisplay =
    typeof display === "string" ? (
      <AutoMath as="span" className="tabular-nums">
        {display}
      </AutoMath>
    ) : (
      <span className="tabular-nums">{value.toFixed(digits)}</span>
    );

  if (labelMode === "stacked") {
    return (
      <label
        className="param-slider param-slider--stacked flex w-full flex-col gap-1 text-muted"
        data-label-mode="stacked"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="param-slider__label font-medium text-[var(--kde-ink,#232629)]">
            {renderedLabel}
          </span>
          <span className="param-slider__value font-mono text-[var(--kde-accent,#3daee9)]">
            {renderedDisplay}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="param-slider__input w-full cursor-pointer accent-[var(--color-accent)]"
        />
      </label>
    );
  }

  return (
    <label
      className={`param-slider param-slider--${labelMode} flex items-center gap-2 text-muted`}
      data-label-mode={labelMode}
    >
      <span className="param-slider__label">{renderedLabel}</span>
      <span className="param-slider__controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`param-slider__input ${widthClass} accent-[var(--color-accent)]`}
        />
        <span className="param-slider__value tabular-nums">
          {renderedDisplay}
        </span>
      </span>
    </label>
  );
}
