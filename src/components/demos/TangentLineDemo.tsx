import { useState } from "react";
import {
  drawAdaptiveAxes,
  drawAdaptiveFunction,
  drawPoint,
  drawSegment,
  getVisibleBounds,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import {
  f,
  fprime,
  secantSlope,
  tangentLineAt,
} from "../../visualizations/scenes/calculus/tangent2d";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useCanvas2D } from "../framework/useCanvas2D";

const INITIAL_BOUNDS: Bounds2 = {
  xMin: -4.5,
  xMax: 4.5,
  yMin: -1.8,
  yMax: 1.8,
};
const MARGIN = 30;

export default function TangentLineDemo({ height }: { height?: string }) {
  const [a, setA] = useState(0.9);
  const [b, setB] = useState(2.4);
  const [dragTarget, setDragTarget] = useState<"a" | "b" | null>(null);

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: INITIAL_BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        // Infinitely and dynamically sample the function curve across the visible viewport
        drawAdaptiveFunction(ctx, plot, f, {
          color: theme.ink,
          width: 2,
          stepPx: 2,
        });

        // Secant segment between points A and B
        drawSegment(ctx, plot, a, f(a), b, f(b), {
          color: theme.accent,
          width: 1.6,
          dash: [5, 4],
        });

        // Tangent line extended across the entire visible window
        const visible = getVisibleBounds(plot);
        drawSegment(
          ctx,
          plot,
          visible.xMin,
          tangentLineAt(a, visible.xMin),
          visible.xMax,
          tangentLineAt(a, visible.xMax),
          { color: "#ef4444", width: 2 },
        );

        // Point A (tangent point)
        drawPoint(ctx, plot, a, f(a), {
          color: "#ef4444",
          filled: true,
          radius: 6,
        });
        // Point B (secant second point)
        drawPoint(ctx, plot, b, f(b), {
          color: theme.accent,
          filled: false,
          radius: 6,
        });
      },
      onLeftDown(e, plot) {
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return false;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const da = Math.hypot(
          px - plot.toScreenX(a),
          py - plot.toScreenY(f(a)),
        );
        const db = Math.hypot(
          px - plot.toScreenX(b),
          py - plot.toScreenY(f(b)),
        );
        const chosen = da <= db ? "a" : "b";
        setDragTarget(chosen);
        const x = plot.toWorldX(px);
        if (chosen === "a") setA(x);
        else setB(x);
        return true;
      },
      onLeftMove(e, plot) {
        if (!dragTarget) return;
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return;
        const x = plot.toWorldX(e.clientX - rect.left);
        if (dragTarget === "a") setA(x);
        else setB(x);
      },
      onLeftUp() {
        setDragTarget(null);
      },
    },
    [a, b, dragTarget],
  );

  const derivative = fprime(a);
  const secant = secantSlope(a, b);

  return (
    <ExpandableDemo id="tangent-line" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          <p>
            切线斜率{" "}
            <InlineMath
              tex={`f'(${a.toFixed(2)}) = ${derivative.toFixed(3)}`}
            />
          </p>
          <p>
            割线斜率{" "}
            <InlineMath
              tex={`\\frac{f(${b.toFixed(2)})-f(${a.toFixed(2)})}{${b.toFixed(2)}-${a.toFixed(2)}} = ${secant.toFixed(3)}`}
            />
          </p>
          <p>
            <InlineMath
              tex={`h = |${a.toFixed(2)} - ${b.toFixed(2)}| = ${Math.abs(a - b).toFixed(3)}`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖动两个圆点（实心为切点 A，空心为割线点
          B）；函数曲线随视野无界自适应重采样；滚轮缩放，中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
