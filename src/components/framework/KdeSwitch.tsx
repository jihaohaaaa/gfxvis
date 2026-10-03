import type { ReactNode } from "react";

export interface KdeSwitchProps {
  /** Checked boolean state */
  checked: boolean;
  /** Change callback */
  onChange(checked: boolean): void;
  /** Primary label rendered next to switch */
  label?: ReactNode;
  /** Optional descriptive text beneath label */
  description?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Size density: xs (compact) or sm (default) */
  size?: "xs" | "sm";
  /** Optional loading state */
  loading?: boolean;
  className?: string;
  testId?: string;
}

/**
 * KDE Plasma Breeze Switch / Toggle Indicator component (KSwitchIndicator).
 * Features smooth sliding thumb animation, recessed track, and high-contrast focus rings.
 */
export default function KdeSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "sm",
  loading = false,
  className = "",
  testId,
}: KdeSwitchProps) {
  const isXs = size === "xs";
  const trackClass = isXs ? "h-4 w-7 p-0.5" : "h-5 w-9 p-0.5";
  const thumbClass = isXs
    ? `h-3 w-3 ${checked ? "translate-x-3" : "translate-x-0"}`
    : `h-4 w-4 ${checked ? "translate-x-4" : "translate-x-0"}`;
  const labelTextSize = isXs ? "text-xs" : "text-xs sm:text-sm";

  return (
    <label
      data-testid={testId}
      className={`kde-switch group inline-flex select-none items-start gap-2.5 ${
        disabled || loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        {/* Breeze Switch Track */}
        <div
          className={`pointer-events-none flex items-center rounded-full border transition-all duration-200 ease-out ${trackClass} ${
            checked
              ? "border-[var(--kde-accent,#3daee9)] bg-[var(--kde-accent,#3daee9)] shadow-xs"
              : "border-[var(--kde-border,#bec5cc)] bg-[var(--kde-panel,#eff0f1)] group-hover:border-[var(--kde-accent,#3daee9)]/50"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--kde-accent,#3daee9)]/40 peer-focus-visible:ring-offset-1`}
        >
          {/* Sliding Thumb */}
          <div
            className={`rounded-full bg-[var(--kde-raised,#fcfcfd)] shadow-sm transition-transform duration-200 ease-out ${thumbClass} flex items-center justify-center`}
          >
            {loading && (
              <svg
                className="h-2 w-2 animate-spin text-[var(--kde-accent,#3daee9)]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className={`font-medium leading-tight text-[var(--kde-ink,#232629)] transition-colors ${labelTextSize} ${
                !disabled && !loading
                  ? "group-hover:text-[var(--kde-accent,#3daee9)]"
                  : ""
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="mt-0.5 text-[11px] leading-relaxed text-[var(--kde-muted,#626b73)]">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
