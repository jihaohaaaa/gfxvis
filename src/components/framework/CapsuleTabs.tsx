interface CapsuleOption<T extends string> {
  id: T;
  label: string;
}

interface CapsuleTabsProps<T extends string> {
  options: readonly CapsuleOption<T>[];
  value: T;
  onChange(id: T): void;
  /** Text size; demos packing many controls use "xs". */
  size?: "xs" | "sm";
  /** Optional label rendered before the buttons (e.g. "场:"). */
  label?: string;
  className?: string;
}

/** Theme-styled pill button group for switching between a few options. */
export default function CapsuleTabs<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  label,
  className = "",
}: CapsuleTabsProps<T>) {
  const textClass = size === "xs" ? "text-xs" : "text-sm";
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {label ? <span className="text-sm text-muted">{label}</span> : null}
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={
            value === option.id
              ? `rounded-full border border-accent bg-accent/10 px-3 py-1 ${textClass} font-medium text-accent transition-colors`
              : `rounded-full border border-border px-3 py-1 ${textClass} text-muted hover:border-accent/40 hover:text-ink transition-colors`
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
