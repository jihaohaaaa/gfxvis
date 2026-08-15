import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  createCanvas2D,
  type Canvas2DController,
  type Canvas2DOptions,
} from "../../visualizations/core/2d/canvas2d";
import type { Bounds2 } from "../../visualizations/core/2d/plot2d";

export interface UseCanvas2DResult {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Trigger a redraw (call after ref-backed state changes). */
  redraw(): void;
  /** Reset the viewport to new world-space bounds (e.g. switching curves). */
  setBounds(bounds: Bounds2): void;
  /** Reset viewport back to the initial bounds. */
  resetBounds(): void;
}

/**
 * Mounts the shared 2D canvas controller (createCanvas2D) once and disposes it
 * on unmount. The options object is captured at mount; callers keep mutable
 * state in refs and call `redraw()` to repaint. SSR-safe: DOM work happens
 * only inside the effect.
 */
export function useCanvas2D(
  options: Canvas2DOptions,
  deps?: unknown[],
): UseCanvas2DResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const controller = createCanvas2D(container, canvas, {
      get initialBounds() {
        return optionsRef.current.initialBounds;
      },
      draw(ctx, plot, theme) {
        optionsRef.current.draw(ctx, plot, theme);
      },
      get margin() {
        return optionsRef.current.margin;
      },
      get minZoom() {
        return optionsRef.current.minZoom;
      },
      get maxZoom() {
        return optionsRef.current.maxZoom;
      },
      get equalScale() {
        return optionsRef.current.equalScale;
      },
      onLeftDown(e, plot) {
        return optionsRef.current.onLeftDown?.(e, plot) ?? false;
      },
      onLeftMove(e, plot) {
        optionsRef.current.onLeftMove?.(e, plot);
      },
      onLeftUp(e) {
        optionsRef.current.onLeftUp?.(e);
      },
      onHover(e, plot) {
        optionsRef.current.onHover?.(e, plot);
      },
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const redraw = useCallback(() => {
    controllerRef.current?.redraw();
  }, []);

  useEffect(() => {
    if (deps && controllerRef.current) {
      controllerRef.current.redraw();
    }
  }, deps ?? []);

  const setBounds = useCallback((bounds: Bounds2) => {
    controllerRef.current?.setBounds(bounds);
  }, []);

  const resetBounds = useCallback(() => {
    controllerRef.current?.resetBounds();
  }, []);

  return { containerRef, canvasRef, redraw, setBounds, resetBounds };
}
