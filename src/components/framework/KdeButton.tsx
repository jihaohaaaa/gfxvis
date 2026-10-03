import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type KdeButtonVariant =
  "default" | "primary" | "success" | "warning" | "danger" | "flat";

export type KdeButtonSize = "xs" | "sm" | "md";

export interface KdeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KdeButtonVariant;
  size?: KdeButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<KdeButtonVariant, string> = {
  default:
    "border-[var(--kde-border)] bg-[var(--kde-raised)] text-[var(--kde-ink)] shadow-xs hover:bg-[var(--kde-panel)] active:bg-[var(--kde-base)]",
  primary:
    "border-[var(--kde-accent)]/60 bg-[var(--kde-accent)] text-[var(--kde-accent-contrast)] shadow-xs hover:opacity-90 active:opacity-100",
  success:
    "border-emerald-600/50 bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 active:bg-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  warning:
    "border-amber-600/50 bg-amber-600 text-white shadow-xs hover:bg-amber-500 active:bg-amber-700 dark:border-amber-500/50 dark:bg-amber-600 dark:hover:bg-amber-500",
  danger:
    "border-rose-600/50 bg-rose-600 text-white shadow-xs hover:bg-rose-500 active:bg-rose-700 dark:border-rose-500/50 dark:bg-rose-600 dark:hover:bg-rose-500",
  flat: "border-transparent bg-transparent text-[var(--kde-ink)] hover:bg-[var(--kde-panel)] active:bg-[var(--kde-base)]",
};

const SIZE_CLASSES: Record<KdeButtonSize, string> = {
  xs: "px-2 py-0.5 text-[11px] gap-1 rounded-[var(--kde-control-radius,0.3rem)]",
  sm: "px-2.5 py-1 text-xs gap-1.5 rounded-[var(--kde-control-radius,0.35rem)]",
  md: "px-3.5 py-1.5 text-sm gap-2 rounded-[var(--kde-control-radius,0.4rem)]",
};

export const KdeButton = forwardRef<HTMLButtonElement, KdeButtonProps>(
  (
    {
      children,
      variant = "default",
      size = "sm",
      icon,
      iconRight,
      loading = false,
      type = "button",
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition select-none border whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--kde-accent)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon && <span className="inline-flex shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && (
          <span className="inline-flex shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);

KdeButton.displayName = "KdeButton";

export default KdeButton;
