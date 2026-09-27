import type { ReactNode } from "react";

export interface KdeGroupBoxProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  testId?: string;
}

export default function KdeGroupBox({
  title,
  subtitle,
  badge,
  action,
  children,
  className = "",
  testId,
}: KdeGroupBoxProps) {
  return (
    <div
      className={`kde-group-box flex flex-col gap-2 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--kde-border)]/50 pb-1 text-[11px] font-semibold tracking-wider text-[var(--kde-muted)]">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge}
        </div>
        {action && <div className="flex items-center gap-1.5">{action}</div>}
      </div>

      {subtitle && (
        <p className="text-xs leading-relaxed text-[var(--kde-muted)]">
          {subtitle}
        </p>
      )}

      {children && <div className="min-w-0">{children}</div>}
    </div>
  );
}
