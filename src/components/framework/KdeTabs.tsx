import type { ReactNode } from "react";

export interface KdeTabOption<T extends string> {
  id: T;
  label: string;
  badge?: string | number;
  icon?: ReactNode;
}

export interface KdeTabsProps<T extends string> {
  options: readonly KdeTabOption<T>[];
  value: T;
  onChange(id: T): void;
  /** Tab size: sm for primary navigation/window tabs, xs for compact racks */
  size?: "xs" | "sm" | "md";
  /** Visual variant: default (Breeze desktop underline tab), pill (rounded capsule), subtle (flat toolbar) */
  variant?: "default" | "pill" | "subtle";
  /** Optional label rendered before the tab list */
  label?: string;
  className?: string;
  testId?: string;
}

/**
 * KDE Plasma Breeze Tab Bar component.
 * Provides desktop-style tab switching with active accent indicators,
 * subtle hover states, badge counts, and full ARIA accessibility.
 */
export default function KdeTabs<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  variant = "default",
  label,
  className = "",
  testId,
}: KdeTabsProps<T>) {
  const isXs = size === "xs";
  const isMd = size === "md";

  const paddingClass =
    variant === "pill"
      ? isXs
        ? "px-2.5 py-0.5 text-xs"
        : isMd
          ? "px-4 py-1.5 text-sm"
          : "px-3 py-1 text-xs sm:text-sm"
      : isXs
        ? "px-2 py-1 text-xs"
        : isMd
          ? "px-3.5 py-1.5 text-sm"
          : "px-2.5 py-1.5 text-xs sm:text-sm";

  return (
    <div
      data-testid={testId}
      className={`inline-flex items-center gap-1 overflow-x-auto ${className}`}
    >
      {label && (
        <span className="mr-1.5 shrink-0 text-xs font-medium text-[var(--kde-muted,#626b73)]">
          {label}
        </span>
      )}
      <div
        className={
          variant === "pill"
            ? "flex flex-wrap items-center gap-1 rounded-[var(--kde-control-radius,0.35rem)] bg-[var(--kde-panel,#eff0f1)] p-0.5"
            : "flex items-center gap-0.5 border-b border-[var(--kde-border,#bec5cc)]"
        }
      >
        {options.map((opt) => {
          const isActive = value === opt.id;
          let buttonClasses = `inline-flex cursor-pointer items-center gap-1.5 font-medium transition-all ${paddingClass} `;

          if (variant === "pill") {
            buttonClasses += isActive
              ? "rounded-[var(--kde-control-radius,0.35rem)] bg-[var(--kde-accent,#3daee9)] text-[var(--kde-accent-ink,#102630)] shadow-xs font-semibold"
              : "rounded-[var(--kde-control-radius,0.35rem)] text-[var(--kde-muted,#626b73)] hover:bg-[var(--kde-raised,#fcfcfd)] hover:text-[var(--kde-ink,#232629)]";
          } else if (variant === "subtle") {
            buttonClasses += isActive
              ? "rounded-[var(--kde-control-radius,0.35rem)] bg-[var(--kde-accent,#3daee9)]/15 text-[var(--kde-accent,#3daee9)] font-semibold"
              : "rounded-[var(--kde-control-radius,0.35rem)] text-[var(--kde-muted,#626b73)] hover:bg-[var(--kde-panel,#eff0f1)] hover:text-[var(--kde-ink,#232629)]";
          } else {
            // Default Breeze desktop tab
            buttonClasses += isActive
              ? "border-b-2 border-[var(--kde-accent,#3daee9)] text-[var(--kde-accent,#3daee9)] bg-[var(--kde-raised,#fcfcfd)] -mb-px font-semibold shadow-xs"
              : "border-b-2 border-transparent text-[var(--kde-muted,#626b73)] hover:text-[var(--kde-ink,#232629)] hover:bg-[var(--kde-panel,#eff0f1)]/60";
          }

          return (
            <button
              key={opt.id}
              type="button"
              aria-selected={isActive}
              aria-pressed={isActive}
              onClick={() => onChange(opt.id)}
              className={buttonClasses}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold ${
                    isActive
                      ? "bg-[var(--kde-accent-ink,#102630)]/15 text-[var(--kde-accent-ink,#102630)]"
                      : "bg-[var(--kde-border,#bec5cc)]/40 text-[var(--kde-muted,#626b73)]"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
