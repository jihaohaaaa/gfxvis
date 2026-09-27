import type { ReactNode } from "react";

export interface KdeCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  headerAction?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "highlight" | "inset" | "dense";
  className?: string;
  testId?: string;
}

const VARIANT_CONTAINER_CLASSES: Record<
  NonNullable<KdeCardProps["variant"]>,
  string
> = {
  default:
    "border-[var(--kde-border)] bg-[var(--kde-raised)] text-[var(--kde-ink)] shadow-sm",
  highlight:
    "border-[var(--kde-accent)]/60 bg-[var(--kde-raised)] text-[var(--kde-ink)] shadow-md ring-1 ring-[var(--kde-accent)]/30",
  inset:
    "border-[var(--kde-border)] bg-[var(--kde-panel)] text-[var(--kde-ink)] shadow-inner",
  dense:
    "border-[var(--kde-border)] bg-[var(--kde-raised)] text-[var(--kde-ink)] p-2 shadow-xs",
};

export default function KdeCard({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  footer,
  variant = "default",
  className = "",
  testId,
}: KdeCardProps) {
  const hasHeader = Boolean(title || subtitle || badge || headerAction);
  const paddingClass = variant === "dense" ? "p-2.5" : "p-3.5";

  return (
    <div
      className={`kde-card relative flex flex-col rounded-[var(--kde-card-radius,0.45rem)] border transition ${paddingClass} ${VARIANT_CONTAINER_CLASSES[variant]} ${className}`}
      data-testid={testId}
      data-console-panel
    >
      {hasHeader && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--kde-border)]/60 pb-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {title && (
                <div className="text-xs font-semibold text-[var(--kde-ink)]">
                  {title}
                </div>
              )}
              {badge}
            </div>
            {subtitle && (
              <div className="text-[11px] text-[var(--kde-muted)]">
                {subtitle}
              </div>
            )}
          </div>
          {headerAction && (
            <div className="flex items-center gap-1.5">{headerAction}</div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">{children}</div>

      {footer && (
        <div className="mt-2.5 border-t border-[var(--kde-border)]/60 pt-2 text-xs text-[var(--kde-muted)]">
          {footer}
        </div>
      )}
    </div>
  );
}
