import React from "react";

export interface PresetOption<T extends string = string> {
  id?: T;
  value?: T;
  label?: string;
  name?: string;
  description?: string;
}

export type PresetItem<T extends string = string> = PresetOption<T>;

interface Props<T extends string = string> {
  label?: string | React.ReactNode;
  options:
    Array<PresetOption<T>> | Record<string, { name?: string; label?: string }>;
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

/**
 * Reusable preset selector pill-button group for visualization demos.
 */
export default function PresetSelector<T extends string = string>({
  label = "快捷预设:",
  options,
  value,
  onChange,
  className = "",
}: Props<T>) {
  const items: Array<{ id: T; label: string }> = Array.isArray(options)
    ? options.map((opt) => ({
        id: (opt.id ?? opt.value ?? "") as T,
        label: (opt.label ?? opt.name ?? "") as string,
      }))
    : (Object.keys(options) as T[]).map((key) => {
        const entry = (
          options as Record<string, { name?: string; label?: string }>
        )[key];
        return {
          id: key as T,
          label: entry?.name ?? entry?.label ?? key,
        };
      });

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      {label && <span className="text-muted font-medium">{label}</span>}
      {items.map((item) => (
        <button
          key={String(item.id)}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${
            value === item.id
              ? "bg-accent text-accent-foreground"
              : "bg-surface-hover text-foreground hover:bg-border"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
