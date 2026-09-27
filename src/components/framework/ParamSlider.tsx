import type { ReactNode } from "react";
import { AutoMath } from "./AutoMath";
import "./ParamSlider.css";

interface ParamSliderProps {
  /** Label rendered before the range input (KaTeX node, string with $...$, or plain text). */
  label: ReactNode;
  /** Allow prose wrapping, or keep the label together and move it above when space is tight. */
  labelMode?: "flow" | "adaptive";
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
  return (
    <label
      className={`param-slider param-slider--${labelMode} flex items-center gap-2 text-muted`}
      data-label-mode={labelMode}
    >
      <span className="param-slider__label">
        {typeof label === "string" ? (
          <AutoMath as="span" className="text-sm">
            {label}
          </AutoMath>
        ) : (
          label
        )}
      </span>
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
          {display ?? value.toFixed(digits)}
        </span>
      </span>
    </label>
  );
}
