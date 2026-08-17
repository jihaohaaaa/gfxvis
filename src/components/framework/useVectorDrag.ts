import { useRef, useEffect, type RefObject } from "react";
import type { Plot2D, Bounds2 } from "../../visualizations/core/2d/plot2d";
import { clamp } from "../../visualizations/core/common/math";
import {
  computeFadeOpacity,
  FADE_DELAY_MS,
  FADE_DURATION_MS,
} from "../../visualizations/core/common/interaction";

export interface GizmoArrow {
  id: string;
  /** World-space direction vector (dx, dy) */
  direction: { x: number; y: number };
  /** Color for arrow and guide track */
  color?: string;
  /** Label badge text */
  label?: string;
  /** Pixel length of arrow shaft (default: 32px) */
  lengthPx?: number;
}

export type DragConstraint =
  | { type: "free" }
  | {
      type: "line" | "direction" | "axis";
      /** Direction vector (dx, dy) */
      direction?: { x: number; y: number };
      /** Axis shortcut */
      axis?: "x" | "y";
      /** Anchor point on the line (defaults to { x: 0, y: 0 }) */
      origin?: { x: number; y: number };
      /** Optional visual label for guide line */
      label?: string;
      /** Optional custom track color */
      color?: string;
    }
  | {
      type: "custom";
      project: (
        rawPos: { x: number; y: number },
        target: DragTarget,
      ) => { x: number; y: number };
    };

export interface DragTarget<T extends string = string> {
  id: T;
  x: number;
  y: number;
  hitRadius?: number;
  bounds?: Bounds2;
  constraint?: DragConstraint;
  /** Directional Gizmo arrows extending from this point */
  arrows?: GizmoArrow[];
}

export interface UseVectorDragOptions<T extends string = string> {
  targets: DragTarget<T>[];
  onDrag: (id: T, newPos: { x: number; y: number }) => void;
  onDragStart?: (
    id: T,
    handleType: "center" | "arrow",
    arrowId?: string,
  ) => void;
  onDragEnd?: () => void;
  defaultHitRadius?: number;
  /** Delay in milliseconds before fade out begins after pointer leaves (default: 1200ms) */
  fadeDelayMs?: number;
  /** Duration in milliseconds of opacity fade out (default: 500ms) */
  fadeDurationMs?: number;
}

export interface ActiveTrackInfo {
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  label?: string;
  color?: string;
  opacity?: number;
}

export interface ActiveHandle<T extends string = string> {
  targetId: T;
  type: "center" | "arrow";
  arrowId?: string;
  arrowDirection?: { x: number; y: number };
  arrowOrigin?: { x: number; y: number };
  label?: string;
  color?: string;
}

interface TargetFadeState {
  opacity: number;
  lastActiveTime: number;
  isHovered: boolean;
}

