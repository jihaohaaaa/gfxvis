import type { ReactNode } from "react";

export type KdeDividerOrientation = "horizontal" | "vertical";
export type KdeDividerVariant = "solid" | "dashed" | "subtle";
export type KdeDividerSpacing = "none" | "xs" | "sm" | "md" | "lg";

export interface KdeDividerProps {
  /** Orientation: horizontal (default) or vertical */
  orientation?: KdeDividerOrientation;
  /** Border style variant: solid (default), dashed, or subtle (faint) */
  variant?: KdeDividerVariant;
  /** Optional inline label/title (for horizontal divider) */
  label?: ReactNode;
  /** Spacing margin around divider */
  spacing?: KdeDividerSpacing;
  className?: string;
  testId?: string;
}

const HORIZONTAL_SPACING: Record<KdeDividerSpacing, string> = {
  none: "my-0",
  xs: "my-1",
  sm: "my-2",
  md: "my-3",
  lg: "my-4",
};

const VERTICAL_SPACING: Record<KdeDividerSpacing, string> = {
  none: "mx-0",
  xs: "mx-1",
  sm: "mx-2",
  md: "mx-3",
  lg: "mx-4",
};

/**
 * KDE Plasma Breeze Divider / Separator component (QFrame::HLine / VLine).
 * Provides clean horizontal and vertical separation with optional inline section labels.
 */
export default function KdeDivider({
  orientation = "horizontal",
  variant = "solid",
  label,
  spacing = "sm",
  className = "",
  testId,
}: KdeDividerProps) {
  const isVertical = orientation === "vertical";
  const borderStyle =
    variant === "dashed"
      ? "border-dashed"
      : variant === "subtle"
        ? "border-dotted opacity-60"
        : "border-solid";

  if (isVertical) {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        data-testid={testId}
        className={`inline-block h-full min-h-[1rem] w-px self-stretch border-l border-[var(--kde-border,#bec5cc)]/60 ${borderStyle} ${VERTICAL_SPACING[spacing]} ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        data-testid={testId}
        className={`flex items-center gap-2 ${HORIZONTAL_SPACING[spacing]} ${className}`}
      >
        <div
          className={`flex-1 border-t border-[var(--kde-border,#bec5cc)]/60 ${borderStyle}`}
        />
        <span className="text-[10px] font-semibold tracking-wider text-[var(--kde-muted,#626b73)] uppercase">
          {label}
        </span>
        <div
          className={`flex-1 border-t border-[var(--kde-border,#bec5cc)]/60 ${borderStyle}`}
        />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      data-testid={testId}
      className={`w-full border-t border-[var(--kde-border,#bec5cc)]/60 ${borderStyle} ${HORIZONTAL_SPACING[spacing]} ${className}`}
    />
  );
}
