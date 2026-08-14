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
    <div className={`flex items-center gap-1 ${className}`}>
      {label ? <span className="text-sm text-muted">{label}</span> : null}
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={
            value === option.id
              ? `rounded-full border border-accent px-3 py-1 ${textClass} text-accent`
              : `rounded-full border border-border px-3 py-1 ${textClass} text-muted hover:text-ink`
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