export interface UseVectorDragResult<T extends string = string> {
  activeTargetRef: RefObject<T | null>;
  hoveredTargetRef: RefObject<T | null>;
  isDragging(id: T): boolean;
  isHovered(id: T): boolean;
  isCenterHovered(id: T): boolean;
  isCenterDragging(id: T): boolean;
  getHoveredArrowId(id: T): string | null;
  getDraggingArrowId(id: T): string | null;
  getOpacity(id: T): number;
  getActiveTarget(): DragTarget<T> | null;
  getActiveTrack(): ActiveTrackInfo | null;
  handlers: {
    onLeftDown(e: PointerEvent, plot: Plot2D): boolean;
    onLeftMove(e: PointerEvent, plot: Plot2D): void;
    onLeftUp(e?: PointerEvent): void;
    onHover(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
    onPointerLeave(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
  };
  onLeftDown(e: PointerEvent, plot: Plot2D): boolean;
  onLeftMove(e: PointerEvent, plot: Plot2D): void;
  onLeftUp(e?: PointerEvent): void;
  onHover(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
  onPointerLeave(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
}

/** Apply constraint geometry to raw world coordinate */
export function projectConstrainedPos<T extends string = string>(
  rawPos: { x: number; y: number },
  target: DragTarget<T>,
  shiftKey = false,
): { x: number; y: number } {
  const constraint = target.constraint;
  let pos = { ...rawPos };

  if (!constraint || constraint.type === "free") {
    if (shiftKey) {
      // Snap to closest 45-degree angle or horizontal/vertical axis from origin
      const angle = Math.atan2(rawPos.y, rawPos.x);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const dist = Math.hypot(rawPos.x, rawPos.y);
      pos = {
        x: dist * Math.cos(snappedAngle),
        y: dist * Math.sin(snappedAngle),
      };
    }
  } else if (
    constraint.type === "line" ||
    constraint.type === "direction" ||
    constraint.type === "axis"
  ) {
    const origin = constraint.origin ?? { x: 0, y: 0 };
    let dir = constraint.direction;
    if (!dir && constraint.axis === "x") dir = { x: 1, y: 0 };
    if (!dir && constraint.axis === "y") dir = { x: 0, y: 1 };
    if (dir) {
      const len = Math.hypot(dir.x, dir.y);
      if (len > 1e-7) {
        const ux = dir.x / len;
        const uy = dir.y / len;
        const deltaX = rawPos.x - origin.x;
        const deltaY = rawPos.y - origin.y;
        const t = deltaX * ux + deltaY * uy;
        pos = {
          x: origin.x + t * ux,
          y: origin.y + t * uy,
        };
      }
    }
  } else if (constraint.type === "custom") {
    pos = constraint.project(rawPos, target);
  }

  if (target.bounds) {
    pos.x = clamp(pos.x, target.bounds.xMin, target.bounds.xMax);
    pos.y = clamp(pos.y, target.bounds.yMin, target.bounds.yMax);
  }

  return pos;
}

/**
 * Custom hook providing declarative Transform Gizmo dragging for 2D Canvas components
 * with center-free dragging + directional arrow constrained dragging and smooth delayed fade out.
 */
export function useVectorDrag<T extends string = string>({
  targets,
  onDrag,
  onDragStart,
  onDragEnd,
  defaultHitRadius = 24,
  fadeDelayMs = FADE_DELAY_MS,
  fadeDurationMs = FADE_DURATION_MS,
}: UseVectorDragOptions<T>): UseVectorDragResult<T> {
  const activeHandleRef = useRef<ActiveHandle<T> | null>(null);
  const hoveredHandleRef = useRef<ActiveHandle<T> | null>(null);
  const activeTargetRef = useRef<T | null>(null);
  const hoveredTargetRef = useRef<T | null>(null);
  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartTargetPosRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const fadeStatesRef = useRef<Map<T, TargetFadeState>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const redrawCallbackRef = useRef<(() => void) | null>(null);

  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const startFadeLoop = () => {
    if (rafIdRef.current !== null) return;

    const tick = () => {
      const now = performance.now();
      let hasAnimating = false;

      for (const t of targetsRef.current) {
        let state = fadeStatesRef.current.get(t.id);
        if (!state) {
          state = { opacity: 0.0, lastActiveTime: 0, isHovered: false };
          fadeStatesRef.current.set(t.id, state);
        }

        const isDragging = activeTargetRef.current === t.id;
        if (state.isHovered || isDragging) {
          state.opacity = 1.0;
        } else if (state.opacity > 0.001) {
          const elapsed = now - state.lastActiveTime;
          state.opacity = computeFadeOpacity(
            elapsed,
            fadeDelayMs,
            fadeDurationMs,
          );
          if (state.opacity > 0.001) {
            hasAnimating = true;
          }
        }
      }

      redrawCallbackRef.current?.();

      if (hasAnimating) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const findHitHandle = (
    e: PointerEvent,
    plot: Plot2D,
  ): ActiveHandle<T> | null => {
    const el =
      (e.currentTarget as HTMLElement | null) ??
      (e.target as HTMLElement | null);
    const rect = el?.getBoundingClientRect();
    if (!rect) return null;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // 1. Check Gizmo arrows first (higher priority when hovering tip)
    for (const t of targetsRef.current) {
      if (!t.arrows || t.arrows.length === 0) continue;
      const sx = plot.toScreenX(t.x);
      const sy = plot.toScreenY(t.y);

      for (const arr of t.arrows) {
        const len = Math.hypot(arr.direction.x, arr.direction.y);
        if (len < 1e-6) continue;

        const sDx = plot.toScreenX(arr.direction.x) - plot.toScreenX(0);
        const sDy = plot.toScreenY(arr.direction.y) - plot.toScreenY(0);
        const sLen = Math.hypot(sDx, sDy) || 1;
        const ux = sDx / sLen;
        const uy = sDy / sLen;

        const shaftLen = arr.lengthPx ?? 32;
        const tipX = sx + ux * shaftLen;
        const tipY = sy + uy * shaftLen;

        // Check tip distance
        const distTip = Math.hypot(px - tipX, py - tipY);
        if (distTip <= 16) {
          return {
            targetId: t.id,
            type: "arrow",
            arrowId: arr.id,
            arrowDirection: arr.direction,
            arrowOrigin: { x: t.x, y: t.y },
            label: arr.label,
            color: arr.color,
          };
        }

        // Check shaft corridor
        const deltaX = px - sx;
        const deltaY = py - sy;
        const proj = deltaX * ux + deltaY * uy;
        const perp = Math.abs(deltaX * uy - deltaY * ux);
        if (proj >= 8 && proj <= shaftLen + 6 && perp <= 10) {
          return {
            targetId: t.id,
            type: "arrow",
            arrowId: arr.id,
            arrowDirection: arr.direction,
            arrowOrigin: { x: t.x, y: t.y },
            label: arr.label,
            color: arr.color,
          };
        }
      }
    }

    // 2. Check Center point handle (with proximity radius)
    let closestCenter: ActiveHandle<T> | null = null;
    let minCenterDist = Infinity;

    for (const t of targetsRef.current) {
      const sx = plot.toScreenX(t.x);
      const sy = plot.toScreenY(t.y);
      const dist = Math.hypot(px - sx, py - sy);
      const maxDist = t.hitRadius ?? defaultHitRadius;
      if (dist <= maxDist && dist < minCenterDist) {
        minCenterDist = dist;
        closestCenter = {
          targetId: t.id,
          type: "center",
        };
      }
    }

    return closestCenter;
  };

  const getActiveTarget = (): DragTarget<T> | null => {
    if (!activeTargetRef.current) return null;
    return (
      targetsRef.current.find((t) => t.id === activeTargetRef.current) ?? null
    );
  };

  const getActiveTrack = (): ActiveTrackInfo | null => {
    const handle = activeHandleRef.current ?? hoveredHandleRef.current;
    if (handle && handle.type === "arrow" && handle.arrowDirection) {
      const target = targetsRef.current.find((t) => t.id === handle.targetId);
      const opacity = getOpacity(handle.targetId);
      if (opacity <= 0.001) return null;
      return {
        origin: target
          ? { x: target.x, y: target.y }
          : (handle.arrowOrigin ?? { x: 0, y: 0 }),
        direction: handle.arrowDirection,
        label: handle.label,
        color: handle.color,
        opacity,
      };
    }
    return null;
  };

  const getOpacity = (id: T): number => {
    if (activeTargetRef.current === id) return 1.0;
    const state = fadeStatesRef.current.get(id);
    if (!state) return 0.0;
    if (state.isHovered) return 1.0;
    return state.opacity;
  };

  const onHover = (e: PointerEvent, plot: Plot2D, redraw?: () => void) => {
    if (redraw) redrawCallbackRef.current = redraw;
    const el =
      (e.currentTarget as HTMLElement | null) ??
      (e.target as HTMLElement | null);
    if (!el) return;

    const handle = findHitHandle(e, plot);
    const prevHandle = hoveredHandleRef.current;
    hoveredHandleRef.current = handle;
    hoveredTargetRef.current = handle ? handle.targetId : null;

    const now = performance.now();
    const hitTargetId = handle ? handle.targetId : null;

    for (const t of targetsRef.current) {
      let state = fadeStatesRef.current.get(t.id);
      if (!state) {
        state = { opacity: 0.0, lastActiveTime: 0, isHovered: false };
        fadeStatesRef.current.set(t.id, state);
      }

      if (t.id === hitTargetId || t.id === activeTargetRef.current) {
        const wasUnhovered = !state.isHovered;
        state.isHovered = true;
        state.opacity = 1.0;
        state.lastActiveTime = now;
        if (wasUnhovered) {
          redrawCallbackRef.current?.();
        }
      } else {
        if (state.isHovered) {
          state.isHovered = false;
          state.lastActiveTime = now;
        }
      }
    }

    startFadeLoop();

    if (activeHandleRef.current) {
      el.style.cursor = "grabbing";
    } else if (handle !== null) {
      el.style.cursor = "grab";
    } else {
      el.style.cursor = "";
    }

    if (handle !== prevHandle) {
      redrawCallbackRef.current?.();
    }
  };

  const onPointerLeave = (
    _e: PointerEvent,
    _plot: Plot2D,
    redraw?: () => void,
  ) => {
    if (redraw) redrawCallbackRef.current = redraw;
    hoveredHandleRef.current = null;
    hoveredTargetRef.current = null;

    const now = performance.now();
    for (const t of targetsRef.current) {
      const state = fadeStatesRef.current.get(t.id);
      if (state && state.isHovered) {
        state.isHovered = false;
        state.lastActiveTime = now;
      }
    }

    startFadeLoop();
  };

  const onLeftDown = (e: PointerEvent, plot: Plot2D): boolean => {
    const el =
      (e.currentTarget as HTMLElement | null) ??
      (e.target as HTMLElement | null);
    const handle = findHitHandle(e, plot);

    if (handle !== null) {
      const rect = el?.getBoundingClientRect();
      if (rect) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        dragStartMouseRef.current = {
          x: plot.toWorldX(px),
          y: plot.toWorldY(py),
        };
      }
      const target = targetsRef.current.find((t) => t.id === handle.targetId);
      dragStartTargetPosRef.current = target
        ? { x: target.x, y: target.y }
        : { x: 0, y: 0 };

      activeHandleRef.current = handle;
      hoveredHandleRef.current = handle;
      activeTargetRef.current = handle.targetId;
      hoveredTargetRef.current = handle.targetId;

      const state = fadeStatesRef.current.get(handle.targetId);
      if (state) {
        state.opacity = 1.0;
        state.isHovered = true;
      }

      if (el) el.style.cursor = "grabbing";
      onDragStartRef.current?.(handle.targetId, handle.type, handle.arrowId);
      redrawCallbackRef.current?.();
      return true;
    }
    return false;
  };

  const onLeftMove = (e: PointerEvent, plot: Plot2D) => {
    const handle = activeHandleRef.current;
    if (!handle) return;
    const el =
      (e.currentTarget as HTMLElement | null) ??
      (e.target as HTMLElement | null);
    const rect = el?.getBoundingClientRect();
    if (!rect) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const target = targetsRef.current.find((t) => t.id === handle.targetId);
    if (!target) return;

    const currentMouse = {
      x: plot.toWorldX(px),
      y: plot.toWorldY(py),
    };
    const startMouse = dragStartMouseRef.current;
    const startTarget = dragStartTargetPosRef.current;
    const delta = {
      x: currentMouse.x - startMouse.x,
      y: currentMouse.y - startMouse.y,
    };

    let finalPos = { ...startTarget };

    if (handle.type === "arrow" && handle.arrowDirection) {
      // 1D Constrained line drag: project mouse displacement vector onto unit arrow direction
      const dir = handle.arrowDirection;
      const len = Math.hypot(dir.x, dir.y);
      if (len > 1e-7) {
        const ux = dir.x / len;
        const uy = dir.y / len;
        const dt = delta.x * ux + delta.y * uy;
        finalPos = {
          x: startTarget.x + dt * ux,
          y: startTarget.y + dt * uy,
        };
      }
    } else {
      // Center handle 2D drag: apply displacement from initial target position
      const unconstrainedPos = {
        x: startTarget.x + delta.x,
        y: startTarget.y + delta.y,
      };
      finalPos = projectConstrainedPos(unconstrainedPos, target, e.shiftKey);
    }

    if (target.bounds) {
      finalPos.x = clamp(finalPos.x, target.bounds.xMin, target.bounds.xMax);
      finalPos.y = clamp(finalPos.y, target.bounds.yMin, target.bounds.yMax);
    }

    onDragRef.current?.(handle.targetId, finalPos);
  };

  const onLeftUp = (e?: PointerEvent) => {
    const el = e
      ? ((e.currentTarget as HTMLElement | null) ??
        (e.target as HTMLElement | null))
      : null;
    if (activeHandleRef.current) {
      const prevActiveTarget = activeTargetRef.current;
      activeHandleRef.current = null;
      activeTargetRef.current = null;
      if (prevActiveTarget) {
        const state = fadeStatesRef.current.get(prevActiveTarget);
        if (state) {
          state.lastActiveTime = performance.now();
        }
      }
      onDragEndRef.current?.();
      startFadeLoop();
    }
    if (el) {
      el.style.cursor = hoveredHandleRef.current ? "grab" : "";
    }
  };

  const handlers = {
    onLeftDown,
    onLeftMove,
    onLeftUp,
    onHover,
    onPointerLeave,
  };

  return {
    activeTargetRef,
    hoveredTargetRef,
    isDragging(id: T): boolean {
      return activeHandleRef.current?.targetId === id;
    },
    isHovered(id: T): boolean {
      return (
        hoveredHandleRef.current?.targetId === id ||
        activeHandleRef.current?.targetId === id
      );
    },
    isCenterHovered(id: T): boolean {
      return (
        hoveredHandleRef.current?.targetId === id &&
        hoveredHandleRef.current.type === "center"
      );
    },
    isCenterDragging(id: T): boolean {
      return (
        activeHandleRef.current?.targetId === id &&
        activeHandleRef.current.type === "center"
      );
    },
    getHoveredArrowId(id: T): string | null {
      if (
        hoveredHandleRef.current?.targetId === id &&
        hoveredHandleRef.current.type === "arrow"
      ) {
        return hoveredHandleRef.current.arrowId ?? null;
      }
      return null;
    },
    getDraggingArrowId(id: T): string | null {
      if (
        activeHandleRef.current?.targetId === id &&
        activeHandleRef.current.type === "arrow"
      ) {
        return activeHandleRef.current.arrowId ?? null;
      }
      return null;
    },
    getOpacity,
    getActiveTarget,
    getActiveTrack,
    handlers,
    onLeftDown,
    onLeftMove,
    onLeftUp,
    onHover,
    onPointerLeave,
  };
}
