import { useEffect, useRef, type ReactNode } from "react";

export interface KdeCheckboxProps {
  /** Checked boolean state */
  checked: boolean;
  /** Change callback */
  onChange(checked: boolean): void;
  /** Primary label rendered next to checkbox */
  label?: ReactNode;
  /** Optional descriptive text beneath label */
  description?: ReactNode;
  /** Indeterminate state (e.g. parent checkbox with partially selected children) */
  indeterminate?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size density: xs (compact) or sm (default) */
  size?: "xs" | "sm";
  className?: string;
  testId?: string;
}

/**
 * KDE Plasma Breeze Checkbox component (QCheckBox).
 * Features authentic Breeze micro-bevel, custom SVG check/indeterminate glyphs,
 * keyboard accessibility, and secondary description slot.
 */
export default function KdeCheckbox({
  checked,
  onChange,
  label,
  description,
  indeterminate = false,
  disabled = false,
  size = "sm",
  className = "",
  testId,
}: KdeCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const isXs = size === "xs";
  const boxSize = isXs ? "h-3.5 w-3.5" : "h-4 w-4";
  const labelTextSize = isXs ? "text-xs" : "text-xs sm:text-sm";

  return (
    <label
      data-testid={testId}
      className={`kde-checkbox group inline-flex select-none items-start gap-2.5 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        {/* Breeze Checkbox Box */}
        <div
          className={`pointer-events-none flex ${boxSize} items-center justify-center rounded-[var(--kde-control-radius,0.25rem)] border transition-all duration-150 ${
            checked || indeterminate
              ? "border-[var(--kde-accent,#3daee9)] bg-[var(--kde-accent,#3daee9)] text-[var(--kde-accent-ink,#102630)] shadow-xs"
              : "border-[var(--kde-border,#bec5cc)] bg-[var(--kde-raised,#fcfcfd)] group-hover:border-[var(--kde-accent,#3daee9)]/60"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--kde-accent,#3daee9)]/40 peer-focus-visible:ring-offset-1`}
        >
          {checked && !indeterminate && (
            <svg
              className={isXs ? "h-2.5 w-2.5" : "h-3 w-3"}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6l3 3 5-6" />
            </svg>
          )}

          {indeterminate && (
            <svg
              className={isXs ? "h-2 w-2" : "h-2.5 w-2.5"}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M2 6h8" />
            </svg>
          )}
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className={`font-medium leading-tight text-[var(--kde-ink,#232629)] transition-colors ${labelTextSize} ${
                !disabled ? "group-hover:text-[var(--kde-accent,#3daee9)]" : ""
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
