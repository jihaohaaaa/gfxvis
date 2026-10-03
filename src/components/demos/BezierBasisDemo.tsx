import { useEffect, useRef, useState } from "react";
import {
  BEZIER_PRESETS,
  bernsteinWeights,
  createBezierPointsForDegree,
  evaluateBezier,
  getPointsBounds,
  sampleBezier,
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
import InteractiveViewportGroup from "../framework/InteractiveViewportGroup";
import KdeButton from "../framework/KdeButton";
import KdeCard from "../framework/KdeCard";
import KdeMessageBar from "../framework/KdeMessageBar";
import KdeReadout from "../framework/KdeReadout";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BezierBasisDemo.css";
import "./BezierSplineWorkspace.css";

const BASIS_PALETTE = [
  "#3daee9", // blue
  "#27ae60", // green
  "#f67400", // orange
  "#9b59b6", // purple
  "#e74c3c", // rose
  "#16a085", // teal
  "#34495e", // slate
];

function formatPoint(point: Point2): string {
  return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
}

interface BernsteinBasisCanvasProps {
  degree: number;
  t: number;
  weights: number[];
  title?: React.ReactNode;
  caption?: React.ReactNode;
}

function BernsteinBasisCanvas({
  degree,
  t,
  weights,
  title = "BERNSTEIN BASIS",
  caption = "$B_i^n(t)$",
}: BernsteinBasisCanvasProps) {
  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: { xMin: 0, xMax: 1, yMin: -0.05, yMax: 1.08 },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "t", "B");

        // 1. Horizontal reference line at y = 1.0 (Sum benchmark)
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(0), plot.toScreenY(1));
        ctx.lineTo(plot.toScreenX(1), plot.toScreenY(1));
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = theme.muted;
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText("∑ = 1.00", plot.toScreenX(1) - 4, plot.toScreenY(1) - 4);

        // 2. Draw Bernstein basis curves
        for (let index = 0; index <= degree; index += 1) {
          const samples = Array.from({ length: 121 }, (_, sampleIndex) => {
            const sampleT = sampleIndex / 120;
            return [
              sampleT,
              bernsteinWeights(degree, sampleT)[index],
            ] as Point2;
          });
          const color = BASIS_PALETTE[index % BASIS_PALETTE.length];
          drawPolyline(ctx, plot, samples, {
            color,
            width: 2.2,
            alpha: 0.9,
          });
        }

        // 3. Draw vertical probe guide line at t
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(t), plot.toScreenY(0));
        ctx.lineTo(plot.toScreenX(t), plot.toScreenY(1));
        ctx.stroke();
        ctx.restore();

        // 4. Draw stacked column segments at t (Partition of Unity)
        const barX = plot.toScreenX(t);
        const barWidth = 6;
        let accumulated = 0;

        weights.forEach((weight, index) => {
          const yBottom = accumulated;
          const yTop = accumulated + weight;
          accumulated = yTop;

          const screenY0 = plot.toScreenY(yBottom);
          const screenY1 = plot.toScreenY(yTop);
          const segmentHeight = Math.max(1.5, screenY0 - screenY1);

          ctx.fillStyle = BASIS_PALETTE[index % BASIS_PALETTE.length];
          ctx.fillRect(barX - barWidth / 2, screenY1, barWidth, segmentHeight);
        });

        // 5. Marker at sum top cap (t, 1.0)
        drawPoint(ctx, plot, t, 1.0, {
          color: theme.ink,
          filled: true,
          radius: 3.5,
        });

        // 6. Draw individual points on basis curves (t, B_i(t))
        weights.forEach((weight, index) => {
          drawPoint(ctx, plot, t, weight, {
            color: BASIS_PALETTE[index % BASIS_PALETTE.length],
            filled: true,
            radius: 4.5,
          });
        });

        // 7. Group and render weight labels
        const grouped = new Map<
          string,
          { indices: number[]; weight: number }
        >();
        weights.forEach((weight, index) => {
          const key = weight.toFixed(2);
          const existing = grouped.get(key);
          if (existing) {
            existing.indices.push(index);
          } else {
            grouped.set(key, { indices: [index], weight });
          }
        });

        ctx.fillStyle = theme.ink;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        const isRightAligned = t > 0.75;
        ctx.textAlign = isRightAligned ? "right" : "left";

        grouped.forEach(({ indices, weight }) => {
          const label = `${indices.map((i) => `B${i}`).join("=")}=${weight.toFixed(2)}`;
          const screenX = isRightAligned
            ? plot.toScreenX(t) - 8
            : plot.toScreenX(t) + 8;
          const rawScreenY = plot.toScreenY(weight) + 4;
          const screenY = Math.max(
            plot.margin + 12,
            Math.min(plot.height - plot.margin - 6, rawScreenY),
          );
          ctx.fillText(label, screenX, screenY);
        });
      },
    },
    [degree, t],
  );

  return (
    <div
      className="bezier-basis__viewport"
      data-testid="bezier-basis-basis-viewport"
    >
      <div className="bezier-basis__viewport-header">
        <span>{title}</span>
        <span className="bezier-basis__viewport-caption">{caption}</span>
      </div>
      <div
        ref={containerRef}
        data-testid="bezier-basis-basis-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
      >
        <CanvasToolbar onReset={resetBounds} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );
}

