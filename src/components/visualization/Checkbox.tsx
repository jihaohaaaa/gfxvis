interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

/** Theme-styled checkbox with a text label. */
export default function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[var(--color-accent)]"
      />
      {label}
    </label>
  );
}
