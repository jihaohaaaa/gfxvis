import type { CSSProperties, ReactNode } from "react";
import "./InteractiveViewportGroup.css";

export interface InteractiveViewportGroupProps {
  items: readonly ReactNode[];
  columns?: 1 | 2 | 3 | 4;
  mobileColumns?: 1 | 2;
  className?: string;
  itemClassName?: string;
  testId?: string;
}

type ViewportGroupStyle = CSSProperties & {
  "--viewport-group-columns": number;
  "--viewport-group-mobile-columns": number;
};

/**
 * Framework-level grid for multiple interactive viewports inside one named
 * InteractiveLayout region. It owns placement only; each item owns its own
 * canvas, toolbar, resizer, and interaction state.
 */
export default function InteractiveViewportGroup({
  items,
  columns = 1,
  mobileColumns = 1,
  className = "",
  itemClassName = "",
  testId,
}: InteractiveViewportGroupProps) {
  if (items.length === 0) return null;

  const style: ViewportGroupStyle = {
    "--viewport-group-columns": columns,
    "--viewport-group-mobile-columns": mobileColumns,
  };

  return (
    <div
      className={`interactive-viewport-group ${className}`.trim()}
      data-testid={testId}
      data-viewport-count={items.length}
      data-viewport-columns={columns}
      data-viewport-mobile-columns={mobileColumns}
      style={style}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`interactive-viewport-group__item ${itemClassName}`.trim()}
          data-viewport-item
          data-viewport-item-index={index}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
