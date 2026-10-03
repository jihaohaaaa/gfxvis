import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type KdeInputSize = "xs" | "sm" | "md";

export interface KdeInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  mono?: boolean;
  size?: KdeInputSize;
  addonLeft?: ReactNode;
  addonRight?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

const SIZE_INPUT_CLASSES: Record<KdeInputSize, string> = {
  xs: "px-2 py-0.5 text-[11px] rounded-[var(--kde-control-radius,0.3rem)]",
  sm: "px-2.5 py-1 text-xs rounded-[var(--kde-control-radius,0.35rem)]",
  md: "px-3 py-1.5 text-sm rounded-[var(--kde-control-radius,0.4rem)]",
};

export const KdeInput = forwardRef<HTMLInputElement, KdeInputProps>(
  (
    {
      label,
      error,
      helperText,
      mono = false,
      size = "sm",
      addonLeft,
      addonRight,
      clearable = false,
      onClear,
      className = "",
      disabled,
      value,
      ...props
    },
    ref,
  ) => {
    const hasValue = value !== undefined && value !== "";

    return (
      <div className="flex w-full flex-col gap-1 text-left">
        {label && (
          <label className="flex items-center justify-between text-[11px] font-semibold text-[var(--kde-muted)]">
            <span>{label}</span>
            {error && (
              <span className="font-normal text-rose-600 dark:text-rose-400">
                {error}
              </span>
            )}
          </label>
        )}

        <div className="relative flex w-full items-center">
          {addonLeft && (
            <span className="absolute left-2.5 inline-flex items-center text-[var(--kde-muted)] pointer-events-none">
              {addonLeft}
            </span>
          )}

          <input
            ref={ref}
            disabled={disabled}
            value={value}
            className={`w-full border bg-[var(--kde-raised)] text-[var(--kde-ink)] placeholder-[var(--kde-muted)] transition focus:border-[var(--kde-accent)] focus:ring-1 focus:ring-[var(--kde-accent)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? "border-rose-500/80 dark:border-rose-400/80"
                : "border-[var(--kde-border)]"
            } ${mono ? "font-mono" : "font-sans"} ${
              SIZE_INPUT_CLASSES[size]
            } ${addonLeft ? "pl-7" : ""} ${
              addonRight || (clearable && hasValue) ? "pr-7" : ""
            } ${className}`}
            {...props}
          />

          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 text-xs text-[var(--kde-muted)] hover:text-[var(--kde-ink)]"
              title="清空"
            >
              ✕
            </button>
          )}

          {addonRight && !clearable && (
            <span className="absolute right-2.5 inline-flex items-center text-[var(--kde-muted)] pointer-events-none">
              {addonRight}
            </span>
          )}
        </div>

        {!label && error && (
          <span className="text-[11px] text-rose-600 dark:text-rose-400">
            {error}
          </span>
        )}

        {!error && helperText && (
          <span className="text-[11px] text-[var(--kde-muted)]">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

KdeInput.displayName = "KdeInput";

export default KdeInput;
