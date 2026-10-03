import { useEffect, useMemo, useRef, useState } from "react";
import {
  BSPLINE_BOUNDS,
  BSPLINE_POINTS,
  createRepeatedInteriorKnotVector,
  evaluateBSpline,
  getContinuityForMultiplicity,
  sampleBSpline,
  type Point2,
} from "../../visualizations/scenes/graphics/bezier-splines";
import {
  drawAdaptiveAxes,
  drawPoint,
  drawPolyline,
} from "../../visualizations/core/2d/plot2d";
import CanvasResizer from "../framework/CanvasResizer";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import KdeCard from "../framework/KdeCard";
import KdeMessageBar from "../framework/KdeMessageBar";
import KdeReadout from "../framework/KdeReadout";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BSplineContinuityDemo.css";
import "./BezierSplineWorkspace.css";

type MultiplicityTab = "1" | "2" | "3" | "4";

const MULTIPLICITY_OPTIONS: readonly KdeTabOption<MultiplicityTab>[] = [
  { id: "1", label: "m = 1 · C²" },
  { id: "2", label: "m = 2 · C¹" },
  { id: "3", label: "m = 3 · C⁰" },
  { id: "4", label: "m = 4 · 断开" },
];

function formatPoint(point: Point2): string {
  return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
}

export default function BSplineContinuityDemo() {
  const [multiplicity, setMultiplicity] = useState(1);
  const [points, setPoints] = useState<Point2[]>(() =>
    BSPLINE_POINTS.map(([x, y]) => [x, y]),
  );
  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;

  const knots = useMemo(
    () => createRepeatedInteriorKnotVector(points.length, 3, multiplicity),
    [multiplicity, points.length],
  );
  const spanCount = Math.max(1, points.length - 3);
  const interiorKnot = Math.max(1, Math.floor(spanCount / 2));
  const continuity = getContinuityForMultiplicity(3, multiplicity);
  const leftPoint = evaluateBSpline(points, 3, interiorKnot - 1e-3, knots);
  const rightPoint = evaluateBSpline(points, 3, interiorKnot + 1e-3, knots);

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: BSPLINE_BOUNDS,
      margin: 36,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);
        const curve = sampleBSpline(pointsRef.current, 3, knots);
        drawPolyline(ctx, plot, curve, {
          color: theme.accent,
          width: 2.8,
        });
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.muted,
          width: 1.3,
          dash: [5, 5],
        });
        pointsRef.current.forEach(([x, y], index) => {
          drawPoint(ctx, plot, x, y, {
            color: theme.muted,
            filled: false,
            radius: 5,
          });
          ctx.fillStyle = theme.muted;
          ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(
            `P${index}`,
            plot.toScreenX(x) + 7,
            plot.toScreenY(y) - 7,
          );
        });

        const knotX =
          BSPLINE_BOUNDS.xMin +
          (interiorKnot / spanCount) *
            (BSPLINE_BOUNDS.xMax - BSPLINE_BOUNDS.xMin);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(knotX), plot.toScreenY(BSPLINE_BOUNDS.yMin));
        ctx.lineTo(plot.toScreenX(knotX), plot.toScreenY(BSPLINE_BOUNDS.yMax));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = theme.accent;
        ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(
          `knot u = ${interiorKnot} · ${continuity < 0 ? "断开" : `C${continuity}`}`,
          plot.toScreenX(knotX) + 8,
          plot.toScreenY(BSPLINE_BOUNDS.yMax) + 16,
        );
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        let nearest: number | null = null;
        let distance = 18;
        pointsRef.current.forEach(([x, y], index) => {
          const candidate = Math.hypot(
            plot.toScreenX(x) - px,
            plot.toScreenY(y) - py,
          );
          if (candidate < distance) {
            distance = candidate;
            nearest = index;
          }
        });
        dragIndexRef.current = nearest;
        return nearest !== null;
      },
      onLeftMove(event, plot) {
        const index = dragIndexRef.current;
        if (index === null) return;
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;
        const nextX = plot.toWorldX(event.clientX - rect.left);
        const nextY = plot.toWorldY(event.clientY - rect.top);
        setPoints((current) =>
          current.map((point, pointIndex) =>
            pointIndex === index ? [nextX, nextY] : point,
          ),
        );
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [knots, multiplicity, points],
  );

  useEffect(() => {
    setPoints(BSPLINE_POINTS.map(([x, y]) => [x, y]));
  }, [multiplicity]);

  const reset = () => {
    setPoints(BSPLINE_POINTS.map(([x, y]) => [x, y]));
    setMultiplicity(1);
    resetBounds();
  };

  return (
    <AutoMath>
      <ExpandableDemo id="bspline-continuity">
        <KdeWindowShell
          title="B-Spline · knot 重数与连续性"
          eyebrow="BREEZE WORKSPACE · KNOT MULTIPLICITY"
          mark="C"
          modeTag="CONTINUITY"
          testId="bspline-continuity-demo"
          className="bezier-spline-workspace"
          tabs={
            <KdeTabs
              label="内部 knot 重数"
              options={MULTIPLICITY_OPTIONS}
              value={String(multiplicity) as MultiplicityTab}
              onChange={(value) => setMultiplicity(Number(value))}
              variant="pill"
              size="sm"
              testId="bspline-continuity-tabs"
            />
          }
          display={
            <div
              ref={containerRef}
              data-testid="bspline-continuity-canvas"
              className="bspline-continuity__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
            >
              <CanvasToolbar onReset={reset} />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
              />
              <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
            </div>
          }
          controls={
            <div className="bspline-continuity__stack">
              <KdeCard title="局部连续性">
                <div className="space-y-3">
                  <KdeReadout
                    label="当前连续性"
                    value={continuity < 0 ? "断开" : `$C^${continuity}$`}
                    variant={continuity >= 1 ? "success" : "warning"}
                    testId="bspline-continuity-readout"
                  />
                  <ParamSlider
                    label="$m$"
                    min={1}
                    max={4}
                    step={1}
                    value={multiplicity}
                    onChange={setMultiplicity}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={String(multiplicity)}
                  />
                </div>
              </KdeCard>
              <KdeCard title="拼接点读数" variant="inset" className="flex-1">
                <div className="bspline-continuity__formula">
                  {`$C(u^-)=(${formatPoint(leftPoint)})$`}
                  <br />
                  {`$C(u^+)=(${formatPoint(rightPoint)})$`}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bspline-continuity__readouts">
              <KdeReadout
                label="连续性公式"
                value={`$C^{p-m},\\quad p = 3,\\quad m = ${multiplicity}$`}
                variant="formula"
              />
              <KdeReadout
                label="内部 knot"
                value={`$u = ${interiorKnot}$`}
                variant="accent"
              />
              <KdeMessageBar
                variant={continuity < 0 ? "warning" : "info"}
                mode="card"
                title="knot 重数的作用"
              >
                重数越高，跨越 knot 的连续性越低；控制点仍只影响局部 span。
              </KdeMessageBar>
            </div>
          }
        ></KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
