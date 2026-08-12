import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  drawAxes,
  drawPoint,
  drawPolyline,
  drawSegment,
  type Bounds2,
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
import InlineMath from "./InlineMath";
import { useCanvas2D } from "./useCanvas2D";

const BOUNDS: Bounds2 = { xMin: -4.5, xMax: 4.5, yMin: -1.8, yMax: 1.8 };
const MARGIN = 30;

export default function TangentLineDemo() {
  const [a, setA] = useState(0.9);
  const [b, setB] = useState(2.4);
  const [showAxes, setShowAxes] = useState(true);
  const stateRef = useRef({ a: 0.9, b: 2.4 });
  const dragRef = useRef<"a" | "b" | null>(null);
  const axesRef = useRef(true);

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS,
    margin: MARGIN,
    draw(ctx, plot, theme) {
      const { a: pa, b: pb } = stateRef.current;
      if (axesRef.current) drawAxes(ctx, plot, theme, [-4, -2, 2, 4], [-1, 1]);
      const curve = sampleCurve(BOUNDS.xMin, BOUNDS.xMax, 240);
      drawPolyline(
        ctx,
        plot,
        curve.map((p) => [p.x, p.y] as [number, number]),
        { color: theme.ink, width: 2 },
      );
      drawSegment(ctx, plot, pa, f(pa), pb, f(pb), {
        color: theme.accent,
        width: 1.6,
        dash: [5, 4],
      });
      drawSegment(
        ctx,
        plot,
        BOUNDS.xMin,
        tangentLineAt(pa, BOUNDS.xMin),
        BOUNDS.xMax,
        tangentLineAt(pa, BOUNDS.xMax),
        { color: "#ef4444", width: 2 },
      );
      drawPoint(ctx, plot, pa, f(pa), { color: "#ef4444", filled: true });
      drawPoint(ctx, plot, pb, f(pb), { color: theme.accent, filled: false });
    },
    onLeftDown(_e, plot) {
      const { a: pa, b: pb } = stateRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return false;
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
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
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

  useEffect(() => {
    stateRef.current = { a, b };
    axesRef.current = showAxes;
    redraw();
  }, [a, b, showAxes, redraw]);

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
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <p className="text-xs text-muted">
          拖动两个圆点(实心=切点,空心=割线另一端);滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
