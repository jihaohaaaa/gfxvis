import type { ReactNode } from "react";

export interface KdeButtonGroupProps {
  /** Whether buttons are seamlessly attached/clustered (collapsing inner borders and corner radii) */
  attached?: boolean;
  /** Orientation: horizontal (default) or vertical */
  orientation?: "horizontal" | "vertical";
  /** Optional size override for all buttons inside */
  size?: "xs" | "sm" | "md";
  /** Allow buttons to wrap onto multiple lines when container width is insufficient */
  wrap?: boolean;
  /** Fixed number of grid columns (e.g. 2 for a 2x2 layout in narrow sidebars) */
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | "auto";
  children: ReactNode;
  className?: string;
  testId?: string;
}

const GRID_COLS_MAP: Record<number | string, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  auto: "grid-cols-[repeat(auto-fit,minmax(0,1fr))]",
};

/**
 * KDE Plasma Breeze Button Group component (QButtonGroup / Segmented group).
 * Supports:
 * - Single-row attached/segmented cluster (default)
 * - N-column attached matrix grid with seamless inner border collapse and outer corner rounding
 * - Responsive wrap / unattached button clusters
 */
export default function KdeButtonGroup({
  attached = true,
  orientation = "horizontal",
  wrap = false,
  columns,
  children,
  className = "",
  testId,
}: KdeButtonGroupProps) {
  const isVertical = orientation === "vertical";

  // Grid column mode (e.g. 2-column grid in narrow sidebars)
  if (columns !== undefined) {
    const colClass = GRID_COLS_MAP[columns] || "grid-cols-2";
    const numCols = typeof columns === "number" ? columns : 2;

    if (!attached) {
      return (
        <div
          role="group"
          data-testid={testId}
          className={`kde-button-group kde-button-group--grid grid ${colClass} gap-1.5 w-full ${className}`}
        >
          {children}
        </div>
      );
    }

    // Attached grid: inner borders overlap, outer corners have smooth continuous border stroke
    const colCornerClass =
      numCols === 2
        ? "[&>button]:rounded-none [&>button:first-child]:rounded-tl-[var(--kde-control-radius,0.35rem)] [&>button:nth-child(2)]:rounded-tr-[var(--kde-control-radius,0.35rem)] [&>button:nth-last-child(2)]:rounded-bl-[var(--kde-control-radius,0.35rem)] [&>button:last-child]:rounded-br-[var(--kde-control-radius,0.35rem)] [&>button:nth-child(2n)]:-ml-px [&>button:nth-child(n+3)]:-mt-px"
        : numCols === 3
          ? "[&>button]:rounded-none [&>button:first-child]:rounded-tl-[var(--kde-control-radius,0.35rem)] [&>button:nth-child(3)]:rounded-tr-[var(--kde-control-radius,0.35rem)] [&>button:nth-last-child(3)]:rounded-bl-[var(--kde-control-radius,0.35rem)] [&>button:last-child]:rounded-br-[var(--kde-control-radius,0.35rem)] [&>button:not(:nth-child(3n+1))]:-ml-px [&>button:nth-child(n+4)]:-mt-px"
          : "[&>button]:rounded-none [&>button:first-child]:rounded-tl-[var(--kde-control-radius,0.35rem)] [&>button:last-child]:rounded-br-[var(--kde-control-radius,0.35rem)] [&>button]:-mr-px [&>button]:-mb-px";

    return (
      <div
        role="group"
        data-testid={testId}
        className={`kde-button-group kde-button-group--attached-grid grid ${colClass} w-full [&>button]:w-full [&>button]:relative ${colCornerClass} [&>button:focus-visible]:z-10 [&>button:hover]:z-10 ${className}`}
      >
        {children}
      </div>
    );
  }

  // Fluid wrap mode (auto-wrapping with micro-gap)
  if (wrap) {
    return (
      <div
        role="group"
        data-testid={testId}
        className={`kde-button-group kde-button-group--wrap flex flex-wrap items-center gap-1 w-full ${className}`}
      >
        {children}
      </div>
    );
  }

  // Standard unattached flex group
  if (!attached) {
    return (
      <div
        role="group"
        data-testid={testId}
        className={`kde-button-group flex ${
          isVertical ? "flex-col" : "flex-row"
        } items-center gap-1.5 ${className}`}
      >
        {children}
      </div>
    );
  }

  // Standard single-row attached group
  return (
    <div
      role="group"
      data-testid={testId}
      className={`kde-button-group inline-flex ${
        isVertical
          ? "flex-col [&>button:not(:first-child)]:rounded-t-none [&>button:not(:last-child)]:rounded-b-none [&>button:not(:first-child)]:-mt-px"
          : "flex-row [&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none [&>button:not(:first-child)]:-ml-px"
      } [&>button:focus-visible]:z-10 [&>button:hover]:z-10 ${className}`}
    >
      {children}
    </div>
  );
}
