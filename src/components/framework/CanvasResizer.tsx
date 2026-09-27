import React, { useState } from "react";
import { useExpandable } from "./ExpandableDemo";

export interface CanvasResizerProps {
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Direct drag handle attached to the bottom edge of a canvas viewport container.
 * Features live pixel badge indicator, pointer capture, and smooth resizing.
 */
export default function CanvasResizer({
  className = "",
  minHeight = 180,
  maxHeight = 820,
}: CanvasResizerProps) {
  const expandable = useExpandable();
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  if (!expandable || expandable.isExpanded) {
    return null;
  }

  const isAdaptive = expandable.isAdaptive;
  const currentHeight = expandable.customHeight;

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    expandable.resetToAdaptive();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const handleTarget = e.currentTarget;
    const parentContainer = handleTarget.parentElement;
    if (!parentContainer) return;

    // Find the canvas container right above or inside
    const demoEl =
      parentContainer.querySelector<HTMLElement>('[class*="demo-height"]') ||
      parentContainer;
    const startY = e.clientY;
    const startHeight = demoEl.getBoundingClientRect().height;

    try {
      handleTarget.setPointerCapture(e.pointerId);
    } catch {
      /* fallback */
    }

    setIsDragging(true);
    setDragHeight(Math.round(startHeight));

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.round(
        Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY)),
      );
      setDragHeight(newHeight);
      expandable.setCustomHeight(newHeight);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      setDragHeight(null);
      try {
        handleTarget.releasePointerCapture(upEvent.pointerId);
      } catch {
        /* fallback */
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const titleText = isAdaptive
    ? "自适应高度 · 按住上下拖拽调整 · 双击保持自适应"
    : `手动高度 (${currentHeight}px) · 左右通栏 · 双击恢复自适应`;

  const isAbsolute = className.includes("absolute");
  const positionClass = isAbsolute ? "" : "relative";

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      className={`group ${positionClass} flex h-4 w-full cursor-ns-resize items-center justify-center select-none py-1 transition-opacity ${
        isDragging ? "opacity-100" : "opacity-90 hover:opacity-100"
      } ${className}`.trim()}
      title={titleText}
      aria-label={titleText}
      data-testid="canvas-resizer"
      data-mode={isAdaptive ? "adaptive" : "manual"}
    >
      {/* Visual handle bar: normal width in adaptive mode, full width covering left to right in manual mode */}
      <div
        className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
          isAdaptive
            ? "w-20 bg-border hover:w-28 hover:bg-accent/70 dark:bg-border/90"
            : "w-full bg-accent shadow-xs hover:bg-accent/90"
        } ${isDragging ? "ring-2 ring-accent/30" : ""}`}
      />

      {/* Floating live height badge during drag */}
      {isDragging && dragHeight !== null && (
        <div className="absolute -top-7 z-30 flex items-center gap-1 rounded-md border border-accent/80 bg-surface/95 px-2 py-0.5 text-[11px] font-mono font-medium text-foreground shadow-md backdrop-blur-md">
          <span>↕</span>
          <span>{dragHeight} px</span>
        </div>
      )}

      {/* Hover badge when in manual mode (not dragging) */}
      {!isDragging && !isAdaptive && currentHeight !== null && (
        <div className="pointer-events-none absolute -top-7 z-20 hidden items-center gap-1.5 rounded-md border border-accent/40 bg-surface/95 px-2.5 py-0.5 text-[11px] font-mono font-medium text-foreground shadow-sm backdrop-blur-md group-hover:flex">
          <span className="font-semibold text-accent">{currentHeight}px</span>
          <span className="text-muted">·</span>
          <span>双击恢复自适应</span>
        </div>
      )}

      {/* Subtle tooltip hint on hover when in adaptive mode (not dragging) */}
      {!isDragging && isAdaptive && (
        <div className="pointer-events-none absolute -top-7 z-20 hidden items-center gap-1.5 rounded-md border border-border bg-surface/95 px-2.5 py-0.5 text-[11px] font-sans text-muted shadow-sm backdrop-blur-md group-hover:flex">
          <span>拖拽调整高度</span>
          <span>·</span>
          <span className="font-medium text-accent">默认自适应</span>
        </div>
      )}
    </div>
  );
}
