import type { ReactNode } from "react";
import KdeButton from "./KdeButton";

export interface PresetOption<T extends string = string> {
  id?: T;
  value?: T;
  label?: string;
  name?: string;
  description?: string;
  desc?: string;
  badge?: ReactNode;
}

export type PresetItem<T extends string = string> = PresetOption<T>;

export interface PresetSelectorProps<T extends string = string> {
  label?: string | ReactNode;
  options:
    | Array<PresetOption<T>>
    | Record<
        string,
        {
          name?: string;
          label?: string;
          desc?: string;
          description?: string;
        }
      >;
  value: T;
  onChange: (val: T) => void;
  /** Size density: xs, sm (default), md */
  size?: "xs" | "sm" | "md";
  /** Layout mode: horizontal (inline wrap), vertical (full-width stack), or grid */
  layout?: "horizontal" | "vertical" | "grid";
  /** Number of columns when layout is grid */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  testId?: string;
}

/**
 * KDE Plasma Breeze Preset Selector component.
 * Standardizes preset selection across diagrams and demos using native KdeButton.
 */
export default function PresetSelector<T extends string = string>({
  label = "快捷预设:",
  options,
  value,
  onChange,
  size = "sm",
  layout = "horizontal",
  columns = 2,
  className = "",
  testId,
}: PresetSelectorProps<T>) {
  const items: Array<{ id: T; label: string; description?: string }> =
    Array.isArray(options)
      ? options.map((opt) => ({
          id: (opt.id ?? opt.value ?? "") as T,
          label: (opt.label ?? opt.name ?? "") as string,
          description: opt.description ?? opt.desc,
        }))
      : (Object.keys(options) as T[]).map((key) => {
          const entry = (
            options as Record<
              string,
              {
                name?: string;
                label?: string;
                desc?: string;
                description?: string;
              }
            >
          )[key];
          return {
            id: key as T,
            label: entry?.name ?? entry?.label ?? key,
            description: entry?.description ?? entry?.desc,
          };
        });

  if (layout === "vertical") {
    return (
      <div
        role="group"
        data-testid={testId}
        className={`kde-preset-selector flex flex-col gap-1 w-full ${className}`}
      >
        {label && (
          <span className="text-xs font-semibold text-[var(--kde-muted)] mb-0.5">
            {label}
          </span>
        )}
        {items.map((item) => {
          const isSelected = value === item.id;
          return (
            <KdeButton
              key={String(item.id)}
              size={size}
              variant={isSelected ? "primary" : "default"}
              onClick={() => onChange(item.id)}
              className="w-full justify-start text-left truncate"
              title={item.description}
            >
              <span className="truncate">{item.label}</span>
            </KdeButton>
          );
        })}
      </div>
    );
  }

  if (layout === "grid") {
    const gridColsClass =
      columns === 1
        ? "grid-cols-1"
        : columns === 2
          ? "grid-cols-2"
          : columns === 3
            ? "grid-cols-3"
            : "grid-cols-4";

    return (
      <div
        role="group"
        data-testid={testId}
        className={`kde-preset-selector grid ${gridColsClass} gap-1.5 w-full ${className}`}
      >
        {items.map((item) => {
          const isSelected = value === item.id;
          return (
            <KdeButton
              key={String(item.id)}
              size={size}
              variant={isSelected ? "primary" : "default"}
              onClick={() => onChange(item.id)}
              className="w-full justify-center text-center truncate"
              title={item.description}
            >
              <span className="truncate">{item.label}</span>
            </KdeButton>
          );
        })}
      </div>
    );
  }

  // Default horizontal flex-wrap layout
  return (
    <div
      role="group"
      data-testid={testId}
      className={`kde-preset-selector flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {label && (
        <span className="text-xs font-semibold text-[var(--kde-muted)] mr-0.5">
          {label}
        </span>
      )}
      {items.map((item) => {
        const isSelected = value === item.id;
        return (
          <KdeButton
            key={String(item.id)}
            size={size}
            variant={isSelected ? "primary" : "default"}
            onClick={() => onChange(item.id)}
            title={item.description}
          >
            {item.label}
          </KdeButton>
        );
      })}
    </div>
  );
}
