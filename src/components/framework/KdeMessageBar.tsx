import type { ReactNode } from "react";

export type KdeMessageBarVariant =
  "info" | "success" | "warning" | "danger" | "neutral";

export type KdeMessageBarMode = "card" | "banner" | "inline";

export interface KdeMessageBarProps {
  /** Visual variant: info (blue/accent), success (emerald), warning (amber), danger (rose), neutral (muted) */
  variant?: KdeMessageBarVariant;
  /** Layout mode: card (micro-border panel), banner (full-width banner), inline (compact pill) */
  mode?: KdeMessageBarMode;
  /** Primary title of the message */
  title?: ReactNode;
  /** Message content or details */
  children?: ReactNode;
  /** Custom icon override or false to hide icon */
  icon?: ReactNode | false;
  /** Optional action button or link rendered on the right */
  action?: ReactNode;
  /** Callback when close button is clicked (renders close icon when provided) */
  onClose?: () => void;
  /** Compact density for dense control racks and status badges */
  compact?: boolean;
  className?: string;
  testId?: string;
}

const VARIANT_STYLES: Record<
  KdeMessageBarVariant,
  {
    card: string;
    banner: string;
    inline: string;
    iconColor: string;
    titleColor: string;
    badgeBg: string;
    defaultIcon: ReactNode;
  }
> = {
  info: {
    card: "border-[var(--kde-accent,#3daee9)]/50 bg-[var(--kde-accent,#3daee9)]/10 text-[var(--kde-ink,#232629)] ring-1 ring-[var(--kde-accent,#3daee9)]/20",
    banner:
      "border-y border-[var(--kde-accent,#3daee9)]/40 bg-[var(--kde-accent,#3daee9)]/10 text-[var(--kde-ink,#232629)]",
    inline:
      "border border-[var(--kde-accent,#3daee9)]/40 bg-[var(--kde-accent,#3daee9)]/10 text-[var(--kde-accent,#3daee9)]",
    iconColor: "text-[var(--kde-accent,#3daee9)]",
    titleColor: "text-[var(--kde-accent,#3daee9)] font-bold",
    badgeBg:
      "bg-[var(--kde-accent,#3daee9)]/20 text-[var(--kde-accent,#3daee9)]",
    defaultIcon: (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  success: {
    card: "border-emerald-500/50 bg-emerald-500/10 text-[var(--kde-ink,#232629)] ring-1 ring-emerald-500/20",
    banner:
      "border-y border-emerald-500/40 bg-emerald-500/10 text-[var(--kde-ink,#232629)]",
    inline:
      "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-700 dark:text-emerald-300 font-bold",
    badgeBg: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    defaultIcon: (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    card: "border-amber-500/50 bg-amber-500/10 text-[var(--kde-ink,#232629)] ring-1 ring-amber-500/20",
    banner:
      "border-y border-amber-500/40 bg-amber-500/10 text-[var(--kde-ink,#232629)]",
    inline:
      "border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-800 dark:text-amber-300 font-bold",
    badgeBg: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    defaultIcon: (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  danger: {
    card: "border-rose-500/50 bg-rose-500/10 text-[var(--kde-ink,#232629)] ring-1 ring-rose-500/20",
    banner:
      "border-y border-rose-500/40 bg-rose-500/10 text-[var(--kde-ink,#232629)]",
    inline:
      "border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    iconColor: "text-rose-600 dark:text-rose-400",
    titleColor: "text-rose-700 dark:text-rose-300 font-bold",
    badgeBg: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
    defaultIcon: (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  neutral: {
    card: "border-[var(--kde-border,#bec5cc)] bg-[var(--kde-panel,#eff0f1)] text-[var(--kde-ink,#232629)]",
    banner:
      "border-y border-[var(--kde-border,#bec5cc)] bg-[var(--kde-panel,#eff0f1)] text-[var(--kde-ink,#232629)]",
    inline:
      "border border-[var(--kde-border,#bec5cc)] bg-[var(--kde-panel,#eff0f1)] text-[var(--kde-muted,#626b73)]",
    iconColor: "text-[var(--kde-muted,#626b73)]",
    titleColor: "text-[var(--kde-ink,#232629)] font-semibold",
    badgeBg:
      "bg-[var(--kde-border,#bec5cc)]/30 text-[var(--kde-muted,#626b73)]",
    defaultIcon: (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

/**
 * KDE Plasma Breeze Message Bar / Alert component (KMessageWidget).
 * Provides structured, accessible visual feedback with rich icon slots,
 * title/content separation, actions, and KaTeX mathematical support.
 */
export default function KdeMessageBar({
  variant = "info",
  mode = "card",
  title,
  children,
  icon,
  action,
  onClose,
  compact = false,
  className = "",
  testId,
}: KdeMessageBarProps) {
  const styles = VARIANT_STYLES[variant];
  const renderedIcon =
    icon === false ? null : icon !== undefined ? icon : styles.defaultIcon;

  const paddingClass = compact
    ? mode === "inline"
      ? "px-2 py-1 text-xs"
      : "p-2 text-xs"
    : mode === "inline"
      ? "px-2.5 py-1.5 text-xs"
      : "p-3 text-xs sm:text-sm";

  const radiusClass =
    mode === "banner"
      ? "rounded-none"
      : mode === "inline"
        ? "rounded-[var(--kde-control-radius,0.35rem)]"
        : "rounded-[var(--kde-card-radius,0.45rem)]";

  return (
    <div
      role="status"
      data-testid={testId}
      className={`kde-message-bar flex items-start gap-2.5 transition-all ${radiusClass} ${paddingClass} ${styles[mode]} ${className}`}
    >
      {renderedIcon && (
        <span className={`mt-0.5 shrink-0 ${styles.iconColor}`}>
          {renderedIcon}
        </span>
      )}

      <div className="min-w-0 flex-1 leading-relaxed">
        {title && (
          <div
            className={`text-xs ${styles.titleColor} ${children ? "mb-1" : ""}`}
          >
            {title}
          </div>
        )}
        {children && (
          <div className="text-xs text-[var(--kde-ink,#232629)] opacity-95">
            {children}
          </div>
        )}
      </div>

      {action && <div className="shrink-0 self-center">{action}</div>}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭提示"
          className="ml-1 -mr-1 shrink-0 rounded p-1 text-[var(--kde-muted,#626b73)] opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
