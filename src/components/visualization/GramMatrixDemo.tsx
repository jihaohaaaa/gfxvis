import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  drawAxes,
  drawPoint,
  drawSegment,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";
import InlineMath from "./InlineMath";
import { useCanvas2D } from "./useCanvas2D";

const BOUNDS: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };
const MARGIN = 30;

export default function GramMatrixDemo() {
  const [u, setU] = useState<{ x: number; y: number }>({ x: 2.2, y: 0.8 });
  const [v, setV] = useState<{ x: number; y: number }>({ x: 0.6, y: 2.2 });
  const [showAxes, setShowAxes] = useState(true);

  const stateRef = useRef({ u: { x: 2.2, y: 0.8 }, v: { x: 0.6, y: 2.2 } });
  const dragRef = useRef<"u" | "v" | null>(null);
  const axesRef = useRef(true);

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS,
    margin: MARGIN,
    draw(ctx, plot, theme) {
      const { u: pu, v: pv } = stateRef.current;
      if (axesRef.current) {
        drawAxes(
          ctx,
          plot,
          theme,
          [-3, -2, -1, 1, 2, 3],
          [-3, -2, -1, 1, 2, 3],
        );
      }

      const originX = plot.toScreenX(0);
      const originY = plot.toScreenY(0);
      const ux = plot.toScreenX(pu.x);
      const uy = plot.toScreenY(pu.y);
      const vx = plot.toScreenX(pv.x);
      const vy = plot.toScreenY(pv.y);
      const sumx = plot.toScreenX(pu.x + pv.x);
      const sumy = plot.toScreenY(pu.y + pv.y);

      // Draw filled parallelogram
      ctx.fillStyle = theme.accent + "22"; // semi-transparent accent
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(ux, uy);
      ctx.lineTo(sumx, sumy);
      ctx.lineTo(vx, vy);
      ctx.closePath();
      ctx.fill();

      // Draw dashed boundary edges
      drawSegment(ctx, plot, pu.x, pu.y, pu.x + pv.x, pu.y + pv.y, {
        color: theme.muted,
        width: 1.5,
        dash: [4, 4],
      });
      drawSegment(ctx, plot, pv.x, pv.y, pu.x + pv.x, pu.y + pv.y, {
        color: theme.muted,
        width: 1.5,
        dash: [4, 4],
      });

      // Draw vector u (blue accent)
      drawSegment(ctx, plot, 0, 0, pu.x, pu.y, {
        color: "#2563eb",
        width: 2.5,
      });
      drawPoint(ctx, plot, pu.x, pu.y, { color: "#2563eb", radius: 6 });

      // Draw vector v (emerald green)
      drawSegment(ctx, plot, 0, 0, pv.x, pv.y, {
        color: "#059669",
        width: 2.5,
      });
      drawPoint(ctx, plot, pv.x, pv.y, { color: "#059669", radius: 6 });

      // Labels on vector tips
      ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("u", ux + 10, uy - 6);

      ctx.fillStyle = "#059669";
      ctx.fillText("v", vx + 10, vy - 6);
    },
    onLeftDown(e, plot) {
      const { u: pu, v: pv } = stateRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const du = Math.hypot(
        px - plot.toScreenX(pu.x),
        py - plot.toScreenY(pu.y),
      );
      const dv = Math.hypot(
        px - plot.toScreenX(pv.x),
        py - plot.toScreenY(pv.y),
      );

      if (du < 24 || dv < 24) {
        dragRef.current = du <= dv ? "u" : "v";
        return true;
      }
      return false;
    },
    onLeftMove(e, plot) {
      const target = dragRef.current;
      if (!target) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const wx = clamp(
        plot.toWorldX(e.clientX - rect.left),
        BOUNDS.xMin,
        BOUNDS.xMax,
      );
      const wy = clamp(
        plot.toWorldY(e.clientY - rect.top),
        BOUNDS.yMin,
        BOUNDS.yMax,
      );

      if (target === "u") setU({ x: wx, y: wy });
      else setV({ x: wx, y: wy });
    },
    onLeftUp() {
      dragRef.current = null;
    },
  });

  useEffect(() => {
    stateRef.current = { u, v };
    axesRef.current = showAxes;
    redraw();
  }, [u, v, showAxes, redraw]);

  // Gram matrix computation
  const g11 = u.x * u.x + u.y * u.y;
  const g12 = u.x * v.x + u.y * v.y;
  const g22 = v.x * v.x + v.y * v.y;
  const detG = Math.max(0, g11 * g22 - g12 * g12);
  const area = Math.sqrt(detG);
  const isDegenerate = detG < 1e-4;

  const setOrthogonal = () => {
    setU({ x: 2.5, y: 0.0 });
    setV({ x: 0.0, y: 2.0 });
  };

  const setCollinear = () => {
    setU({ x: 2.0, y: 1.5 });
    setV({ x: -1.2, y: -0.9 });
  };

  const setGeneral = () => {
    setU({ x: 2.2, y: 0.8 });
    setV({ x: 0.6, y: 2.2 });
  };

  return (
    <ExpandableDemo>
      <div className="space-y-4">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>

        {/* Preset & Toggle Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">快捷预设:</span>
            <button
              onClick={setOrthogonal}
              className="rounded bg-surface-hover px-2 py-1 font-medium hover:bg-border transition-colors"
            >
              正交 (90°)
            </button>
            <button
              onClick={setCollinear}
              className="rounded bg-surface-hover px-2 py-1 font-medium hover:bg-border transition-colors"
            >
              共线 (退化 0°)
            </button>
            <button
              onClick={setGeneral}
              className="rounded bg-surface-hover px-2 py-1 font-medium hover:bg-border transition-colors"
            >
              一般独立
            </button>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>

        {/* Gram Matrix & Determinant Panel */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-foreground">
              Gram 矩阵 <InlineMath tex="G = A^T A" />
            </p>
            <div className="font-mono text-xs text-muted leading-relaxed">
              <p>
                g₁₁ = ⟨u, u⟩ ={" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {g11.toFixed(3)}
                </span>
              </p>
              <p>
                g₁₂ = g₂₁ = ⟨u, v⟩ ={" "}
                <span className="text-purple-600 dark:text-purple-400">
                  {g12.toFixed(3)}
                </span>
              </p>
              <p>
                g₂₂ = ⟨v, v⟩ ={" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {g22.toFixed(3)}
                </span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 font-semibold text-foreground">
              Gram 行列式与面积
            </p>
            <p className="text-xs text-muted">
              <InlineMath tex={`\\det(G) = ${detG.toFixed(3)}`} />
            </p>
            <p className="mt-1 text-xs font-medium text-accent">
              <InlineMath
                tex={`\\text{Area} = \\sqrt{\\det(G)} = ${area.toFixed(3)}`}
              />
            </p>

            {isDegenerate && (
              <p className="mt-1.5 text-xs text-red-500 font-semibold">
                ⚠️ 向量线性相关：平行四边形退化为线段，det(G) = 0，Gram
                矩阵不可逆。
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          提示：拖动 <span className="text-blue-600 font-medium">u</span> 或{" "}
          <span className="text-emerald-600 font-medium">v</span>{" "}
          向量端点更改向量位置；滚轮缩放，中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
