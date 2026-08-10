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
