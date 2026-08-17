export interface Bounds2 {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Plot2D {
  width: number;
  height: number;
  margin: number;
  toScreenX(x: number): number;
  toScreenY(y: number): number;
  toWorldX(px: number): number;
  toWorldY(py: number): number;
}

/** Map a world-space bounds to pixel coordinates with a fixed margin. */
export function createPlot2D(
  bounds: Bounds2,
  width: number,
  height: number,
  margin = 24,
): Plot2D {
  const innerW = width - 2 * margin;
  const innerH = height - 2 * margin;
  const toScreenX = (x: number) =>
    margin + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * innerW;
  const toScreenY = (y: number) =>
    height -
    margin -
    ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * innerH;
  const toWorldX = (px: number) =>
    bounds.xMin + ((px - margin) / innerW) * (bounds.xMax - bounds.xMin);
  const toWorldY = (py: number) =>
    bounds.yMin +
    ((height - margin - py) / innerH) * (bounds.yMax - bounds.yMin);
  return { width, height, margin, toScreenX, toScreenY, toWorldX, toWorldY };
}

/** Return the world-space bounding box currently visible in the plot. */
export function getVisibleBounds(plot: Plot2D): Bounds2 {
  const x0 = plot.toWorldX(0);
  const x1 = plot.toWorldX(plot.width);
  const y0 = plot.toWorldY(plot.height);
  const y1 = plot.toWorldY(0);
  return {
    xMin: Math.min(x0, x1),
    xMax: Math.max(x0, x1),
    yMin: Math.min(y0, y1),
    yMax: Math.max(y0, y1),
  };
}

/**
 * Compute clean, human-readable tick values aligned to 1, 2, 5 * 10^k
 * covering the range [min, max].
 */
export function computeNiceTicks(
  min: number,
  max: number,
  maxTicks = 7,
): number[] {
  const span = max - min;
  if (span <= 0 || !Number.isFinite(span)) return [0];

  const rawStep = span / Math.max(2, maxTicks);
  const power = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, power);

  let niceFraction: number;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;

  const step = niceFraction * Math.pow(10, power);
  const firstTick = Math.ceil(min / step) * step;
  const ticks: number[] = [];

  const precision = Math.max(0, -power + 2);

  for (let t = firstTick; t <= max + step * 0.001; t += step) {
    const val = Number(t.toFixed(precision));
    ticks.push(val);
  }

  return ticks;
}

export interface ThemeColors {
  bg: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
}

/** Read the active GFX theme palette from CSS custom properties. */
export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: get("--gfx-surface", "#f8fafc"),
    ink: get("--gfx-ink", "#0f172a"),
    muted: get("--gfx-muted", "#64748b"),
    border: get("--gfx-border", "#e2e8f0"),
    accent: get("--gfx-accent", "#2563eb"),
  };
}

/** Re-run a callback whenever the html class (theme) changes. */
export function watchTheme(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/** Size a canvas for the device pixel ratio and return its 2D context. */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  clientWidth: number,
  clientHeight: number,
): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(clientHeight * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

/** Draw an arrow from (x, y) along vector (dx, dy). */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  headLength = 8,
  headWidth = 6,
  lineWidth = 1.6,
): void {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const hx = x + dx;
  const hy = y + dy;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(
    hx - ux * headLength - uy * (headWidth / 2),
    hy - uy * headLength + ux * (headWidth / 2),
  );
  ctx.lineTo(
    hx - ux * headLength + uy * (headWidth / 2),
    hy - uy * headLength - ux * (headWidth / 2),
  );
  ctx.closePath();
  ctx.fill();
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
): void {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(x + ux * size, y + uy * size);
  ctx.lineTo(x - uy * size, y + ux * size);
  ctx.lineTo(x + uy * size, y - ux * size);
  ctx.closePath();
  ctx.fill();
}

