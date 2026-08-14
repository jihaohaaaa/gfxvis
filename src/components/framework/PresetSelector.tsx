import React from "react";

export interface PresetItem<T extends string = string> {
  id: T;
  label: string;
}

interface Props<T extends string = string> {
  label?: string | React.ReactNode;
  options: Array<PresetItem<T>> | Record<T, { name: string }>;
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
    ? options
    : (Object.keys(options) as T[]).map((key) => ({
        id: key,
        label: (options as Record<T, { name: string }>)[key].name,
      }));

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      {label && <span className="text-muted font-medium">{label}</span>}
      {items.map((item) => (
        <button
          key={item.id}
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
