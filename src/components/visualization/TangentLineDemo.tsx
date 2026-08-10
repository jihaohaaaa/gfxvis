import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import {
  drawAxes,
  readThemeColors,
  type Bounds2,
  type Plot2D,
  type ThemeColors,
} from "../../visualizations/core/plot2d";
import {
  f,
  fprime,
  sampleCurve,
  secantSlope,
  tangentLineAt,
} from "../../visualizations/demos/univariate/tangent";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const BOUNDS: Bounds2 = { xMin: -4.5, xMax: 4.5, yMin: -1.8, yMax: 1.8 };
const MARGIN = 30;

function drawCurve(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
): void {
  const curve = sampleCurve(BOUNDS.xMin, BOUNDS.xMax, 240);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  curve.forEach((p, i) => {
    const sx = plot.toScreenX(p.x);
    const sy = plot.toScreenY(p.y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
}

function drawLineThrough(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  color: string,
  width: number,
  dash: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(plot.toScreenX(x0), plot.toScreenY(y0));
  ctx.lineTo(plot.toScreenX(x1), plot.toScreenY(y1));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  x: number,
  y: number,
  color: string,
  filled: boolean,
): void {
  const sx = plot.toScreenX(x);
  const sy = plot.toScreenY(y);
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, Math.PI * 2);
  ctx.fillStyle = filled ? color : readThemeColors().bg;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function TangentLineDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const dragRef = useRef<"a" | "b" | null>(null);
  const stateRef = useRef({ a: 0.9, b: 2.4 });
  const axesRef = useRef(true);
  const [a, setA] = useState(0.9);
  const [b, setB] = useState(2.4);
  const [showAxes, setShowAxes] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controller = createCanvas2D(container, canvas, {
      initialBounds: BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const { a: pa, b: pb } = stateRef.current;
        if (axesRef.current)
          drawAxes(ctx, plot, theme, [-4, -2, 2, 4], [-1, 1]);
        drawCurve(ctx, plot, theme);
        drawLineThrough(
          ctx,
          plot,
          theme.accent,
          1.6,
          [5, 4],
          pa,
          f(pa),
          pb,
          f(pb),
        );
        drawLineThrough(
          ctx,
          plot,
          "#ef4444",
          2,
          [],
          BOUNDS.xMin,
          tangentLineAt(pa, BOUNDS.xMin),
          BOUNDS.xMax,
          tangentLineAt(pa, BOUNDS.xMax),
        );
        drawPoint(ctx, plot, pa, f(pa), "#ef4444", true);
        drawPoint(ctx, plot, pb, f(pb), theme.accent, false);
      },
      onLeftDown(_e, plot) {
        const { a: pa, b: pb } = stateRef.current;
        const rect = canvas.getBoundingClientRect();
        const px = _e.clientX - rect.left;
        const py = _e.clientY - rect.top;
        const da = Math.hypot(
          px - plot.toScreenX(pa),
          py - plot.toScreenY(f(pa)),
        );
        const db = Math.hypot(
          px - plot.toScreenX(pb),
          py - plot.toScreenY(f(pb)),
        );
        dragRef.current = da <= db ? "a" : "b";
        return true;
      },
      onLeftMove(e, plot) {
        const target = dragRef.current;
        if (!target) return;
        const rect = canvas.getBoundingClientRect();
        const x = clamp(
          plot.toWorldX(e.clientX - rect.left),
          BOUNDS.xMin,
          BOUNDS.xMax,
        );
        if (target === "a") setA(x);
        else setB(x);
      },
      onLeftUp() {
        dragRef.current = null;
      },
    });
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    stateRef.current = { a, b };
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
  }, [a, b, showAxes]);

  const derivative = fprime(a);
  const secant = secantSlope(a, b);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            <p>
              切线斜率 f′({a.toFixed(2)}) = {derivative.toFixed(3)}
            </p>
            <p>割线斜率 = {secant.toFixed(3)}</p>
            <p>h = |a − b| = {Math.abs(a - b).toFixed(3)}</p>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <p className="text-xs text-muted">
          拖动两个圆点(实心=切点,空心=割线另一端);滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
