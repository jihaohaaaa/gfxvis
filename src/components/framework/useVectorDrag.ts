import { useRef } from "react";
import type { Plot2D, Bounds2 } from "../../visualizations/core/2d/plot2d";
import { clamp } from "../../visualizations/core/common/math";

export interface DragTarget<T extends string = string> {
  id: T;
  x: number;
  y: number;
  hitRadius?: number;
  bounds?: Bounds2;
}

export interface UseVectorDragOptions<T extends string = string> {
  targets: DragTarget<T>[];
  onDrag: (id: T, newPos: { x: number; y: number }) => void;
  onDragStart?: (id: T) => void;
  onDragEnd?: () => void;
  defaultHitRadius?: number;
}

/**
 * Custom hook providing declarative point/vector dragging for 2D Canvas components.
 */
export function useVectorDrag<T extends string = string>({
  targets,
  onDrag,
  onDragStart,
  onDragEnd,
  defaultHitRadius = 24,
}: UseVectorDragOptions<T>) {
  const activeTargetRef = useRef<T | null>(null);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  return {
    activeTargetRef,
    onLeftDown(e: PointerEvent, plot: Plot2D): boolean {
      const el =
        (e.currentTarget as HTMLElement | null) ??
        (e.target as HTMLElement | null);
      const rect = el?.getBoundingClientRect();
      if (!rect) return false;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      let closestId: T | null = null;
      let minDistance = Infinity;

      for (const t of targetsRef.current) {
        const sx = plot.toScreenX(t.x);
        const sy = plot.toScreenY(t.y);
        const dist = Math.hypot(px - sx, py - sy);
        const maxDist = t.hitRadius ?? defaultHitRadius;
        if (dist <= maxDist && dist < minDistance) {
          minDistance = dist;
          closestId = t.id;
        }
      }

      if (closestId !== null) {
        activeTargetRef.current = closestId;
        onDragStartRef.current?.(closestId);
        return true;
      }
      return false;
    },
    onLeftMove(e: PointerEvent, plot: Plot2D) {
      const activeId = activeTargetRef.current;
      if (!activeId) return;
      const el =
        (e.currentTarget as HTMLElement | null) ??
        (e.target as HTMLElement | null);
      const rect = el?.getBoundingClientRect();
      if (!rect) return;

      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const target = targetsRef.current.find((t) => t.id === activeId);
      let wx = plot.toWorldX(px);
      let wy = plot.toWorldY(py);

      if (target?.bounds) {
        wx = clamp(wx, target.bounds.xMin, target.bounds.xMax);
        wy = clamp(wy, target.bounds.yMin, target.bounds.yMax);
      }

      onDragRef.current?.(activeId, { x: wx, y: wy });
    },
    onLeftUp() {
      if (activeTargetRef.current) {
        activeTargetRef.current = null;
        onDragEndRef.current?.();
      }
    },
  };
}
