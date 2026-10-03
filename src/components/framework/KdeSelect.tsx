import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";

export type KdeSelectSize = "xs" | "sm" | "md";

export interface KdeSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface KdeSelectProps<
  T extends string | number = string,
> extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "value" | "onChange"
> {
  options: readonly KdeSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: ReactNode;
  error?: ReactNode;
  size?: KdeSelectSize;
}

const SIZE_SELECT_CLASSES: Record<KdeSelectSize, string> = {
  xs: "px-2 py-0.5 pr-6 text-[11px] rounded-[var(--kde-control-radius,0.3rem)]",
  sm: "px-2.5 py-1 pr-7 text-xs rounded-[var(--kde-control-radius,0.35rem)]",
  md: "px-3 py-1.5 pr-8 text-sm rounded-[var(--kde-control-radius,0.4rem)]",
};

export const KdeSelect = forwardRef<HTMLSelectElement, KdeSelectProps>(
  (
    {
      options,
      value,
      onChange,
      label,
      error,
      size = "sm",
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
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
          <select
            ref={ref}
            disabled={disabled}
            value={String(value)}
            onChange={(e) => {
              const selectedOpt = options.find(
                (opt) => String(opt.value) === e.target.value,
              );
              if (selectedOpt) {
                onChange(selectedOpt.value);
              }
            }}
            className={`w-full appearance-none border bg-[var(--kde-raised)] text-[var(--kde-ink)] transition focus:border-[var(--kde-accent)] focus:ring-1 focus:ring-[var(--kde-accent)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              error
                ? "border-rose-500/80 dark:border-rose-400/80"
                : "border-[var(--kde-border)]"
            } ${SIZE_SELECT_CLASSES[size]} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={String(opt.value)}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[var(--kde-raised)] text-[var(--kde-ink)]"
              >
                {opt.label}
              </option>
            ))}
          </select>

          {/* KDE Dropdown Arrow */}
          <span className="pointer-events-none absolute right-2 flex items-center text-[var(--kde-muted)]">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>

        {!label && error && (
          <span className="text-[11px] text-rose-600 dark:text-rose-400">
            {error}
          </span>
        )}
      </div>
    );
  },
);

KdeSelect.displayName = "KdeSelect";

export default KdeSelect;
