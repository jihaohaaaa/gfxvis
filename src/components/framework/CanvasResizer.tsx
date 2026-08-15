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

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`group relative flex h-3.5 w-full cursor-ns-resize items-center justify-center select-none ${
        isDragging ? "opacity-100" : "opacity-75 hover:opacity-100"
      } ${className}`}
      title="按住上下拖拽调节视口高度"
      aria-label="调节视口高度"
    >
      {/* Visual handle bar */}
      <div
        className={`h-1 rounded-full transition-all duration-150 ${
          isDragging
            ? "w-24 bg-accent shadow-sm"
            : "w-12 bg-border/80 group-hover:w-16 group-hover:bg-accent/80"
        }`}
      />

      {/* Floating live height badge during drag */}
      {isDragging && dragHeight !== null && (
        <div className="absolute -top-7 z-30 flex items-center gap-1 rounded-md border border-border/80 bg-surface/95 px-2 py-0.5 text-[11px] font-mono font-medium text-foreground shadow-md backdrop-blur-md">
          <span>↕</span>
          <span>{dragHeight} px</span>
        </div>
      )}
    </div>
  );
}
