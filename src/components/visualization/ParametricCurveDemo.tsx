import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import {
  drawArrow,
  drawAxes,
  type Plot2D,
  type ThemeColors,
} from "../../visualizations/core/plot2d";
import {
  CURVES2D,
  type Curve2DId,
} from "../../visualizations/demos/parametric/curve2d";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const MARGIN = 30;
const CURVE_OPTIONS: { id: Curve2DId; label: string }[] = [
  { id: "circle", label: "圆" },
  { id: "parabola", label: "抛物线" },
];

function drawCurve(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  curveId: Curve2DId,
): void {
  const curve = CURVES2D[curveId];
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  curve.sample(160).forEach(([x, y], i) => {
    const sx = plot.toScreenX(x);
    const sy = plot.toScreenY(y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
}

/** 2D parametric curve explorer: circle / parabola, t slider + drag, tangent. */
export default function ParametricCurveDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const stateRef = useRef({ curve: "circle" as Curve2DId, t: 1.0 });
  const axesRef = useRef(true);
  const [curveId, setCurveId] = useState<Curve2DId>("circle");
  const [t, setT] = useState(1.0);
  const [showAxes, setShowAxes] = useState(true);

  const curve = CURVES2D[curveId];

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controller = createCanvas2D(container, canvas, {
      initialBounds: CURVES2D.circle.bounds,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const { curve: id, t: pt } = stateRef.current;
        const c = CURVES2D[id];
        if (axesRef.current) drawAxes(ctx, plot, theme, c.ticksX, c.ticksY);
        drawCurve(ctx, plot, theme, id);

        const [px, py] = c.point(pt);
        const [tx, ty] = c.tangent(pt);
        const mag = Math.hypot(tx, ty) || 1;
        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const sx = plot.toScreenX(px);
        const sy = plot.toScreenY(py);
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawArrow(
          ctx,
          sx,
          sy,
          (tx / mag) * 0.55 * kx,
          -(ty / mag) * 0.55 * ky,
          theme.accent,
          10,
          7,
          2,
        );
      },
      onLeftDown() {
        return true;
      },
      onLeftMove(e, plot) {
        const rect = canvas.getBoundingClientRect();
        const wx = plot.toWorldX(e.clientX - rect.left);
        const wy = plot.toWorldY(e.clientY - rect.top);
        const c = CURVES2D[stateRef.current.curve];
        setT(clamp(c.invert(wx, wy), c.tMin, c.tMax));
      },
    });
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    stateRef.current = { curve: curveId, t };
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
  }, [curveId, t, showAxes]);

  const handleCurveChange = (id: Curve2DId): void => {
    setCurveId(id);
    const c = CURVES2D[id];
    setT(c.defaultT);
    controllerRef.current?.setBounds(c.bounds);
  };

  const [x, y] = curve.point(t);
  const [tx, ty] = curve.tangent(t);

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
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {CURVE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCurveChange(option.id)}
                  className={
                    curveId === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-accent"
                      : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-muted">
              <InlineMath tex="t" />
              <input
                type="range"
                min={curve.tMin}
                max={curve.tMax}
                step={0.01}
                value={t}
                onChange={(event) => setT(Number(event.target.value))}
                className="w-44 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{t.toFixed(2)}</span>
            </label>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`\\mathbf r(t) = ${curve.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`\\mathbf r(${t.toFixed(2)}) = (${x.toFixed(3)}, ${y.toFixed(3)})`}
            />
          </p>
          <p>
            <InlineMath tex={`\\mathbf r'(t) = ${curve.texTangent}`} />
          </p>
          <p>
            <InlineMath
              tex={`\\mathbf r'(${t.toFixed(2)}) = (${tx.toFixed(3)}, ${ty.toFixed(3)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖动滑块或直接拖动曲线上的点;箭头是切线方向;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