interface BezierGeometryCanvasProps {
  degree: number;
  t: number;
  points: Point2[];
  onPointsChange(points: Point2[]): void;
  title?: React.ReactNode;
  caption?: React.ReactNode;
}

function BezierGeometryCanvas({
  degree,
  t,
  points,
  onPointsChange,
  title = "CONTROL POLYGON / CONVEX HULL",
  caption = "$C(t)$",
}: BezierGeometryCanvasProps) {
  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;
  const initialBounds =
    BEZIER_PRESETS[degree]?.bounds ?? getPointsBounds(points);
  const curvePoint = evaluateBezier(points, t);

  const { containerRef, canvasRef, setBounds, resetBounds } = useCanvas2D(
    {
      initialBounds,
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);
        drawPolyline(ctx, plot, sampleBezier(pointsRef.current), {
          color: theme.accent,
          width: 2.8,
        });
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.muted,
          width: 1.4,
          dash: [5, 5],
        });

        pointsRef.current.forEach(([x, y], index) => {
          drawPoint(ctx, plot, x, y, {
            color: BASIS_PALETTE[index % BASIS_PALETTE.length],
            filled: true,
            radius: 6,
            width: 1.8,
          });
          ctx.fillStyle = theme.ink;
          ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(
            `P${index}`,
            plot.toScreenX(x) + 8,
            plot.toScreenY(y) - 8,
          );
        });

        drawPoint(ctx, plot, curvePoint[0], curvePoint[1], {
          color: theme.ink,
          filled: true,
          radius: 5,
          width: 2,
        });
        ctx.fillStyle = theme.accent;
        ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(
          `C(t) = ${formatPoint(curvePoint)}`,
          plot.toScreenX(curvePoint[0]) + 10,
          plot.toScreenY(curvePoint[1]) - 10,
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
        const nextPoints: Point2[] = pointsRef.current.map(
          (point, pointIndex) =>
            pointIndex === index ? [nextX, nextY] : point,
        );
        pointsRef.current = nextPoints;
        onPointsChange(nextPoints);
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [degree, points, t],
  );

  useEffect(() => {
    setBounds(BEZIER_PRESETS[degree]?.bounds ?? getPointsBounds(points));
  }, [degree, setBounds]);

  return (
    <div
      className="bezier-basis__viewport"
      data-testid="bezier-basis-geometry-viewport"
    >
      <div className="bezier-basis__viewport-header">
        <span>{title}</span>
        <span className="bezier-basis__viewport-caption">{caption}</span>
      </div>
      <div
        ref={containerRef}
        data-testid="bezier-basis-geometry-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
      >
        <CanvasToolbar onReset={resetBounds} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );
}

export interface BezierBasisDemoProps {
  initialDegree?: number;
  minDegree?: number;
  maxDegree?: number;
}

