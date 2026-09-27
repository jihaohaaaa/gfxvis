import React, { type ReactNode } from "react";
import { useExpandable } from "./ExpandableDemo";

export interface CanvasToolbarProps {
  /** Optional callback to reset viewport/camera back to default */
  onReset?: () => void;
  /** Whether to show the expand/fullscreen button (defaults to false, since expand is placed on external card header) */
  showExpand?: boolean;
  /** Custom label for the reset button (defaults to '复位') */
  resetLabel?: string;
  /** Extra custom controls / buttons */
  children?: ReactNode;
  /** Custom CSS class names */
  className?: string;
}

/**
 * Standard floating toolbar placed at the top-right corner of 2D/3D canvas containers.
 * Uses backdrop blur glass styling, isolates pointer events, and provides viewport reset controls.
 */
export default function CanvasToolbar({
  onReset,
  showExpand = false,
  resetLabel = "复位",
  children,
  className = "",
}: CanvasToolbarProps) {
  const expandable = useExpandable();

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const isExpanded = expandable?.isExpanded ?? false;
  const canToggleExpand = showExpand && Boolean(expandable) && !isExpanded;

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      className={`absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-lg border border-border/80 bg-surface/90 p-1 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-accent/40 hover:shadow-md select-none ${className}`}
    >
      {onReset && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          className="group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted transition-all duration-150 hover:bg-accent/15 hover:text-accent active:scale-90 active:bg-accent/25"
          title="复位画布视野至初始范围"
          aria-label="复位视野"
        >
          <span className="text-sm transition-transform duration-300 group-hover:-rotate-90">
            ↺
          </span>
          <span className="hidden sm:inline">{resetLabel}</span>
        </button>
      )}

      {canToggleExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            expandable?.toggleExpanded();
          }}
          className="group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted transition-all duration-150 hover:bg-accent/15 hover:text-accent active:scale-90 active:bg-accent/25"
          title={isExpanded ? "还原画布" : "展开全屏演示"}
          aria-label={isExpanded ? "还原画布" : "展开全屏演示"}
        >
          <span className="text-xs transition-transform duration-200 group-hover:scale-110">
            {isExpanded ? "✕" : "⛶"}
          </span>
          <span className="hidden sm:inline">
            {isExpanded ? "还原" : "展开"}
          </span>
        </button>
      )}

      {children}
    </div>
  );
}
