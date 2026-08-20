import { useState } from "react";
import {
  drawAdaptiveAxes,
  drawAdaptiveFunction,
  drawDragGizmo,
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
import { clamp } from "@math";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

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

  const dragHandlers = useVectorDrag<"a" | "b">({
    targets: [
      {
        id: "a",
        x: a,
        y: f(a),
        constraint: {
          type: "custom",
          project: (rawPos) => ({ x: rawPos.x, y: f(rawPos.x) }),
        },
      },
      {
        id: "b",
        x: b,
        y: f(b),
        constraint: {
          type: "custom",
          project: (rawPos) => ({ x: rawPos.x, y: f(rawPos.x) }),
        },
      },
    ],
    onDrag(id, pos) {
      if (id === "a") setA(clamp(pos.x, -4.5, 4.5));
      if (id === "b") setB(clamp(pos.x, -4.5, 4.5));
    },
  });

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: INITIAL_BOUNDS,
      margin: MARGIN,
      onLeftDown: dragHandlers.onLeftDown,
      onLeftMove: dragHandlers.onLeftMove,
      onLeftUp: dragHandlers.onLeftUp,
      onHover: dragHandlers.onHover,
      onPointerLeave: dragHandlers.onPointerLeave,
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

        // Point A (tangent point) 2D Transform Gizmo
        drawDragGizmo(ctx, plot, a, f(a), {
          color: "#ef4444",
          isHoveredCenter: dragHandlers.isCenterHovered("a"),
          isDraggingCenter: dragHandlers.isCenterDragging("a"),
          hoveredArrowId: dragHandlers.getHoveredArrowId("a"),
          draggingArrowId: dragHandlers.getDraggingArrowId("a"),
          opacity: dragHandlers.getOpacity("a"),
        });

        // Point B (secant second point) 2D Transform Gizmo
        drawDragGizmo(ctx, plot, b, f(b), {
          color: theme.accent,
          isHoveredCenter: dragHandlers.isCenterHovered("b"),
          isDraggingCenter: dragHandlers.isCenterDragging("b"),
          hoveredArrowId: dragHandlers.getHoveredArrowId("b"),
          draggingArrowId: dragHandlers.getDraggingArrowId("b"),
          opacity: dragHandlers.getOpacity("b"),
        });
      },
    },
    [a, b],
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
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
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
