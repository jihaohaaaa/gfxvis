import Checkbox from "./Checkbox";

interface Props {
  checked: boolean;
  onChange(checked: boolean): void;
}

/** Theme-styled checkbox controlling whether a demo draws its coordinate axes. */
export default function AxesToggle({ checked, onChange }: Props) {
  return <Checkbox label="坐标轴" checked={checked} onChange={onChange} />;
}
