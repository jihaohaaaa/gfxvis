import type { ReactNode } from "react";

interface ParamSliderProps {
  /** Label rendered before the range input (KaTeX node or plain text). */
  label: ReactNode;
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
    <label className="flex items-center gap-2 text-muted">
      {typeof label === "string" ? (
        <span className="text-sm">{label}</span>
      ) : (
        label
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`${widthClass} accent-[var(--color-accent)]`}
      />
      <span className="tabular-nums">{display ?? value.toFixed(digits)}</span>
    </label>
  );
}
