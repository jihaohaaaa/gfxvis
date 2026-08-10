interface Props {
  checked: boolean;
  onChange(checked: boolean): void;
}

/** Theme-styled checkbox controlling whether a demo draws its coordinate axes. */
export default function AxesToggle({ checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[var(--color-accent)]"
      />
      坐标轴
    </label>
  );
}
