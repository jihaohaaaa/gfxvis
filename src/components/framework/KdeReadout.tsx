import type { ReactNode } from "react";

export type KdeReadoutVariant =
  "default" | "accent" | "success" | "warning" | "danger" | "formula";

export interface KdeReadoutProps {
  label: ReactNode;
  value: ReactNode;
  subValue?: ReactNode;
  badge?: ReactNode;
  variant?: KdeReadoutVariant;
  dense?: boolean;
  className?: string;
  testId?: string;
}

const VARIANT_CONTAINER_CLASSES: Record<KdeReadoutVariant, string> = {
  default:
    "border-[var(--kde-border)] bg-[var(--kde-raised)] text-[var(--kde-ink)]",
  accent:
    "border-[var(--kde-accent)]/50 bg-[var(--kde-accent)]/10 text-[var(--kde-ink)] ring-1 ring-[var(--kde-accent)]/20",
  success:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/20",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20",
  danger:
    "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/20",
  formula:
    "border-[var(--kde-border)] bg-[var(--kde-panel)]/80 text-[var(--kde-ink)]",
};

const VARIANT_VALUE_CLASSES: Record<KdeReadoutVariant, string> = {
  default: "text-[var(--kde-ink)]",
  accent: "text-[var(--kde-accent)] font-bold",
  success: "text-emerald-600 dark:text-emerald-400 font-bold",
  warning: "text-amber-600 dark:text-amber-400 font-bold",
  danger: "text-rose-600 dark:text-rose-400 font-bold",
  formula: "text-[var(--kde-ink)] font-mono",
};

export default function KdeReadout({
  label,
  value,
  subValue,
  badge,
  variant = "default",
  dense = false,
  className = "",
  testId,
}: KdeReadoutProps) {
  const paddingClass = dense ? "p-2" : "p-2.5";

  return (
    <div
      className={`kde-readout flex min-w-0 flex-col justify-between rounded-[var(--kde-control-radius,0.35rem)] border shadow-xs transition ${paddingClass} ${VARIANT_CONTAINER_CLASSES[variant]} ${className}`}
      data-testid={testId}
      data-console-readout
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-[var(--kde-border)]/40 pb-1">
        <span className="truncate text-[11px] font-medium text-[var(--kde-muted)]">
          {label}
        </span>
        {badge}
      </div>

      <div
        className={`mt-1.5 min-w-0 overflow-x-auto font-mono text-xs ${VARIANT_VALUE_CLASSES[variant]}`}
      >
        {value}
      </div>

      {subValue && (
        <div className="mt-1 text-[10px] text-[var(--kde-muted)]">
          {subValue}
        </div>
      )}
    </div>
  );
}
