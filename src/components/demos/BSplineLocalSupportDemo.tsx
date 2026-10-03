import { useEffect, useMemo, useRef, useState } from "react";
import {
  BSPLINE_BOUNDS,
  BSPLINE_POINTS,
  createRepeatedInteriorKnotVector,
  createUniformKnotVector,
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
  drawSegment,
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
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BSplineLocalSupportDemo.css";
import "./BezierSplineWorkspace.css";

type Direction = "span" | "basis";
type DegreeTab = "1" | "2" | "3";
type KnotPreset = "clamped" | "repeated";

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
    description: "端点重复 p + 1 次",
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

  const knots = useMemo(
    () =>
      knotPreset === "repeated"
        ? createRepeatedInteriorKnotVector(points.length, degree, 2)
        : createUniformKnotVector(points.length, degree),
    [degree, knotPreset, points.length],
  );
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
  const activeBasis = currentSpan
    ? getBasisIndicesForSpan(currentSpan.index, degree, knots)
    : [];
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
        drawPolyline(
          ctx,
          plot,
          sampleBSpline(pointsRef.current, degree, knots),
          {
            color: theme.accent,
            width: 2.8,
          },
        );
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.muted,
          width: 1.3,
          dash: [5, 5],
        });

        if (currentSpan) {
          drawSegment(
            ctx,
            plot,
            currentSpan.start - 3,
            BSPLINE_BOUNDS.yMin,
            currentSpan.start - 3,
            BSPLINE_BOUNDS.yMax,
            { color: theme.border, width: 1, dash: [2, 4] },
          );
        }

        pointsRef.current.forEach(([x, y], index) => {
          const highlighted =
            direction === "span"
              ? activeBasis.includes(index)
              : selectedBasisSpanIndices.length > 0 && index === selectedBasis;
          drawPoint(ctx, plot, x, y, {
            color: highlighted ? theme.accent : theme.muted,
            filled: highlighted,
            radius: highlighted ? 7 : 5,
            width: highlighted ? 2.3 : 1.4,
          });
          ctx.fillStyle = highlighted ? theme.accent : theme.muted;
          ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(
            `P${index}`,
            plot.toScreenX(x) + 7,
            plot.toScreenY(y) - 7,
          );
        });

        const currentPoint = evaluateBSpline(
          pointsRef.current,
          degree,
          u,
          knots,
        );
        drawPoint(ctx, plot, currentPoint[0], currentPoint[1], {
          color: theme.ink,
          filled: true,
          radius: 5,
        });
        ctx.fillStyle = theme.ink;
        ctx.fillText(
          "C(u)",
          plot.toScreenX(currentPoint[0]) + 8,
          plot.toScreenY(currentPoint[1]) - 8,
        );

        const axisY = plot.toScreenY(BSPLINE_BOUNDS.yMin + 0.35);
        const domainWidth = maxU - minU || 1;
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(BSPLINE_BOUNDS.xMin + 0.5), axisY);
        ctx.lineTo(plot.toScreenX(BSPLINE_BOUNDS.xMax - 0.5), axisY);
        ctx.stroke();
        spans.forEach((span) => {
          const sx =
            BSPLINE_BOUNDS.xMin +
            0.5 +
            ((span.start - minU) / domainWidth) *
              (BSPLINE_BOUNDS.xMax - BSPLINE_BOUNDS.xMin - 1);
          const ex =
            BSPLINE_BOUNDS.xMin +
            0.5 +
            ((span.end - minU) / domainWidth) *
              (BSPLINE_BOUNDS.xMax - BSPLINE_BOUNDS.xMin - 1);
          const selected =
            direction === "span"
              ? span.index === currentSpan?.index
              : selectedBasisSpanIndices.includes(span.index);
          ctx.strokeStyle = selected ? theme.accent : theme.muted;
          ctx.lineWidth = selected ? 3 : 1.2;
          ctx.beginPath();
          ctx.moveTo(plot.toScreenX(sx), axisY);
          ctx.lineTo(plot.toScreenX(ex), axisY);
          ctx.stroke();
          ctx.fillStyle = theme.muted;
          ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.fillText(`s${span.index}`, plot.toScreenX(sx), axisY + 14);
        });
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
    ],
  );

  const setSpanAndMove = (spanIndex: number) => {
    const span = spans.find((item) => item.index === spanIndex);
    setSelectedSpan(spanIndex);
    if (span) setU((span.start + span.end) / 2);
  };

  const reset = () => {
    setPoints(BSPLINE_POINTS.map(([x, y]) => [x, y]));
    setDegree(3);
    setKnotPreset("clamped");
    setU(1.2);
    resetBounds();
  };

  const spanOptions = spans.map((span) => ({
    id: String(span.index),
    label: `s${span.index} ${formatInterval(span.start, span.end)}`,
    description: `${span.basisIndices.length} 个 basis 参与`,
  }));
  const basisOptions = points.map((_, index) => ({
    id: String(index),
    label: `N${index},${degree}`,
    description: `覆盖 ${getSupportSpansForBasis(index, degree, knots).length} 个非空 span`,
  }));

  return (
    <AutoMath>
      <ExpandableDemo id="bspline-local-support">
        <KdeWindowShell
          title="B-Spline · knot span 与 basis 局部支撑"
          eyebrow="BREEZE WORKSPACE · LOCAL SUPPORT INSPECTOR"
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
                每个 span 只激活 p + 1 个 basis；每个 basis 只覆盖有限 span
              </span>
            </div>
          }
          display={
            <div
              ref={containerRef}
              data-testid="bspline-local-support-canvas"
              className="bspline-demo__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
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
              {direction === "span" ? (
                <KdeCard title="选择 knot span" testId="bspline-span-to-basis">
                  <PresetSelector
                    label="当前 span"
                    options={spanOptions}
                    value={String(selectedSpan ?? spans[0]?.index ?? "")}
                    onChange={(value) => setSpanAndMove(Number(value))}
                    size="xs"
                    layout="grid"
                    columns={2}
                  />
                  <div className="mt-3">
                    <ParamSlider
                      label="$u$"
                      min={minU}
                      max={maxU}
                      step={0.01}
                      value={Math.max(minU, Math.min(maxU, u))}
                      onChange={setU}
                      widthClass="w-full"
                      labelMode="adaptive"
                      display={u.toFixed(2)}
                    />
                  </div>
                </KdeCard>
              ) : (
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
                  className="bspline-demo__formula"
                  data-testid="bspline-knot-vector"
                >
                  {`$U = (${knots.map((value) => value.toFixed(0)).join(", ")})$`}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bspline-demo__readouts">
              {direction === "span" ? (
                <>
                  <KdeReadout
                    label={`当前 span s${currentSpan?.index ?? "—"}`}
                    value={
                      currentSpan
                        ? formatInterval(currentSpan.start, currentSpan.end)
                        : "—"
                    }
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
                  <KdeMessageBar variant="info" mode="card" title="局部支撑">
                    在支撑区间外，当前 basis 恒为零；改变对应控制点只会影响这些
                    span。
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
