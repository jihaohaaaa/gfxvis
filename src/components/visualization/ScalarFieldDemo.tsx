import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import {
  drawArrow,
  drawAxes,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import {
  SCALAR_FN,
  buildFieldImage,
  contourLevels,
  marchingSquares,
  sampleField,
} from "../../visualizations/demos/scalar-field/field";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const BOUNDS: Bounds2 = {
  xMin: -Math.PI,
  xMax: Math.PI,
  yMin: -Math.PI,
  yMax: Math.PI,
};
const NX = 180;
const NY = 140;
const MARGIN = 24;

export default function ScalarFieldDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const probeRef = useRef({ x: 0.6, y: 0.6 });
  const axesRef = useRef(true);
  const [probe, setProbe] = useState({ x: 0.6, y: 0.6 });
  const [showAxes, setShowAxes] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const field = sampleField(BOUNDS, NX, NY);
    const image = buildFieldImage(field, BOUNDS);
    const levels = contourLevels(field.min, field.max, 9);
    const contourSegments = levels.flatMap((level) =>
      marchingSquares(field.values, field.nx, field.ny, BOUNDS, level),
    );

    const controller = createCanvas2D(container, canvas, {
      initialBounds: BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        if (axesRef.current) {
          drawAxes(
            ctx,
            plot,
            theme,
            [-3, -2, -1, 1, 2, 3],
            [-3, -2, -1, 1, 2, 3],
          );
        }

        // Heatmap anchored to its world rect (so zoom/pan keep it correct).
        const hx0 = plot.toScreenX(BOUNDS.xMin);
        const hx1 = plot.toScreenX(BOUNDS.xMax);
        const hy0 = plot.toScreenY(BOUNDS.yMax);
        const hy1 = plot.toScreenY(BOUNDS.yMin);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, hx0, hy1, hx1 - hx0, hy0 - hy1);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(hx0, hy0, hx1 - hx0, hy1 - hy0);

        // Level curves (world-space segments).
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [p0, p1] of contourSegments) {
          ctx.moveTo(plot.toScreenX(p0[0]), plot.toScreenY(p0[1]));
          ctx.lineTo(plot.toScreenX(p1[0]), plot.toScreenY(p1[1]));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Sparse gradient arrows.
        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const arrowScale = 0.42;
        for (let x = -2.4; x <= 2.4; x += 1.2) {
          for (let y = -2.4; y <= 2.4; y += 1.2) {
            const gx = SCALAR_FN.gradX(x, y);
            const gy = SCALAR_FN.gradY(x, y);
            const mag = Math.hypot(gx, gy);
            if (mag < 1e-4) continue;
            const len = Math.min(arrowScale, 0.3 * mag);
            drawArrow(
              ctx,
              plot.toScreenX(x),
              plot.toScreenY(y),
              (gx / mag) * len * kx,
              -(gy / mag) * len * ky,
              theme.ink,
              7,
              5,
              1.3,
            );
          }
        }

        // Probe point + gradient arrow.
        const px = probeRef.current.x;
        const py = probeRef.current.y;
        const gx = SCALAR_FN.gradX(px, py);
        const gy = SCALAR_FN.gradY(px, py);
        const mag = Math.hypot(gx, gy);
        const sx = plot.toScreenX(px);
        const sy = plot.toScreenY(py);
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        if (mag > 1e-4) {
          const len = Math.min(0.55, 0.38 * mag);
          drawArrow(
            ctx,
            sx,
            sy,
            (gx / mag) * len * kx,
            -(gy / mag) * len * ky,
            theme.accent,
            10,
            7,
            2,
          );
        }
      },
      onHover(e, plot) {
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            BOUNDS.xMin,
            BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            BOUNDS.yMin,
            BOUNDS.yMax,
          ),
        });
      },
      onLeftDown() {
        return true;
      },
      onLeftMove(e, plot) {
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            BOUNDS.xMin,
            BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            BOUNDS.yMin,
            BOUNDS.yMax,
          ),
        });
      },
    });
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    probeRef.current = probe;
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
  }, [probe, showAxes]);

  const phi = SCALAR_FN.phi(probe.x, probe.y);
  const gx = SCALAR_FN.gradX(probe.x, probe.y);
  const gy = SCALAR_FN.gradY(probe.x, probe.y);

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
              φ({probe.x.toFixed(2)}, {probe.y.toFixed(2)}) = {phi.toFixed(3)}
            </p>
            <p>
              ∇φ = ({gx.toFixed(3)}, {gy.toFixed(3)})
            </p>
            <p>|∇φ| = {Math.hypot(gx, gy).toFixed(3)}</p>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <p className="text-xs text-muted">
          拖动探针:蓝→白→红为场值,箭头为梯度;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
