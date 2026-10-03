import type { ReactNode } from "react";

export type KdeProgressBarVariant =
  "accent" | "primary" | "success" | "warning" | "danger";

export interface KdeProgressBarProps {
  /** Current progress value (e.g. 3) */
  value: number;
  /** Maximum progress value (default 100) */
  max?: number;
  /** Optional discrete step markers count (for step-by-step state progress, e.g. steps=4) */
  steps?: number;
  /** Visual color variant */
  variant?: KdeProgressBarVariant;
  /** Size density: xs (2px), sm (4px), md (6px) */
  size?: "xs" | "sm" | "md";
  /** Optional title or description rendered on the left of header */
  label?: ReactNode;
  /** Whether to show label (default true if label provided) */
  showLabel?: boolean;
  /** Whether to show percentage or step readout on the right */
  showValue?: boolean;
  /** Custom formatted value string override (e.g. "Step 2 of 5") */
  valueDisplay?: ReactNode;
  /** Striped animation style */
  striped?: boolean;
  className?: string;
  testId?: string;
}

const VARIANT_FILL_CLASSES: Record<KdeProgressBarVariant, string> = {
  accent: "bg-[var(--kde-accent,#3daee9)]",
  primary: "bg-indigo-600 dark:bg-indigo-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

const SIZE_HEIGHT_CLASSES = {
  xs: "h-1.5",
  sm: "h-2",
  md: "h-3",
};

/**
 * KDE Plasma Breeze Progress Bar component (QProgressBar).
 * Supports continuous value percentage progress, discrete stepper markers,
 * custom value display, and recessed track style.
 */
export default function KdeProgressBar({
  value,
  max,
  steps,
  variant = "accent",
  size = "sm",
  label,
  showLabel = true,
  showValue = false,
  valueDisplay,
  striped = false,
  className = "",
  testId,
}: KdeProgressBarProps) {
  const effectiveMax = max ?? steps ?? 100;
  const percentage = Math.min(100, Math.max(0, (value / effectiveMax) * 100));
  const heightClass = SIZE_HEIGHT_CLASSES[size];
  const fillClass = VARIANT_FILL_CLASSES[variant];
  const hasLabel = Boolean(label && showLabel);

  return (
    <div
      data-testid={testId}
      className={`kde-progress-bar flex flex-col gap-1.5 ${className}`}
    >
      {(hasLabel || showValue || valueDisplay) && (
        <div className="flex items-center justify-between text-xs">
          {hasLabel && (
            <span className="font-medium text-[var(--kde-ink,#232629)]">
              {label}
            </span>
          )}
          {(showValue || valueDisplay) && (
            <span className="font-mono text-[11px] text-[var(--kde-muted,#626b73)]">
              {valueDisplay ?? `${Math.round(percentage)}%`}
            </span>
          )}
        </div>
      )}

      {/* Track & Fill */}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`relative w-full overflow-hidden rounded-full border border-[var(--kde-border,#bec5cc)]/40 bg-[var(--kde-panel,#eff0f1)] shadow-inner ${heightClass}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${fillClass} ${
            striped
              ? "bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"
              : ""
          }`}
          style={{ width: `${percentage}%` }}
        />

        {/* Step Marker Divider Overlay */}
        {steps !== undefined && steps > 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-0.5">
            {Array.from({ length: steps - 1 }).map((_, idx) => (
              <div
                key={idx}
                className="h-full w-px bg-[var(--kde-border,#bec5cc)] opacity-60"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
