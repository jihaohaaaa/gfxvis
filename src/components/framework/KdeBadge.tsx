import type { ReactNode } from "react";

export type KdeBadgeVariant =
  "default" | "primary" | "success" | "warning" | "danger" | "neutral";

export interface KdeBadgeProps {
  children: ReactNode;
  variant?: KdeBadgeVariant;
  className?: string;
  size?: "sm" | "xs";
}

const VARIANT_CLASSES: Record<KdeBadgeVariant, string> = {
  default:
    "border-border bg-[var(--kde-raised)] text-[var(--kde-muted)] dark:bg-[var(--kde-raised)] dark:text-[var(--kde-muted)]",
  primary:
    "border-[var(--kde-accent)]/40 bg-[var(--kde-accent)]/15 text-[var(--kde-accent)] dark:border-[var(--kde-accent)]/50 dark:bg-[var(--kde-accent)]/20 dark:text-[var(--kde-accent)]",
  success:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning:
    "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-300",
  danger:
    "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-300",
  neutral:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function KdeBadge({
  children,
  variant = "default",
  className = "",
  size = "xs",
}: KdeBadgeProps) {
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] font-semibold"
      : "px-2 py-0.5 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--kde-control-radius,0.35rem)] border font-mono uppercase tracking-wider ${sizeClass} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
