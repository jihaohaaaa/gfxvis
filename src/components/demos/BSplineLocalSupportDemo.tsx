import { useEffect, useMemo, useRef, useState } from "react";
import {
  BSPLINE_BOUNDS,
  BSPLINE_POINTS,
  createClampedKnotVector,
  createRepeatedInteriorKnotVector,
  createStandardUniformKnotVector,
  bsplineBasis,
  evaluateBSpline,
  getBasisSupportInfo,
  getNonEmptyKnotSpans,
  getBasisIndicesForSpan,
  getSupportSpansForBasis,
  findKnotSpan,
  sampleBSpline,
  sumBasisAt,
  type Point2,
  type SplineDegree,
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
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BSplineLocalSupportDemo.css";
import "./BezierSplineWorkspace.css";

type Direction = "span" | "basis";
type DegreeTab = "1" | "2" | "3";
type KnotPreset = "clamped" | "uniform" | "repeated";

const DIRECTION_OPTIONS: readonly KdeTabOption<Direction>[] = [
  { id: "span", label: "Span → Basis" },
  { id: "basis", label: "Basis → Span" },
];

const DEGREE_OPTIONS: readonly KdeTabOption<DegreeTab>[] = [
  { id: "1", label: "一次" },
  { id: "2", label: "二次" },
  { id: "3", label: "三次" },
];

const KNOT_OPTIONS = [
  {
    id: "clamped" as KnotPreset,
    label: "端点夹持",
    description: "端点重复 p + 1 次（插值首末点）",
  },
  {
    id: "uniform" as KnotPreset,
    label: "纯均匀",
    description: "无端点重复，等距节点 u_i = i",
  },
  {
    id: "repeated" as KnotPreset,
    label: "内部重复",
    description: "中部 knot 重复，降低局部连续性",
  },
];

function formatInterval(start: number, end: number): string {
  return `[${start.toFixed(2)}, ${end.toFixed(2)})`;
}

/** Compute 2D Convex Hull using Monotone Chain algorithm */
function computeConvexHull2D(points: Point2[]): Point2[] {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (o: Point2, a: Point2, b: Point2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Point2[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-9
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-9
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export default function BSplineLocalSupportDemo() {
  const [direction, setDirection] = useState<Direction>("span");
  const [degree, setDegree] = useState<SplineDegree>(3);
  const [knotPreset, setKnotPreset] = useState<KnotPreset>("clamped");
  const [selectedSpan, setSelectedSpan] = useState<number | null>(null);
  const [selectedBasis, setSelectedBasis] = useState(2);
  const [u, setU] = useState(1.2);
  const [points, setPoints] = useState<Point2[]>(() =>
    BSPLINE_POINTS.map(([x, y]) => [x, y]),
  );
  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;

  const knots = useMemo(() => {
    if (knotPreset === "repeated") {
      return createRepeatedInteriorKnotVector(points.length, degree, 2);
    }
    if (knotPreset === "uniform") {
      return createStandardUniformKnotVector(points.length, degree);
    }
    return createClampedKnotVector(points.length, degree);
  }, [degree, knotPreset, points.length]);

  const spans = useMemo(
    () => getNonEmptyKnotSpans(degree, knots),
    [degree, knots],
  );
  const firstSpan = spans[0];
  const lastSpan = spans.at(-1);
  const minU = firstSpan?.start ?? 0;
  const maxU = lastSpan?.end ?? 1;

  const currentSpanIndex = findKnotSpan(u, degree, knots);
  const currentSpan =
    spans.find((span) => span.index === currentSpanIndex) ?? firstSpan;

  const activeBasis = useMemo(
    () =>
      currentSpan
        ? getBasisIndicesForSpan(currentSpan.index, degree, knots)
        : [],
    [currentSpan, degree, knots],
  );

  const selectedBasisInfo = getBasisSupportInfo(selectedBasis, degree, knots);
  const selectedBasisSpanIndices = getSupportSpansForBasis(
    selectedBasis,
    degree,
    knots,
  );

  const activeBasisWeights = activeBasis.map((index) => ({
    index,
    value: getBasisValue(index, degree, u, knots),
  }));
  const basisSum = sumBasisAt(u, degree, knots);

  // Active control points and convex hull for the current span
  const activePoints = useMemo(
    () =>
      activeBasis
        .map((idx) => points[idx])
        .filter((pt): pt is Point2 => Boolean(pt)),
    [activeBasis, points],
  );
  const activeHull = useMemo(
    () => computeConvexHull2D(activePoints),
    [activePoints],
  );

  useEffect(() => {
    const validSpan =
      spans.find((span) => span.index === selectedSpan) ?? spans[0];
    setSelectedSpan(validSpan?.index ?? null);
    setSelectedBasis((value) =>
      Math.max(0, Math.min(points.length - 1, value)),
    );
    const nextU = Math.max(
      minU,
      Math.min(maxU, validSpan ? (validSpan.start + validSpan.end) / 2 : minU),
    );
    setU((value) =>
      Number.isFinite(value) && value >= minU && value <= maxU ? value : nextU,
    );
  }, [degree, knotPreset, minU, maxU, points.length, spans, selectedSpan]);

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: BSPLINE_BOUNDS,
      margin: 36,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        // 1. Control polygon (scaffolding)
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.border,
          width: 1.3,
          dash: [5, 5],
        });

        // 2. Active Local Convex Hull (semi-transparent filled polygon + dashed boundary)
        if (activeHull.length >= 2) {
          ctx.save();
          ctx.beginPath();
          const firstX = plot.toScreenX(activeHull[0][0]);
          const firstY = plot.toScreenY(activeHull[0][1]);
          ctx.moveTo(firstX, firstY);
          for (let i = 1; i < activeHull.length; i++) {
            ctx.lineTo(
              plot.toScreenX(activeHull[i][0]),
              plot.toScreenY(activeHull[i][1]),
            );
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(61, 174, 233, 0.12)";
          ctx.fill();
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.restore();
        }

        // 3. Whole B-Spline curve (subtler base curve)
        const fullCurve = sampleBSpline(pointsRef.current, degree, knots);
        drawPolyline(ctx, plot, fullCurve, {
          color: "rgba(61, 174, 233, 0.40)",
          width: 2.0,
        });

        // 4. Highlighted active Span local curve segment (bold accent)
        if (currentSpan) {
          const localCurve: Point2[] = [];
          const steps = 36;
          const dt = (currentSpan.end - currentSpan.start) / steps;
          for (let s = 0; s <= steps; s++) {
            const curU = currentSpan.start + s * dt;
            localCurve.push(
              evaluateBSpline(pointsRef.current, degree, curU, knots),
            );
          }
          if (localCurve.length > 1) {
            drawPolyline(ctx, plot, localCurve, {
              color: theme.accent,
              width: 3.5,
            });
          }
        }

        // 5. Control points
        pointsRef.current.forEach(([x, y], index) => {
          const isActive = activeBasis.includes(index);
          const isSelectedBasis =
            direction === "basis" && index === selectedBasis;
          const highlighted = isActive || isSelectedBasis;

          drawPoint(ctx, plot, x, y, {
            color: highlighted ? theme.accent : theme.muted,
            filled: highlighted,
            radius: highlighted ? 6.5 : 4.5,
            width: highlighted ? 2.0 : 1.2,
          });

          ctx.fillStyle = highlighted ? theme.accent : theme.muted;
          ctx.font = highlighted
            ? "bold 11px ui-monospace, monospace"
            : "10px ui-monospace, monospace";
          ctx.fillText(
            `P${index}`,
            plot.toScreenX(x) + 7,
            plot.toScreenY(y) - 7,
          );
        });

        // 6. Current evaluated point C(u)
        const currentPoint = evaluateBSpline(
          pointsRef.current,
          degree,
          u,
          knots,
        );
        drawPoint(ctx, plot, currentPoint[0], currentPoint[1], {
          color: "#e74c3c",
          filled: true,
          radius: 6,
          width: 2,
        });
        ctx.fillStyle = theme.ink;
        ctx.font = "bold 11px ui-monospace, monospace";
        ctx.fillText(
          `C(u=${u.toFixed(2)})`,
          plot.toScreenX(currentPoint[0]) + 8,
          plot.toScreenY(currentPoint[1]) - 8,
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
    [
      degree,
      direction,
      knots,
      points,
      u,
      currentSpan?.index,
      selectedBasis,
      selectedBasisSpanIndices.join(","),
      activeBasis.join(","),
      activeHull,
    ],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const domain = maxU - minU || 1;

  const handleTrackPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const newU = minU + fraction * domain;
    setU(newU);
    const matched = spans.find((s) => newU >= s.start && newU < s.end);
    if (matched) {
      setSelectedSpan(matched.index);
    } else if (newU >= maxU && lastSpan) {
      setSelectedSpan(lastSpan.index);
    } else if (newU <= minU && firstSpan) {
      setSelectedSpan(firstSpan.index);
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    handleTrackPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    handleTrackPointer(e.clientX);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const reset = () => {
    setPoints(BSPLINE_POINTS.map(([x, y]) => [x, y]));
    setDegree(3);
    setKnotPreset("clamped");
    setU(1.2);
    resetBounds();
  };

  const basisOptions = points.map((_, index) => ({
    id: String(index),
    label: `N${index},${degree}`,
    description: `覆盖 ${getSupportSpansForBasis(index, degree, knots).length} 个非空 span`,
  }));

  const activePointsLabel =
    activeBasis.length > 0
      ? `$\\operatorname{Conv}(\\{${activeBasis.map((i) => `\\mathbf{P}_${i}`).join(", ")}\\})$`
      : "—";

  return (
    <AutoMath>
      <ExpandableDemo id="bspline-local-support">
        <KdeWindowShell
          channel="EXP 10"
          title="B-Spline · knot span 与 basis 局部支撑与局部凸包"
          eyebrow="BREEZE WORKSPACE · LOCAL SUPPORT & CONVEX HULL INSPECTOR"
          mark="N"
          modeTag="B-SPLINE"
          testId="bspline-local-support-demo"
          className="bezier-spline-workspace"
          tabs={
            <div className="bspline-demo__topbar">
              <KdeTabs
                label="双向检查"
                options={DIRECTION_OPTIONS}
                value={direction}
                onChange={(value) => setDirection(value)}
                variant="pill"
                size="sm"
                testId="bspline-direction-tabs"
              />
              <span className="bspline-demo__topnote">
                每个 span 活跃 $p + 1$ 个 basis 并包络于对应局部凸包；每个 basis
                仅支撑有限 span
              </span>
            </div>
          }
          display={
            <div className="flex flex-col h-full w-full min-h-0">
              <div
                ref={containerRef}
                data-testid="bspline-local-support-canvas"
                className="bspline-demo__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-[var(--demo-height,20rem)] w-full overflow-hidden"
              >
                <CanvasToolbar onReset={reset} />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full"
                />
                <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
              </div>

              {/* 1D Knot Span Interval Bar */}
              <div
                data-testid="bspline-span-strip"
                className="mt-2.5 rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel,#ffffff)] p-2.5 shadow-2xs select-none"
              >
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-[var(--kde-ink)]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--kde-accent)]" />
                    <span>节点区间分段与参数寻迹</span>
                    <span className="text-[10px] text-[var(--kde-muted)] font-mono hidden sm:inline">
                      (Knot Spans & Probe u)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    {direction === "span" ? (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--kde-accent)]/15 text-[var(--kde-accent)] font-semibold">
                        当前: s{currentSpan?.index ?? "—"} [
                        {currentSpan?.start.toFixed(1)},{" "}
                        {currentSpan?.end.toFixed(1)})
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--kde-accent)]/15 text-[var(--kde-accent)] font-semibold">
                        支撑跨度:{" "}
                        {selectedBasisSpanIndices
                          .map((i) => `s${i}`)
                          .join(", ") || "无"}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-[#e74c3c]/15 text-[#e74c3c] font-bold">
                      u = {u.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 1D Segmented Track with floating needle */}
                <div className="relative w-full pt-4.5 pb-0.5">
                  <div
                    ref={trackRef}
                    onPointerDown={handleTrackPointerDown}
                    onPointerMove={handleTrackPointerMove}
                    onPointerUp={handleTrackPointerUp}
                    onPointerCancel={handleTrackPointerUp}
                    className="relative w-full h-10 bg-[var(--kde-surface-control,#f1f5f9)] dark:bg-[var(--kde-surface-control,#1a202c)] rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] overflow-hidden flex cursor-ew-resize touch-none shadow-inner"
                  >
                    {spans.map((span) => {
                      const widthPct = ((span.end - span.start) / domain) * 100;
                      const isSpanSelected =
                        direction === "span"
                          ? span.index === currentSpan?.index
                          : selectedBasisSpanIndices.includes(span.index);

                      return (
                        <div
                          key={span.index}
                          style={{ width: `${widthPct}%` }}
                          className={`relative h-full flex flex-col items-center justify-center border-r last:border-r-0 border-[var(--kde-border)]/50 transition-colors ${
                            isSpanSelected
                              ? "bg-[var(--kde-accent)]/25 text-[var(--kde-accent)] font-bold ring-1 ring-inset ring-[var(--kde-accent)]/70"
                              : "hover:bg-[var(--kde-surface-hover,#e2e8f0)] dark:hover:bg-[var(--kde-surface-hover,#2d3748)] text-[var(--kde-muted)]"
                          }`}
                          title={`Span s${span.index}: [${span.start.toFixed(2)}, ${span.end.toFixed(2)})`}
                        >
                          <span className="text-[11px] font-mono font-medium leading-none">
                            s{span.index}
                          </span>
                          <span className="text-[9px] font-mono opacity-70 mt-1 leading-none">
                            [{span.start.toFixed(1)}, {span.end.toFixed(1)})
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Probe Needle (Floating above track, outside overflow-hidden, 100% visible) */}
                  <div
                    style={{
                      left: `${Math.max(0, Math.min(100, ((u - minU) / domain) * 100))}%`,
                    }}
                    className="absolute top-0 bottom-0.5 w-[2px] -ml-[1px] bg-[#e74c3c] pointer-events-none z-20 shadow-sm"
                  >
                    <div className="absolute top-0 -translate-x-1/2 bg-[#e74c3c] text-white text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm leading-none whitespace-nowrap">
                      {u.toFixed(2)}
                    </div>
                    <div className="absolute bottom-0 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-[#e74c3c]" />
                  </div>
                </div>

                {/* Knot boundaries labels */}
                <div className="relative w-full h-3.5 mt-1 text-[9px] font-mono text-[var(--kde-muted)] select-none">
                  {spans.map((span) => {
                    const leftPct = ((span.start - minU) / domain) * 100;
                    return (
                      <span
                        key={`knot-start-${span.index}`}
                        style={{ left: `${leftPct}%` }}
                        className="absolute -translate-x-1/2"
                      >
                        {span.start.toFixed(1)}
                      </span>
                    );
                  })}
                  <span
                    style={{ left: "100%" }}
                    className="absolute -translate-x-1/2"
                  >
                    {maxU.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          }
          controls={
            <div className="bspline-demo__stack">
              <KdeCard title="次数与 knot">
                <div className="space-y-3">
                  <KdeTabs
                    label="degree"
                    options={DEGREE_OPTIONS}
                    value={String(degree) as DegreeTab}
                    onChange={(value) =>
                      setDegree(Number(value) as SplineDegree)
                    }
                    variant="subtle"
                    size="xs"
                  />
                  <PresetSelector
                    label="knot 预设"
                    options={KNOT_OPTIONS}
                    value={knotPreset}
                    onChange={setKnotPreset}
                    size="xs"
                    layout="vertical"
                  />
                </div>
              </KdeCard>
              {direction === "basis" && (
                <KdeCard title="选择 basis" testId="bspline-basis-to-span">
                  <PresetSelector
                    label="当前 basis"
                    options={basisOptions}
                    value={String(selectedBasis)}
                    onChange={(value) => setSelectedBasis(Number(value))}
                    size="xs"
                    layout="grid"
                    columns={2}
                  />
                </KdeCard>
              )}
              <KdeCard title="knot vector" variant="inset">
                <div
                  className="bspline-demo__knot-chips flex flex-wrap gap-1 items-center"
                  data-testid="bspline-knot-vector"
                >
                  <span className="text-xs font-mono font-bold text-[var(--kde-ink)] mr-0.5 select-none">
                    {"U ="}
                  </span>
                  {knots.map((val, idx) => {
                    const isClamped =
                      idx < degree + 1 || idx >= knots.length - 1 - degree;
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded text-[10.5px] font-mono border ${
                          isClamped
                            ? "bg-[var(--kde-surface-control,#f1f5f9)] dark:bg-[var(--kde-surface-control,#1e242c)] border-[var(--kde-border)] text-[var(--kde-muted)]"
                            : "bg-[var(--kde-accent)]/15 border-[var(--kde-accent)]/40 text-[var(--kde-accent)] font-bold"
                        }`}
                        title={`u_${idx} = ${val}`}
                      >
                        {val.toFixed(0)}
                      </span>
                    );
                  })}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bspline-demo__readouts">
              {direction === "span" ? (
                <>
                  <KdeReadout
                    label="活跃局部凸包"
                    value={activePointsLabel}
                    variant="accent"
                  />
                  <KdeReadout
                    label="活跃 basis"
                    value={
                      activeBasis
                        .map((index) => `N_{${index},${degree}}`)
                        .join(", ") || "—"
                    }
                    testId="bspline-active-basis"
                  />
                  <KdeReadout
                    label="partition of unity"
                    value={`$\\sum_i N_{i,${degree}}(${u.toFixed(2)}) = ${basisSum.toFixed(3)}$`}
                    variant={
                      Math.abs(basisSum - 1) < 1e-6 ? "success" : "warning"
                    }
                    testId="bspline-partition-sum"
                  />
                  <div
                    className="bspline-demo__weight-card"
                    data-testid="bspline-active-weights"
                  >
                    {activeBasisWeights.map(({ index, value }) => (
                      <span
                        key={index}
                      >{`N${index} = ${value.toFixed(3)}`}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <KdeReadout
                    label={`当前 basis N${selectedBasis},${degree}`}
                    value={formatInterval(
                      selectedBasisInfo.start,
                      selectedBasisInfo.end,
                    )}
                    variant="accent"
                  />
                  <KdeReadout
                    label="覆盖的非空 span"
                    value={
                      selectedBasisSpanIndices
                        .map((index) => `s${index}`)
                        .join(", ") || "—"
                    }
                    testId="bspline-support-spans"
                  />
                  <KdeReadout
                    label="当前探针局部凸包"
                    value={activePointsLabel}
                    variant="accent"
                  />
                  <KdeMessageBar
                    variant="info"
                    mode="card"
                    title="局部支撑与局部凸包"
                  >
                    在支撑区间外，当前 basis 恒为零；当前参数 $u$ 处的曲线点
                    $\mathbf C(u)$ 严格位于当前 Span 的局部凸包内。
                  </KdeMessageBar>
                </>
              )}
            </div>
          }
        ></KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}

function getBasisValue(
  index: number,
  degree: number,
  u: number,
  knots: readonly number[],
): number {
  return bsplineBasis(index, degree, u, knots);
}
