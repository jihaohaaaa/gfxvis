import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/common/math";
import {
  drawArrow,
  drawAxes,
  drawPoint,
  drawPolyline,
} from "../../visualizations/core/2d/plot2d";
import {
  CURVES2D,
  type Curve2DId,
} from "../../visualizations/scenes/calculus/parametric-curve2d";
import CapsuleTabs from "../framework/CapsuleTabs";
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
  const showAxes = true;
  const stateRef = useRef({ curve: "circle" as Curve2DId, t: 1.0 });
  const axesRef = useRef(true);

  const curve = CURVES2D[curveId];

  const { containerRef, canvasRef, redraw, setBounds } = useCanvas2D({
    initialBounds: CURVES2D.circle.bounds,
    margin: MARGIN,
    draw(ctx, plot, theme) {
      const { curve: id, t: pt } = stateRef.current;
      const c = CURVES2D[id];
      if (axesRef.current) drawAxes(ctx, plot, theme, c.ticksX, c.ticksY);
      drawPolyline(ctx, plot, c.sample(160), { color: theme.ink, width: 2 });

      const [px, py] = c.point(pt);
      const [tx, ty] = c.tangent(pt);
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
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = plot.toWorldX(e.clientX - rect.left);
      const wy = plot.toWorldY(e.clientY - rect.top);
      const c = CURVES2D[stateRef.current.curve];
      setT(clamp(c.invert(wx, wy), c.tMin, c.tMax));
    },
  });

  useEffect(() => {
    stateRef.current = { curve: curveId, t };
    axesRef.current = showAxes;
    redraw();
  }, [curveId, t, showAxes, redraw]);

  const handleCurveChange = (id: Curve2DId): void => {
    setCurveId(id);
    const c = CURVES2D[id];
    setT(c.defaultT);
    setBounds(c.bounds);
  };

  const [x, y] = curve.point(t);
  const [tx, ty] = curve.tangent(t);

  return (
    <ExpandableDemo height={height}>
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
