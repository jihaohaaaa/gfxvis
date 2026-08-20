import { clamp } from "@math";
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
  onHover?(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
  onPointerLeave?(e: PointerEvent, plot: Plot2D, redraw?: () => void): void;
}

export interface Canvas2DOptions extends Canvas2DHandlers {
  initialBounds: Bounds2;
  draw(ctx: CanvasRenderingContext2D, plot: Plot2D, theme: ThemeColors): void;
  margin?: number;
  /** Zoom clamp relative to the initial span. */
  minZoom?: number;
  maxZoom?: number;
  /**
   * Keep the x and y axes at the same pixels-per-unit (default true): the
   * viewport is always a canvas-aspect rectangle centered on the requested
   * bounds, so the requested region stays fully visible and a unit step looks
   * identical on both axes. Zoom scales both axes equally; panning and resizing
   * preserve the scale. Set to false for the old independent x/y framing.
   */
  equalScale?: boolean;
}

export interface Canvas2DController {
  redraw(): void;
  /** Reset the viewport to a new world-space bounds (e.g. switching curves). */
  setBounds(bounds: Bounds2): void;
  /** Reset viewport back to the initial bounds. */
  resetBounds(): void;
  dispose(): void;
}

export interface Size {
  w: number;
  h: number;
}

/** Centered canvas-aspect rectangle that contains `req` at equal px/unit. */
export function fitBounds(req: Bounds2, size: Size, margin: number): Bounds2 {
  const innerW = size.w - 2 * margin;
  const innerH = size.h - 2 * margin;
  const reqW = req.xMax - req.xMin;
  const reqH = req.yMax - req.yMin;
  const scale = Math.min(innerW / reqW, innerH / reqH);
  const spanX = innerW / scale;
  const spanY = innerH / scale;
  const cx = (req.xMin + req.xMax) / 2;
  const cy = (req.yMin + req.yMax) / 2;
  return {
    xMin: cx - spanX / 2,
    xMax: cx + spanX / 2,
    yMin: cy - spanY / 2,
    yMax: cy + spanY / 2,
  };
}

/** px-per-unit that fits `req` into `size`. */
export function fitScale(req: Bounds2, size: Size, margin: number): number {
  const innerW = size.w - 2 * margin;
  const innerH = size.h - 2 * margin;
  return Math.min(
    innerW / (req.xMax - req.xMin),
    innerH / (req.yMax - req.yMin),
  );
}

/** Rect centered at (cx, cy) that fills the canvas at the given px/unit. */
export function centeredBounds(
  cx: number,
  cy: number,
  size: Size,
  scale: number,
  margin: number,
): Bounds2 {
  const innerW = size.w - 2 * margin;
  const innerH = size.h - 2 * margin;
  return {
    xMin: cx - innerW / (2 * scale),
    xMax: cx + innerW / (2 * scale),
    yMin: cy - innerH / (2 * scale),
    yMax: cy + innerH / (2 * scale),
  };
}

/**
 * Shared 2D canvas controller: wheel = zoom at cursor, middle-drag = pan,
 * left-drag = the demo's own interaction, plus resize/theme handling. By
 * default the view keeps equal x/y pixels-per-unit (see equalScale).
 */
export function createCanvas2D(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  options: Canvas2DOptions,
): Canvas2DController {
  const margin = options.margin ?? 24;
  const minZoom = options.minZoom ?? 0.25;
  const maxZoom = options.maxZoom ?? 8;
  const equalScale = options.equalScale ?? true;
  const initial = options.initialBounds;
  const minSpanX = (initial.xMax - initial.xMin) * minZoom;
  const maxSpanX = (initial.xMax - initial.xMin) * maxZoom;
  const minSpanY = (initial.yMax - initial.yMin) * minZoom;
  const maxSpanY = (initial.yMax - initial.yMin) * maxZoom;

  /** The bounds the demo asked for; the view is fitted around it when equalScale. */
  let requestedBounds: Bounds2 = { ...initial };
  let bounds: Bounds2 = { ...initial };
  /** Pixels per world unit when equalScale is on. */
  let pxPerUnit = 0;
  let lastRect: Size = { w: 0, h: 0 };
  let panning = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const draw = () => {
    const rect = container.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const size = { w: rect.width, h: rect.height };
    if (equalScale) {
      if (lastRect.w === 0 && lastRect.h === 0) {
        // First fit: show the requested region at equal scale.
        bounds = fitBounds(requestedBounds, size, margin);
        pxPerUnit = fitScale(requestedBounds, size, margin);
      } else if (size.w !== lastRect.w || size.h !== lastRect.h) {
        // Resize: keep the center and px/unit, refill the new canvas.
        const cx = (bounds.xMin + bounds.xMax) / 2;
        const cy = (bounds.yMin + bounds.yMax) / 2;
        bounds = centeredBounds(cx, cy, size, pxPerUnit, margin);
      }
      lastRect = size;
    }
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

    if (equalScale) {
      const size = { w: rect.width, h: rect.height };
      const baseScale = fitScale(requestedBounds, size, margin);
      const nextScale = clamp(
        pxPerUnit * factor,
        baseScale * minZoom,
        baseScale * maxZoom,
      );
      if (nextScale === pxPerUnit) return;
      const innerW = rect.width - 2 * margin;
      const innerH = rect.height - 2 * margin;
      const newSpanX = innerW / nextScale;
      const newSpanY = innerH / nextScale;
      const spanX = bounds.xMax - bounds.xMin;
      const spanY = bounds.yMax - bounds.yMin;
      const tx = (wx - bounds.xMin) / spanX;
      const ty = (wy - bounds.yMin) / spanY;
      bounds = {
        xMin: wx - tx * newSpanX,
        xMax: wx + (1 - tx) * newSpanX,
        yMin: wy - ty * newSpanY,
        yMax: wy + (1 - ty) * newSpanY,
      };
      pxPerUnit = nextScale;
      draw();
      return;
    }

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
    // Middle click (button 1) or Right click (button 2) for 2D panning
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    // Left click (button 0): dedicated to object interaction (must return true from onLeftDown)
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
    options.onHover?.(e, plot, draw);
  };

  const onPointerLeave = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const plot = createPlot2D(bounds, rect.width, rect.height, margin);
    options.onHover?.(e, plot, draw);
    options.onPointerLeave?.(e, plot, draw);
  };

  const onPointerUp = (e: PointerEvent) => {
    panning = false;
    if (dragging) {
      dragging = false;
      options.onLeftUp?.(e);
    }
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", onContextMenu);

  const stopThemeWatch = watchTheme(draw);
  const resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(container);
  draw();

  return {
    redraw: draw,
    setBounds(next: Bounds2) {
      requestedBounds = { ...next };
      if (equalScale) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width >= 40 && rect.height >= 40) {
          const size = { w: rect.width, h: rect.height };
          bounds = fitBounds(next, size, margin);
          pxPerUnit = fitScale(next, size, margin);
        } else {
          bounds = { ...next };
        }
      } else {
        bounds = { ...next };
      }
      draw();
    },
    resetBounds() {
      requestedBounds = { ...initial };
      if (equalScale) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width >= 40 && rect.height >= 40) {
          const size = { w: rect.width, h: rect.height };
          bounds = fitBounds(initial, size, margin);
          pxPerUnit = fitScale(initial, size, margin);
        } else {
          bounds = { ...initial };
        }
      } else {
        bounds = { ...initial };
      }
      draw();
    },
    dispose() {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      stopThemeWatch();
      resizeObserver.disconnect();
    },
  };
}