/** Draw labeled x/y axes with arrowheads and a subtle grid. */
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  xTicks: number[],
  yTicks: number[],
  xLabel = "x",
  yLabel = "y",
): void {
  const { margin, width, height } = plot;
  const left = margin;
  const right = width - margin;
  const top = margin;
  const bottom = height - margin;

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  for (const x of xTicks) {
    const sx = plot.toScreenX(x);
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, bottom);
  }
  for (const y of yTicks) {
    const sy = plot.toScreenY(y);
    ctx.moveTo(left, sy);
    ctx.lineTo(right, sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left, plot.toScreenY(0));
  ctx.lineTo(right, plot.toScreenY(0));
  ctx.moveTo(plot.toScreenX(0), top);
  ctx.lineTo(plot.toScreenX(0), bottom);
  ctx.stroke();

  ctx.fillStyle = theme.muted;
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const x of xTicks) {
    if (x === 0) continue;
    ctx.fillText(String(x), plot.toScreenX(x), bottom + 4);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const y of yTicks) {
    if (y === 0) continue;
    ctx.fillText(String(y), left - 6, plot.toScreenY(y));
  }
  // Arrowheads at the positive ends of the x/y axes.
  const axisColor = theme.muted;
  const sy0 = plot.toScreenY(0);
  const sx0 = plot.toScreenX(0);
  ctx.fillStyle = axisColor;
  arrowHead(ctx, right, sy0, 1, 0, 7);
  arrowHead(ctx, sx0, top, 0, -1, 7);

  ctx.fillStyle = theme.muted;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(xLabel, right + 14, sy0 - 8);
  ctx.fillText(yLabel, sx0 + 10, top - 12);
}

/** Draw automatically calculated adaptive axes with dynamic nice ticks and grid. */
export function drawAdaptiveAxes(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  xLabel = "x",
  yLabel = "y",
): void {
  const bounds = getVisibleBounds(plot);
  const xTicks = computeNiceTicks(
    bounds.xMin,
    bounds.xMax,
    Math.max(4, Math.floor(plot.width / 80)),
  );
  const yTicks = computeNiceTicks(
    bounds.yMin,
    bounds.yMax,
    Math.max(4, Math.floor(plot.height / 80)),
  );
  drawAxes(ctx, plot, theme, xTicks, yTicks, xLabel, yLabel);
}

export interface FunctionSampleOptions {
  stepPx?: number;
  domainMin?: number;
  domainMax?: number;
  maxDerivativeThreshold?: number;
}

/**
 * Dynamically sample a 1D scalar function y = f(x) across the currently visible
 * viewport with pixel-level resolution, handling asymptotes and domain bounds.
 */
