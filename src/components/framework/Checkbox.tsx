import KdeCheckbox, { type KdeCheckboxProps } from "./KdeCheckbox";

/**
 * @deprecated Legacy Checkbox component. Use `KdeCheckbox` directly for new KDE Plasma Breeze compliant designs.
 */
export default function Checkbox(props: KdeCheckboxProps) {
  return <KdeCheckbox {...props} />;
}
