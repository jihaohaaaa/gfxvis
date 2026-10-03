import React, { useState, type ReactNode } from "react";
import { useExpandable } from "./ExpandableDemo";

export interface CanvasToolbarProps {
  /** Optional callback to reset viewport/camera back to default */
  onReset?: () => void;
  /** Whether to show the expand/fullscreen button (defaults to false, since expand is placed on external card header) */
  showExpand?: boolean;
  /** Custom label for the reset button (defaults to '复位') */
  resetLabel?: string;
  /** Whether to enable edge-docked retractable drawer HUD mode (defaults to true) */
  retractable?: boolean;
  /** Extra custom controls / buttons */
  children?: ReactNode;
  /** Custom CSS class names */
  className?: string;
}

/**
 * Standard floating / retractable drawer toolbar placed at the top-right corner of 2D/3D canvas containers.
 * In retractable mode, docks cleanly against the right edge as a subtle pill tab and expands smoothly on hover/focus,
 * completely preventing overlap with canvas content, status badges, and stepper controls.
 */
export default function CanvasToolbar({
  onReset,
  showExpand = false,
  resetLabel = "复位",
  retractable = true,
  children,
  className = "",
}: CanvasToolbarProps) {
  const expandable = useExpandable();
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const isExpanded = expandable?.isExpanded ?? false;
  const canToggleExpand = showExpand && Boolean(expandable) && !isExpanded;

  // Non-retractable classic floating toolbar
  if (!retractable) {
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

  // Retractable Drawer HUD Toolbar
  const [isFocused, setIsFocused] = useState(false);
  const isOpen = isHovered || isFocused;

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      className={`group/hud absolute right-0 top-2.5 z-20 flex items-center select-none ${className}`}
      data-toolbar-mode="drawer-hud"
    >
      <div
        className={`flex h-7 items-center border border-border/80 bg-surface/85 shadow-xs backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-accent/40 hover:bg-surface/95 hover:shadow-md focus-within:border-accent/40 focus-within:bg-surface/95 focus-within:shadow-md ${
          isOpen
            ? "mr-2 rounded-lg border-r px-2.5 gap-1.5 opacity-100"
            : "mr-0 rounded-l-lg border-r-0 px-2 opacity-75 hover:opacity-100"
        }`}
      >
        {onReset && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="group/btn flex h-6 cursor-pointer items-center rounded px-0.5 text-xs font-medium text-muted transition-colors duration-300 hover:text-accent active:scale-95 focus:outline-none focus:text-accent"
            title="复位画布视野至初始范围"
            aria-label="复位视野"
          >
            <span className="text-sm leading-none transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:-rotate-90">
              ↺
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap text-xs leading-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen
                  ? "max-w-[4.5rem] opacity-100 ml-1.5"
                  : "max-w-0 opacity-0 ml-0"
              }`}
            >
              {resetLabel}
            </span>
          </button>
        )}

        {canToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              expandable?.toggleExpanded();
            }}
            className="group/btn flex h-6 cursor-pointer items-center rounded px-0.5 text-xs font-medium text-muted transition-colors duration-300 hover:text-accent active:scale-95 focus:outline-none focus:text-accent"
            title={isExpanded ? "还原画布" : "展开全屏演示"}
            aria-label={isExpanded ? "还原画布" : "展开全屏演示"}
          >
            <span className="text-xs leading-none transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:scale-110">
              {isExpanded ? "✕" : "⛶"}
            </span>
            <span
              className={`overflow-hidden whitespace-nowrap text-xs leading-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen
                  ? "max-w-[4.5rem] opacity-100 ml-1"
                  : "max-w-0 opacity-0 ml-0"
              }`}
            >
              {isExpanded ? "还原" : "展开"}
            </span>
          </button>
        )}

        {children && (
          <div
            className={`flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