export function sampleVisibleFunction1D(
  fn: (x: number) => number,
  plot: Plot2D,
  options: FunctionSampleOptions = {},
): Array<Array<[number, number]>> {
  const {
    stepPx = 2,
    domainMin = -Infinity,
    domainMax = Infinity,
    maxDerivativeThreshold = 500,
  } = options;

  const bounds = getVisibleBounds(plot);
  const startX = Math.max(bounds.xMin, domainMin);
  const endX = Math.min(bounds.xMax, domainMax);
  if (startX >= endX) return [];

  const startPx = plot.toScreenX(startX);
  const endPx = plot.toScreenX(endX);
  const minPx = Math.min(startPx, endPx);
  const maxPx = Math.max(startPx, endPx);

  const segments: Array<Array<[number, number]>> = [];
  let currentSegment: Array<[number, number]> = [];
  let prevY: number | null = null;
  let prevX: number | null = null;

  for (let px = minPx; px <= maxPx; px += stepPx) {
    const wx = plot.toWorldX(px);
    if (wx < startX || wx > endX) continue;

    let wy: number;
    try {
      wy = fn(wx);
    } catch {
      wy = NaN;
    }

    if (!Number.isFinite(wy)) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      prevY = null;
      prevX = null;
      continue;
    }

    // Detect vertical asymptotes / severe discontinuities
    if (prevY !== null && prevX !== null) {
      const dx = Math.abs(wx - prevX);
      const dy = Math.abs(wy - prevY);
      if (dx > 1e-7 && dy / dx > maxDerivativeThreshold) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }

    currentSegment.push([wx, wy]);
    prevX = wx;
    prevY = wy;
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

/** Draw a 1D scalar function y = f(x) dynamically sampled over the visible viewport. */
export function drawAdaptiveFunction(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  fn: (x: number) => number,
  style: PolylineStyle & FunctionSampleOptions = {},
): void {
  const segments = sampleVisibleFunction1D(fn, plot, style);
  for (const seg of segments) {
    drawPolyline(ctx, plot, seg, style);
  }
}

export interface PolylineStyle {
  color?: string;
  width?: number;
  dash?: number[];
  alpha?: number;
}

/** Stroke a polyline of world-space points through a plot. */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  pts: Array<[number, number]>,
  style: PolylineStyle = {},
): void {
  if (pts.length === 0) return;
  const { color = "#0f172a", width = 1.6, dash = [], alpha = 1 } = style;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const sx = plot.toScreenX(x);
    const sy = plot.toScreenY(y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

export interface PointStyle {
  color?: string;
  filled?: boolean;
  radius?: number;
  width?: number;
}

/** Draw a small circle (probe / marker) at a world-space point. */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  x: number,
  y: number,
  style: PointStyle = {},
): void {
  const { color = "#0f172a", filled = true, radius = 6, width = 2 } = style;
  const sx = plot.toScreenX(x);
  const sy = plot.toScreenY(y);
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = filled ? color : readThemeColors().bg;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Draw a small solid dot in screen pixel coordinates. */
export function drawPixelPoint(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  radius = 5,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export interface SegmentStyle {
  color?: string;
  width?: number;
  dash?: number[];
}

/** Draw a straight segment between two world-space points. */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  style: SegmentStyle = {},
): void {
  const { color = "#0f172a", width = 1.6, dash = [] } = style;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(plot.toScreenX(x0), plot.toScreenY(y0));
  ctx.lineTo(plot.toScreenX(x1), plot.toScreenY(y1));
  ctx.stroke();
  ctx.setLineDash([]);
}

export interface DragHandleOptions {
  color: string;
  isHovered?: boolean;
  isDragging?: boolean;
  radius?: number;
  strokeColor?: string;
  alwaysVisible?: boolean;
  opacity?: number;
}

/**
 * Standardized 2D draggable point handle.
 * Hidden by default in idle state; smoothly reveals on hover or drag with optional opacity fade.
 */
export function drawDragHandle(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  options: DragHandleOptions,
): void {
  const {
    color,
    isHovered = false,
    isDragging = false,
    radius = 6,
    strokeColor = "#ffffff",
    alwaysVisible = false,
    opacity,
  } = options;

  if (opacity !== undefined) {
    if (opacity <= 0.001) {
      return;
    }
  } else {
    if (!isHovered && !isDragging && !alwaysVisible) {
      return;
    }
  }

  const alpha = opacity ?? 1.0;
  const haloRadius = isDragging
    ? radius + 9
    : isHovered
      ? radius + 7
      : radius + 4;
  const haloAlpha = isDragging ? "66" : isHovered ? "40" : "1e";

  ctx.save();
  if (alpha < 0.999) {
    ctx.globalAlpha *= alpha;
  }

  // 1. Halo / interaction ring
  ctx.beginPath();
  ctx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
  ctx.fillStyle =
    color.startsWith("#") && color.length === 7
      ? color + haloAlpha
      : "rgba(100, 116, 139, 0.2)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = isHovered || isDragging ? 2.5 : 1.5;
  ctx.stroke();

  // 2. Core point
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

export interface DragGuideTrackOptions {
  origin?: { x: number; y: number };
  direction: { x: number; y: number };
  color?: string;
  label?: string;
  width?: number;
  dash?: number[];
  opacity?: number;
}

/**
 * Draws an extended directional guide line across the visible viewport for constrained dragging.
 */
export function drawDragGuideTrack(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  options: DragGuideTrackOptions,
): void {
  const {
    origin = { x: 0, y: 0 },
    direction,
    color = "#3b82f6",
    label,
    width = 1.5,
    dash = [5, 4],
    opacity = 1.0,
  } = options;

  if (opacity <= 0.001) return;

  const len = Math.hypot(direction.x, direction.y);
  if (len < 1e-6) return;
  const dx = direction.x / len;
  const dy = direction.y / len;

  const visible = getVisibleBounds(plot);
  const diag = Math.hypot(
    visible.xMax - visible.xMin,
    visible.yMax - visible.yMin,
  );
  const span = diag * 1.5;

  const p0 = { x: origin.x - dx * span, y: origin.y - dy * span };
  const p1 = { x: origin.x + dx * span, y: origin.y + dy * span };

  const s0x = plot.toScreenX(p0.x);
  const s0y = plot.toScreenY(p0.y);
  const s1x = plot.toScreenX(p1.x);
  const s1y = plot.toScreenY(p1.y);

  ctx.save();
  if (opacity < 0.999) {
    ctx.globalAlpha *= opacity;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(s0x, s0y);
  ctx.lineTo(s1x, s1y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw arrowheads at viewport edges
  ctx.fillStyle = color;
  arrowHead(ctx, s1x, s1y, dx, -dy, 6);
  arrowHead(ctx, s0x, s0y, -dx, dy, 6);

  if (label) {
    const originSx = plot.toScreenX(origin.x);
    const originSy = plot.toScreenY(origin.y);
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, (originSx + s1x) / 2, (originSy + s1y) / 2 - 6);
  }

  ctx.restore();
}

export interface GizmoArrowVisual {
  id: string;
  direction: { x: number; y: number };
  color?: string;
  label?: string;
  lengthPx?: number;
}

export interface DragGizmoOptions {
  color: string;
  isHoveredCenter?: boolean;
  isDraggingCenter?: boolean;
  hoveredArrowId?: string | null;
  draggingArrowId?: string | null;
  radius?: number;
  arrows?: GizmoArrowVisual[];
  alwaysVisible?: boolean;
  opacity?: number;
}

/**
 * Standardized 2D Transform Gizmo handle widget:
 * Center point for 2D free dragging + extending arrows for directional 1D constrained dragging.
 * Hidden by default in idle state; smoothly reveals on hover or drag with optional opacity fade.
 */
export function drawDragGizmo(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  x: number,
  y: number,
  options: DragGizmoOptions,
): void {
  const {
    color,
    isHoveredCenter = false,
    isDraggingCenter = false,
    hoveredArrowId = null,
    draggingArrowId = null,
    radius = 6,
    arrows = [],
    alwaysVisible = false,
    opacity,
  } = options;

  const sx = plot.toScreenX(x);
  const sy = plot.toScreenY(y);

  // 1. Permanent core point (always 100% visible)
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = isHoveredCenter || isDraggingCenter ? "#facc15" : color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // 2. Determine overlay opacity
  const alpha =
    opacity !== undefined
      ? opacity
      : isHoveredCenter ||
          isDraggingCenter ||
          hoveredArrowId !== null ||
          draggingArrowId !== null ||
          alwaysVisible
        ? 1.0
        : 0.0;

  if (alpha <= 0.001) {
    return;
  }

  ctx.save();
  if (alpha < 0.999) {
    ctx.globalAlpha *= alpha;
  }

  const hasActiveArrow = hoveredArrowId !== null || draggingArrowId !== null;

  // 3. Draw Directional Gizmo Arrows extending from center
  for (const arr of arrows) {
    const len = Math.hypot(arr.direction.x, arr.direction.y);
    if (len < 1e-6) continue;

    // Convert direction vector to screen space delta
    const sDx = plot.toScreenX(arr.direction.x) - plot.toScreenX(0);
    const sDy = plot.toScreenY(arr.direction.y) - plot.toScreenY(0);
    const sLen = Math.hypot(sDx, sDy) || 1;
    const ux = sDx / sLen;
    const uy = sDy / sLen;

    const shaftLen = arr.lengthPx ?? 32;
    const isArrActive = draggingArrowId === arr.id;
    const isArrHovered = hoveredArrowId === arr.id;
    const isMatch = isArrActive || isArrHovered;
    const arrowColor = isMatch ? "#facc15" : (arr.color ?? color);

    const startX = sx + ux * (radius + 2);
    const startY = sy + uy * (radius + 2);
    const tipX = sx + ux * shaftLen;
    const tipY = sy + uy * shaftLen;

    ctx.save();
    if (hasActiveArrow && !isMatch) {
      ctx.globalAlpha *= 0.35;
    }

    // Arrow hover / active glow ring at tip
    if (isMatch) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, isArrActive ? 14 : 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Arrow line shaft
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = isMatch ? 2.8 : 1.8;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = arrowColor;
    arrowHead(ctx, tipX, tipY, ux, uy, isMatch ? 8 : 6);

    // Optional label badge
    if (arr.label) {
      const labelDist = shaftLen + 14;
      const labelX = sx + ux * labelDist;
      const labelY = sy + uy * labelDist;
      ctx.font = isMatch
        ? "bold 11px ui-sans-serif, system-ui, sans-serif"
        : "bold 10px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = arrowColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(arr.label, labelX, labelY);
    }
    ctx.restore();
  }

  // 4. Draw Center Point Outer Halo when hovered or dragging
  if (isHoveredCenter || isDraggingCenter) {
    ctx.beginPath();
    ctx.arc(sx, sy, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.0;
    ctx.stroke();
  }

  ctx.restore();
}
