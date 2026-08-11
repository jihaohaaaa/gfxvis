import { clamp } from "./math";
import {
  clearCanvas,
  createPlot2D,
  readThemeColors,
  resizeCanvas,
  watchTheme,
  type Bounds2,
  type Plot2D,
  type ThemeColors,
} from "./plot2d";

export interface Canvas2DHandlers {
  /** Left-drag interaction. Return true to claim the gesture. */
  onLeftDown?(e: PointerEvent, plot: Plot2D): boolean;
  onLeftMove?(e: PointerEvent, plot: Plot2D): void;
  onLeftUp?(e: PointerEvent): void;
  /** Hover (pointer move without buttons): e.g. follow a probe. */
  onHover?(e: PointerEvent, plot: Plot2D): void;
}

export interface Canvas2DOptions extends Canvas2DHandlers {
  initialBounds: Bounds2;
  draw(ctx: CanvasRenderingContext2D, plot: Plot2D, theme: ThemeColors): void;
  margin?: number;
  /** Zoom clamp relative to the initial span. */
  minZoom?: number;
  maxZoom?: number;
}

export interface Canvas2DController {
  redraw(): void;
  /** Reset the viewport to a new world-space bounds (e.g. switching curves). */
  setBounds(bounds: Bounds2): void;
  dispose(): void;
}

/**
 * Shared 2D canvas controller: wheel = zoom at cursor, middle-drag = pan,
 * left-drag = the demo's own interaction, plus resize/theme handling.
 */
export function createCanvas2D(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  options: Canvas2DOptions,
): Canvas2DController {
  const margin = options.margin ?? 24;
  const minZoom = options.minZoom ?? 0.25;
  const maxZoom = options.maxZoom ?? 8;
  const initial = options.initialBounds;
  const minSpanX = (initial.xMax - initial.xMin) * minZoom;
  const maxSpanX = (initial.xMax - initial.xMin) * maxZoom;
  const minSpanY = (initial.yMax - initial.yMin) * minZoom;
  const maxSpanY = (initial.yMax - initial.yMin) * maxZoom;

  let bounds: Bounds2 = { ...initial };
  let panning = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const draw = () => {
    const rect = container.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const ctx = resizeCanvas(canvas, rect.width, rect.height);
    const theme = readThemeColors();
    clearCanvas(ctx, rect.width, rect.height, theme.bg);
    const plot = createPlot2D(bounds, rect.width, rect.height, margin);
    options.draw(ctx, plot, theme);
  };

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const plot = createPlot2D(bounds, rect.width, rect.height, margin);
    const wx = plot.toWorldX(clientX - rect.left);
    const wy = plot.toWorldY(clientY - rect.top);
    const spanX = bounds.xMax - bounds.xMin;
    const spanY = bounds.yMax - bounds.yMin;
    const newSpanX = clamp(spanX / factor, minSpanX, maxSpanX);
    const newSpanY = clamp(spanY / factor, minSpanY, maxSpanY);
    const tx = (wx - bounds.xMin) / spanX;
    const ty = (wy - bounds.yMin) / spanY;
    bounds = {
      xMin: wx - tx * newSpanX,
      xMax: wx + (1 - tx) * newSpanX,
      yMin: wy - ty * newSpanY,
      yMax: wy + (1 - ty) * newSpanY,
    };
    draw();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const plot = createPlot2D(bounds, rect.width, rect.height, margin);
      if (options.onLeftDown?.(e, plot) ?? false) {
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const plot = createPlot2D(bounds, rect.width, rect.height, margin);
    if (panning) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const wxPerPx = (bounds.xMax - bounds.xMin) / (rect.width - 2 * margin);
      const wyPerPx = (bounds.yMax - bounds.yMin) / (rect.height - 2 * margin);
      bounds = {
        xMin: bounds.xMin - dx * wxPerPx,
        xMax: bounds.xMax - dx * wxPerPx,
        yMin: bounds.yMin + dy * wyPerPx,
        yMax: bounds.yMax + dy * wyPerPx,
      };
      draw();
      return;
    }
    if (dragging) {
      options.onLeftMove?.(e, plot);
      return;
    }
    options.onHover?.(e, plot);
  };

  const onPointerUp = (e: PointerEvent) => {
    panning = false;
    if (dragging) {
      dragging = false;
      options.onLeftUp?.(e);
    }
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  const stopThemeWatch = watchTheme(draw);
  const resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(container);
  draw();

  return {
    redraw: draw,
    setBounds(next: Bounds2) {
      bounds = { ...next };
      draw();
    },
    dispose() {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      stopThemeWatch();
      resizeObserver.disconnect();
    },
  };
}
