import { useState } from "react";
import { clamp } from "@math";
import {
  drawAdaptiveAxes,
  drawArrow,
  drawPoint,
  drawPolyline,
} from "../../visualizations/core/2d/plot2d";
import {
  CURVES2D,
  type Curve2DId,
} from "../../visualizations/scenes/calculus/parametric-curve2d";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";

const MARGIN = 30;
const CURVE_OPTIONS: { id: Curve2DId; label: string }[] = [
  { id: "circle", label: "圆" },
  { id: "parabola", label: "抛物线" },
];

/** 2D parametric curve explorer: circle / parabola, t slider + drag, tangent. */
export default function ParametricCurveDemo({ height }: { height?: string }) {
  const [curveId, setCurveId] = useState<Curve2DId>("circle");
  const [t, setT] = useState(1.0);

  const curve = CURVES2D[curveId];

  const { containerRef, canvasRef, setBounds, resetBounds } = useCanvas2D(
    {
      initialBounds: CURVES2D.circle.bounds,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);
        drawPolyline(ctx, plot, curve.sample(240), {
          color: theme.ink,
          width: 2,
        });

        const [px, py] = curve.point(t);
        const [tx, ty] = curve.tangent(t);
        const mag = Math.hypot(tx, ty) || 1;
        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        drawPoint(ctx, plot, px, py, {
          color: theme.accent,
          filled: true,
          radius: 6,
        });
        drawArrow(
          ctx,
          plot.toScreenX(px),
          plot.toScreenY(py),
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
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return;
        const wx = plot.toWorldX(e.clientX - rect.left);
        const wy = plot.toWorldY(e.clientY - rect.top);
        setT(clamp(curve.invert(wx, wy), curve.tMin, curve.tMax));
      },
    },
    [curveId, t],
  );

  const handleCurveChange = (id: Curve2DId): void => {
    setCurveId(id);
    const c = CURVES2D[id];
    setT(c.defaultT);
    setBounds(c.bounds);
  };

  const [x, y] = curve.point(t);
  const [tx, ty] = curve.tangent(t);

  return (
    <ExpandableDemo id="parametric-curve-2d" height={height}>
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
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <CapsuleTabs
            options={CURVE_OPTIONS}
            value={curveId}
            onChange={handleCurveChange}
          />
          <ParamSlider
            label={<InlineMath tex="t" />}
            min={curve.tMin}
            max={curve.tMax}
            step={0.01}
            value={t}
            onChange={setT}
            widthClass="w-44"
          />
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
          拖动滑块或直接拖动曲线上的点；坐标轴刻度随视野自适应；滚轮缩放，中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
