import type { ReactNode } from "react";

export interface KdeOptionItem<T extends string | number = string> {
  id: T;
  label: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface KdeOptionGroupProps<T extends string | number = string> {
  options: readonly KdeOptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  orientation?: "vertical" | "horizontal";
  size?: "xs" | "sm" | "md";
  label?: ReactNode;
  className?: string;
  testId?: string;
}

export function KdeOptionGroup<T extends string | number = string>({
  options,
  value,
  onChange,
  orientation = "vertical",
  size = "sm",
  label,
  className = "",
  testId,
}: KdeOptionGroupProps<T>) {
  const isVertical = orientation === "vertical";

  const sizePadding =
    size === "xs"
      ? "px-2 py-1 text-[11px]"
      : size === "md"
        ? "px-3.5 py-2.5 text-sm"
        : "px-2.5 py-1.5 text-xs";

  return (
    <div
      className={`flex flex-col gap-1.5 text-left ${className}`}
      data-testid={testId}
    >
      {label && (
        <div className="text-[11px] font-semibold text-[var(--kde-muted)]">
          {label}
        </div>
      )}

      <div
        className={`flex ${
          isVertical ? "flex-col gap-1.5" : "flex-wrap gap-2"
        }`}
      >
        {options.map((opt) => {
          const isSelected = opt.id === value;
          const hasDetails = Boolean(opt.description || opt.badge);

          return (
            <button
              key={String(opt.id)}
              type="button"
              disabled={opt.disabled}
              onClick={() => onChange(opt.id)}
              className={`group flex items-center justify-between rounded-[var(--kde-control-radius,0.35rem)] border text-left transition select-none cursor-pointer disabled:pointer-events-none disabled:opacity-40 ${sizePadding} ${
                isSelected
                  ? hasDetails
                    ? "border-[var(--kde-accent)] bg-[var(--kde-accent)]/15 text-[var(--kde-ink)] ring-1 ring-[var(--kde-accent)]/40 shadow-xs"
                    : "border-[var(--kde-accent)] bg-[var(--kde-accent)] text-[var(--kde-accent-contrast)] shadow-xs"
                  : "border-[var(--kde-border)] bg-[var(--kde-raised)] text-[var(--kde-ink)] hover:bg-[var(--kde-panel)] active:bg-[var(--kde-base)]"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="font-medium">{opt.label}</div>
                {opt.description && (
                  <div
                    className={`text-[10px] leading-relaxed ${
                      isSelected
                        ? "text-[var(--kde-ink)]/80"
                        : "text-[var(--kde-muted)]"
                    }`}
                  >
                    {opt.description}
                  </div>
                )}
              </div>

              {opt.badge && <div className="ml-2 shrink-0">{opt.badge}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default KdeOptionGroup;