export default function BezierBasisDemo({
  initialDegree = 3,
  minDegree = 1,
  maxDegree = 6,
}: BezierBasisDemoProps) {
  const [degree, setDegree] = useState<number>(() =>
    Math.max(minDegree, Math.min(maxDegree, initialDegree)),
  );
  const [t, setT] = useState(0.5);
  const [points, setPoints] = useState<Point2[]>(() =>
    createBezierPointsForDegree(degree),
  );

  const weights = bernsteinWeights(degree, t);
  const curvePoint = evaluateBezier(points, t);

  const handleDegreeChange = (nextDegree: number) => {
    const clamped = Math.max(minDegree, Math.min(maxDegree, nextDegree));
    setDegree(clamped);
    setPoints(createBezierPointsForDegree(clamped));
  };

  const reset = () => {
    setPoints(createBezierPointsForDegree(degree));
    setT(0.5);
  };

  const basisCanvas = (
    <BernsteinBasisCanvas
      degree={degree}
      t={t}
      weights={weights}
      title="BERNSTEIN BASIS"
      caption="$B_i^n(t)$"
    />
  );
  const geometryCanvas = (
    <BezierGeometryCanvas
      degree={degree}
      t={t}
      points={points}
      onPointsChange={setPoints}
      title="CONTROL POLYGON / CONVEX HULL"
      caption="$C(t)$"
    />
  );

  return (
    <AutoMath>
      <ExpandableDemo id="bezier-basis">
        <KdeWindowShell
          title="Bézier · Bernstein 基函数与凸包"
          eyebrow="BREEZE WORKSPACE · BASIS WEIGHTS"
          mark="B"
          modeTag={`DEGREE ${degree}`}
          testId="bezier-basis-demo"
          className="bezier-spline-workspace"
          displayClassName="kde-window-shell__display--viewport-group"
          display={
            <InteractiveViewportGroup
              items={[basisCanvas, geometryCanvas]}
              columns={2}
              mobileColumns={1}
              className="bezier-basis__viewport-group"
              itemClassName="bezier-basis__viewport-item"
              testId="bezier-basis-canvas-group"
            />
          }
          controls={
            <div className="bezier-demo__stack">
              <KdeCard title="参数探针">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--kde-border)]/40 pb-2">
                    <span className="text-xs font-medium text-[var(--kde-muted)]">
                      次数 $n$ (阶数)
                    </span>
                    <div
                      className="flex items-center gap-1.5"
                      data-testid="bezier-basis-degree-stepper"
                    >
                      <KdeButton
                        size="xs"
                        variant="default"
                        onClick={() => handleDegreeChange(degree - 1)}
                        disabled={degree <= minDegree}
                        aria-label="减少次数"
                        data-testid="bezier-basis-degree-dec"
                      >
                        − 降次
                      </KdeButton>
                      <span
                        className="min-w-[3.6rem] text-center font-mono text-xs font-bold text-[var(--kde-accent)]"
                        data-testid="bezier-basis-degree-value"
                      >
                        {`$n = ${degree}$`}
                      </span>
                      <KdeButton
                        size="xs"
                        variant="default"
                        onClick={() => handleDegreeChange(degree + 1)}
                        disabled={degree >= maxDegree}
                        aria-label="增加次数"
                        data-testid="bezier-basis-degree-inc"
                      >
                        ＋ 升次
                      </KdeButton>
                    </div>
                  </div>
                  <ParamSlider
                    label="$t$"
                    min={0}
                    max={1}
                    step={0.01}
                    value={t}
                    onChange={setT}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={t.toFixed(2)}
                  />
                  <div>
                    <KdeButton size="xs" variant="default" onClick={reset}>
                      恢复当前次数预设
                    </KdeButton>
                  </div>
                </div>
              </KdeCard>
              <KdeCard
                title="当前权重"
                testId="bezier-basis-weights"
                className="flex-1"
              >
                <div className="bezier-demo__weight-list">
                  {weights.map((weight, index) => (
                    <div key={index} className="bezier-demo__weight-row">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              BASIS_PALETTE[index % BASIS_PALETTE.length],
                          }}
                        />
                        {`$B_${index}^${degree}(t)$`}
                      </span>
                      <strong>{weight.toFixed(3)}</strong>
                    </div>
                  ))}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bezier-demo__readouts">
              <KdeReadout
                label="权重和 (权性为一)"
                value={`$\\sum_{i=0}^${degree} B_i^${degree}(t) = ${weights.reduce((a, b) => a + b, 0).toFixed(3)}$`}
                variant="success"
                testId="bezier-basis-sum"
              />
              <KdeReadout
                label="曲线点"
                value={`$C(${t.toFixed(2)}) = (${curvePoint[0].toFixed(2)}, ${curvePoint[1].toFixed(2)})$`}
                variant="accent"
                testId="bezier-basis-curve-point"
              />
              <KdeMessageBar
                variant="info"
                mode="card"
                title="凸包性质 (Convex Hull)"
                className="min-w-0"
              >
                非负权重和恒等于 1，故曲线点始终位于控制多边形的凸包之内。
              </KdeMessageBar>
            </div>
          }
        ></KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
