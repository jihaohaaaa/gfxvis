import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Points,
  PointsMaterial,
  Vector3,
  type Scene,
} from "three";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeGroupBox from "../framework/KdeGroupBox";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import KdeWindowShell from "../framework/KdeWindowShell";
import KdeCard from "../framework/KdeCard";
import KdeReadout from "../framework/KdeReadout";
import KdeBadge from "../framework/KdeBadge";
import KdeMessageBar from "../framework/KdeMessageBar";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useViewer3D } from "../framework/useViewer3D";
import { clamp } from "@math";
import {
  computeNiceTicks,
  drawAxes,
  drawPoint,
  drawSegment,
  drawPolyline,
  readThemeColors,
  watchTheme,
  type Plot2D,
  type ThemeColors,
} from "../../visualizations/core/2d/plot2d";
import type { Canvas2DOptions } from "../../visualizations/core/2d/canvas2d";
import { createAxesGroup } from "../../visualizations/core/3d/axes3d";
import { mathToWorld } from "../../visualizations/core/3d/coords";
import {
  createMarker,
  createStandardScene3D,
  createSurfaceMaterial,
  disposeObject,
} from "../../visualizations/core/3d/three-utils";

type Point2 = { x: number; y: number };
type Point3 = Point2 & { z: number };
type ScenarioId = "r2-three" | "r3-four" | "r2-four";
type FourPointPreset = "quadrilateral" | "interior" | "custom";

const SAMPLE_SUBDIVISIONS = 10;
const WORLD_BOUNDS = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const GEOMETRY_EPSILON = 1e-8;
const DEFAULT_R2_TRIANGLE: Point2[] = [
  { x: -1.4, y: -1.1 },
  { x: 1.4, y: -1.1 },
  { x: 0, y: 1.5 },
];
const FOUR_POINT_PRESETS: PresetOption<FourPointPreset>[] = [
  { id: "quadrilateral", label: "四个凸包顶点" },
  { id: "interior", label: "一个内部冗余点" },
  { id: "custom", label: "自由拖动" },
];
const SCENARIO_OPTIONS: readonly KdeTabOption<ScenarioId>[] = [
  { id: "r2-three", label: "R² 三点：仿射无关", badge: "3-PTS" },
  { id: "r3-four", label: "R³ 四点：四面体退化", badge: "3D" },
  { id: "r2-four", label: "R² 四点：凸包冗余", badge: "4-PTS" },
];

const FOUR_POINT_CONFIGS: Record<
  Exclude<FourPointPreset, "custom">,
  Point2[]
> = {
  quadrilateral: [
    { x: -1.5, y: -1.2 },
    { x: 1.5, y: -1.2 },
    { x: 1.5, y: 1.2 },
    { x: -1.5, y: 1.2 },
  ],
  interior: [
    { x: -1.5, y: -1.2 },
    { x: 1.5, y: -1.2 },
    { x: 0, y: 1.5 },
    { x: 0, y: 0 },
  ],
};

function copyPoints(points: readonly Point2[]): Point2[] {
  return points.map((point) => ({ ...point }));
}

function sampleSimplexWeights(vertexCount: number): number[][] {
  const allWeights: number[][] = [];
  const weights: number[] = [];

  const visit = (index: number, remaining: number) => {
    if (index === vertexCount - 1) {
      allWeights.push([...weights, remaining / SAMPLE_SUBDIVISIONS]);
      return;
    }

    for (let part = 0; part <= remaining; part += 1) {
      weights.push(part / SAMPLE_SUBDIVISIONS);
      visit(index + 1, remaining - part);
      weights.pop();
    }
  };

  visit(0, SAMPLE_SUBDIVISIONS);
  return allWeights;
}

function sampleConvexCombinations2D(points: readonly Point2[]): Point2[] {
  return sampleSimplexWeights(points.length).map((weights) =>
    points.reduce(
      (sum, point, index) => ({
        x: sum.x + weights[index] * point.x,
        y: sum.y + weights[index] * point.y,
      }),
      { x: 0, y: 0 },
    ),
  );
}

function sampleConvexCombinations3D(points: readonly Point3[]): Point3[] {
  return sampleSimplexWeights(points.length).map((weights) =>
    points.reduce(
      (sum, point, index) => ({
        x: sum.x + weights[index] * point.x,
        y: sum.y + weights[index] * point.y,
        z: sum.z + weights[index] * point.z,
      }),
      { x: 0, y: 0, z: 0 },
    ),
  );
}

function cross2D(a: Point2, b: Point2, c: Point2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function squaredDistance(a: Point2, b: Point2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function affineDimension2D(points: readonly Point2[]): 0 | 1 | 2 {
  if (points.length <= 1) return 0;

  let maxDistanceSquared = 0;
  let farthestPair: [Point2, Point2] | null = null;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distanceSquared = squaredDistance(points[i], points[j]);
      if (distanceSquared > maxDistanceSquared) {
        maxDistanceSquared = distanceSquared;
        farthestPair = [points[i], points[j]];
      }
    }
  }

  if (!farthestPair || maxDistanceSquared <= GEOMETRY_EPSILON ** 2) return 0;
  const areaTolerance = Math.max(0.06, 0.015 * maxDistanceSquared);
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      for (let k = j + 1; k < points.length; k += 1) {
        if (
          Math.abs(cross2D(points[i], points[j], points[k])) > areaTolerance
        ) {
          return 2;
        }
      }
    }
  }
  return 1;
}

function convexHull2D(points: readonly Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const unique: Point2[] = [];
  for (const point of sorted) {
    if (
      !unique.some(
        (other) => squaredDistance(point, other) <= GEOMETRY_EPSILON ** 2,
      )
    ) {
      unique.push(point);
    }
  }
  if (unique.length <= 2) return unique;

  const lower: Point2[] = [];
  for (const point of unique) {
    while (
      lower.length >= 2 &&
      cross2D(lower[lower.length - 2], lower[lower.length - 1], point) <=
        GEOMETRY_EPSILON
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: Point2[] = [];
  for (const point of [...unique].reverse()) {
    while (
      upper.length >= 2 &&
      cross2D(upper[upper.length - 2], upper[upper.length - 1], point) <=
        GEOMETRY_EPSILON
    ) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function pointInConvexHull2D(
  point: Point2,
  points: readonly Point2[],
): boolean {
  const hull = convexHull2D(points);
  if (hull.length === 0) return false;
  if (hull.length === 1) {
    return squaredDistance(point, hull[0]) <= GEOMETRY_EPSILON ** 2;
  }
  if (hull.length === 2) {
    const dx = hull[1].x - hull[0].x;
    const dy = hull[1].y - hull[0].y;
    const lengthSquared = dx * dx + dy * dy;
    const area = dx * (point.y - hull[0].y) - dy * (point.x - hull[0].x);
    const projection = (point.x - hull[0].x) * dx + (point.y - hull[0].y) * dy;
    const tolerance = GEOMETRY_EPSILON * Math.max(1, Math.sqrt(lengthSquared));
    return (
      Math.abs(area) <= tolerance &&
      projection >= -tolerance &&
      projection <= lengthSquared + tolerance
    );
  }

  for (let i = 0; i < hull.length; i += 1) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    if (cross2D(a, b, point) < -GEOMETRY_EPSILON) return false;
  }
  return true;
}

function lineThroughCollinearPoints(
  points: readonly Point2[],
): [Point2, Point2] | null {
  let maxDistanceSquared = 0;
  let pair: [Point2, Point2] | null = null;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distanceSquared = squaredDistance(points[i], points[j]);
      if (distanceSquared > maxDistanceSquared) {
        maxDistanceSquared = distanceSquared;
        pair = [points[i], points[j]];
      }
    }
  }
  if (!pair || maxDistanceSquared <= GEOMETRY_EPSILON ** 2) return null;

  const [a, b] = pair;
  const length = Math.sqrt(maxDistanceSquared);
  const dx = (b.x - a.x) / length;
  const dy = (b.y - a.y) / length;
  const projections = points.map(
    (point) => (point.x - a.x) * dx + (point.y - a.y) * dy,
  );
  const padding = Math.max(
    (Math.max(...projections) - Math.min(...projections)) * 0.45,
    0.5,
  );
  const start = Math.min(...projections) - padding;
  const end = Math.max(...projections) + padding;
  return [
    { x: a.x + dx * start, y: a.y + dy * start },
    { x: a.x + dx * end, y: a.y + dy * end },
  ];
}

function drawHull2D(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  points: readonly Point2[],
  samples: readonly Point2[],
  activeIndex: number | null,
): void {
  const hull = convexHull2D(points);
  if (hull.length >= 3) {
    ctx.save();
    ctx.beginPath();
    hull.forEach((point, index) => {
      const x = plot.toScreenX(point.x);
      const y = plot.toScreenY(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.12;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.42;
  for (const point of samples) {
    ctx.beginPath();
    ctx.arc(
      plot.toScreenX(point.x),
      plot.toScreenY(point.y),
      2.1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();

  if (hull.length >= 3) {
    drawPolyline(
      ctx,
      plot,
      [...hull, hull[0]].map((point) => [point.x, point.y] as [number, number]),
      { color: theme.accent, width: 2.4 },
    );
  } else if (hull.length === 2) {
    drawSegment(ctx, plot, hull[0].x, hull[0].y, hull[1].x, hull[1].y, {
      color: theme.accent,
      width: 2.4,
    });
  }

  if (affineDimension2D(points) === 1) {
    const line = lineThroughCollinearPoints(points);
    if (line) {
      drawSegment(ctx, plot, line[0].x, line[0].y, line[1].x, line[1].y, {
        color: theme.muted,
        width: 1.5,
        dash: [6, 4],
      });
    }
  }

  points.forEach((point, index) => {
    drawPoint(ctx, plot, point.x, point.y, {
      color: theme.ink,
      radius: activeIndex === index ? 8 : 6,
      width: 2,
    });
    ctx.fillStyle = theme.ink;
    ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      `P${index}`,
      plot.toScreenX(point.x) + 9,
      plot.toScreenY(point.y) - 5,
    );
  });
}

function HullCanvas2D({
  points,
  onPointsChange,
  onReset,
  canvasTestId,
}: {
  points: Point2[];
  onPointsChange(points: Point2[]): void;
  onReset(): void;
  canvasTestId: string;
}) {
  const draggingIndex = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const samples = useMemo(() => sampleConvexCombinations2D(points), [points]);
  const dimension = affineDimension2D(points);

  const canvasOptions: Canvas2DOptions = {
    initialBounds: WORLD_BOUNDS,
    draw(ctx, plot, theme) {
      const ticks = computeNiceTicks(-3, 3, 7);
      drawAxes(ctx, plot, theme, ticks, ticks);
      drawHull2D(ctx, plot, theme, points, samples, activeIndex);
    },
    onLeftDown(event, plot) {
      let closestIndex: number | null = null;
      let closestDistance = 18;
      const el =
        (event.currentTarget as HTMLElement | null) ??
        (event.target as HTMLElement | null);
      const rect = el?.getBoundingClientRect();
      const px = rect ? event.clientX - rect.left : event.offsetX;
      const py = rect ? event.clientY - rect.top : event.offsetY;
      points.forEach((point, index) => {
        const distance = Math.hypot(
          plot.toScreenX(point.x) - px,
          plot.toScreenY(point.y) - py,
        );
        if (distance < closestDistance) {
          closestIndex = index;
          closestDistance = distance;
        }
      });
      if (closestIndex === null) return false;
      draggingIndex.current = closestIndex;
      setActiveIndex(closestIndex);
      return true;
    },
    onLeftMove(event, plot) {
      const index = draggingIndex.current;
      if (index === null) return;
      const el =
        (event.currentTarget as HTMLElement | null) ??
        (event.target as HTMLElement | null);
      const rect = el?.getBoundingClientRect();
      const px = rect ? event.clientX - rect.left : event.offsetX;
      const py = rect ? event.clientY - rect.top : event.offsetY;
      const x = clamp(plot.toWorldX(px), -2.75, 2.75);
      const y = clamp(plot.toWorldY(py), -2.75, 2.75);
      onPointsChange(
        points.map((point, pointIndex) =>
          pointIndex === index ? { x, y } : point,
        ),
      );
    },
    onLeftUp() {
      draggingIndex.current = null;
      setActiveIndex(null);
    },
  };

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(canvasOptions, [
    points,
    activeIndex,
  ]);

  const handleReset = () => {
    draggingIndex.current = null;
    setActiveIndex(null);
    onReset();
    resetBounds();
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full min-h-[var(--demo-height,20rem)] w-full overflow-hidden"
      data-affine-dimension={dimension}
    >
      <CanvasToolbar onReset={handleReset} />
      <canvas
        ref={canvasRef}
        aria-label="拖动平面点，观察仿射包与凸包"
        className="absolute inset-0 h-full w-full touch-none"
        data-testid={canvasTestId}
      />
      <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
    </div>
  );
}

function VertexCoordinatesRack({
  points,
  redundantIndices,
  dimension,
  isFourPoint = false,
}: {
  points: readonly Point2[];
  redundantIndices?: readonly number[];
  dimension?: number;
  isFourPoint?: boolean;
}) {
  return (
    <KdeCard
      title="顶点坐标与拖拽目标"
      badge={
        dimension !== undefined ? (
          <KdeBadge variant={dimension === 2 ? "primary" : "warning"}>
            dim = {dimension}
          </KdeBadge>
        ) : undefined
      }
    >
      <div className="grid gap-1.5">
        {points.map((point, index) => {
          const isRedundant = redundantIndices?.includes(index) ?? false;
          return (
            <div
              key={index}
              data-console-readout
              className={`flex items-center justify-between gap-2 rounded-[var(--kde-control-radius,0.35rem)] border px-2.5 py-1.5 transition-colors ${
                isRedundant
                  ? "border-amber-400/80 bg-amber-500/10 text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-[var(--kde-border)] bg-[var(--kde-panel)] text-[var(--kde-ink)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shadow-xs ${
                    isRedundant
                      ? "bg-amber-500 text-white dark:bg-amber-600"
                      : "bg-[var(--kde-accent)] text-[var(--kde-accent-ink)]"
                  }`}
                >
                  P{index}
                </span>
                {isFourPoint && (
                  <KdeBadge variant={isRedundant ? "warning" : "success"}>
                    {isRedundant ? "内部冗余" : "极点"}
                  </KdeBadge>
                )}
              </div>

              <output className="font-mono rounded border border-[var(--kde-border)] bg-[var(--kde-raised)] px-2 py-0.5 text-xs text-[var(--kde-ink)] shadow-2xs">
                ({point.x.toFixed(2)}, {point.y.toFixed(2)})
              </output>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5">
        {!isFourPoint ? (
          <KdeMessageBar
            variant={dimension === 2 ? "success" : "warning"}
            mode="card"
            title={dimension === 2 ? "仿射无关 (2D 面)" : "共线退化 (1D 线)"}
          >
            {dimension === 2
              ? "3 点仿射无关，生成非退化实心三角形凸包。"
              : "3 点共线退化，凸包与仿射包退化为线段与直线。"}
          </KdeMessageBar>
        ) : (
          <KdeMessageBar
            variant={
              (redundantIndices?.length ?? 0) === 0 ? "success" : "warning"
            }
            mode="card"
            title={`凸包极点统计：${4 - (redundantIndices?.length ?? 0)} / 4 极点`}
          >
            {(redundantIndices?.length ?? 0) === 0
              ? "所有 4 个顶点均为凸包极点，无内部冗余。"
              : `点 P${redundantIndices!.join(", P")} 属于内部冗余点（可由其余点凸组合表示）。`}
          </KdeMessageBar>
        )}
      </div>
    </KdeCard>
  );
}

function VertexCoordinatesRack3D({
  points,
  affineDimension,
}: {
  points: readonly Point3[];
  affineDimension: number;
}) {
  return (
    <KdeCard
      title="空间四点坐标 (3D Coordinates)"
      badge={
        <KdeBadge variant={affineDimension === 3 ? "primary" : "warning"}>
          dim = {affineDimension}
        </KdeBadge>
      }
    >
      <div className="grid gap-1.5">
        {points.map((point, index) => {
          const isElevated = index === 3;
          return (
            <div
              key={index}
              data-console-readout
              className={`flex items-center justify-between gap-2 rounded-[var(--kde-control-radius,0.35rem)] border px-2.5 py-1.5 transition-colors ${
                isElevated
                  ? "border-[var(--kde-accent)]/60 bg-[var(--kde-accent)]/10 text-[var(--kde-ink)]"
                  : "border-[var(--kde-border)] bg-[var(--kde-panel)] text-[var(--kde-ink)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shadow-xs ${
                    isElevated
                      ? "bg-[var(--kde-accent)] text-[var(--kde-accent-ink)]"
                      : "border border-[var(--kde-border)] bg-[var(--kde-panel)] text-[var(--kde-ink)]"
                  }`}
                >
                  P{index}
                </span>
                <span className="text-xs text-[var(--kde-muted)]">
                  {isElevated ? "顶点 (动态高度)" : "底面基底点"}
                </span>
              </div>

              <output className="font-mono rounded border border-[var(--kde-border)] bg-[var(--kde-raised)] px-2 py-0.5 text-xs text-[var(--kde-ink)] shadow-2xs">
                ({point.x.toFixed(2)}, {point.y.toFixed(2)},{" "}
                {point.z.toFixed(2)})
              </output>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5">
        <KdeMessageBar
          variant={affineDimension === 3 ? "success" : "warning"}
          mode="card"
          title={
            affineDimension === 3
              ? "空间非退化 (3D Simplex)"
              : "共面退化极限 (2D Face)"
          }
        >
          {affineDimension === 3
            ? "四点张成空间 3 维单纯形，有向体积 V > 0。"
            : "第四点落在底面仿射平面，体积归零退化为二维三角形。"}
        </KdeMessageBar>
      </div>
    </KdeCard>
  );
}

function R2ThreePointExperiment({
  scenarioSelector,
}: {
  scenarioSelector: ReactNode;
}) {
  const initialPoints = useMemo(() => copyPoints(DEFAULT_R2_TRIANGLE), []);
  const [points, setPoints] = useState<Point2[]>(initialPoints);
  const samples = useMemo(() => sampleConvexCombinations2D(points), [points]);
  const dimension = affineDimension2D(points);

  const reset = () => setPoints(copyPoints(initialPoints));
  const readouts = (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        data-testid="affine-readouts"
      >
        <MetricCard
          label="仿射维数 $\dim \operatorname{aff}(S)$"
          testId="r2-three-affine-dimension"
          value={String(dimension)}
        />
        <MetricCard
          label="相关性判定"
          testId="r2-three-status"
          value={dimension === 2 ? "仿射无关" : "仿射相关"}
        />
        <MetricCard
          label="重心格采样 $N = \binom{10+2}{2}$"
          testId="r2-three-sample-count"
          value={String(samples.length)}
        />
      </div>
      <FormulaCard
        title="仿射包、凸包与共线退化公理判定"
        definitions={
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span>
                仿射包：
                {
                  "$\\operatorname{aff}(S) = \\left\\{ \\sum_{i=0}^2 \\lambda_i P_i \\;\\middle|\\; \\sum \\lambda_i = 1 \\right\\}$"
                }
              </span>
              <span>
                凸包：
                {
                  "$\\operatorname{conv}(S) = \\left\\{ \\sum_{i=0}^2 \\lambda_i P_i \\;\\middle|\\; \\sum \\lambda_i = 1, \\; \\lambda_i \\ge 0 \\right\\}$"
                }
              </span>
            </div>
            <div>
              仿射维数判据：
              {
                "$\\dim \\operatorname{aff}(S) = \\operatorname{rank}\\begin{pmatrix} P_1 - P_0 & P_2 - P_0 \\end{pmatrix}$"
              }
            </div>
          </>
        }
        statusType={dimension === 2 ? "success" : "warning"}
        status={
          dimension === 2 ? (
            <>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ✅ 仿射无关：
              </span>
              <span>
                {
                  "$\\dim \\operatorname{aff}(S) = 2$。向量组线性无关，$\\operatorname{aff}(S) = \\mathbb{R}^2$（整个平面），$\\operatorname{conv}(S)$ 为非退化实心三角形。"
                }
              </span>
            </>
          ) : (
            <>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                ⚠️ 共线退化（仿射相关）：
              </span>
              <span>
                {
                  "$\\dim \\operatorname{aff}(S) = 1$。向量组线性相关，$\\operatorname{aff}(S)$ 退化为一直线，$\\operatorname{conv}(S)$ 退化为直线段。"
                }
              </span>
            </>
          )
        }
      />
    </div>
  );
  const controls = (
    <div className="space-y-4" data-testid="r2-three-experiment">
      <KdeGroupBox
        title="VERTEX CONFIGURATION"
        subtitle="拖动三个顶点。非共线时它们仿射无关，仿射包是整个平面；拖到共线时，凸包和仿射包都退化为直线段与整条直线。"
      >
        <VertexCoordinatesRack
          points={points}
          dimension={dimension}
          isFourPoint={false}
        />
      </KdeGroupBox>
    </div>
  );
  const canvas = (
    <HullCanvas2D
      canvasTestId="r2-three-canvas"
      points={points}
      onPointsChange={setPoints}
      onReset={reset}
    />
  );

  return (
    <KdeWindowShell
      channel="CH 02"
      title="仿射包与凸包实验 · R² 三点无关性测试"
      eyebrow="BREEZE WORKSPACE · AFFINE HULL"
      mark="B"
      modeTag="R² 3-PTS"
      testId="affine-hull-convex-redundancy-demo"
      tabs={scenarioSelector}
      display={canvas}
      controls={controls}
      footer={readouts}
    />
  );
}

function R2FourPointExperiment({
  scenarioSelector,
}: {
  scenarioSelector: ReactNode;
}) {
  const [preset, setPreset] = useState<FourPointPreset>("quadrilateral");
  const [points, setPoints] = useState<Point2[]>(() =>
    copyPoints(FOUR_POINT_CONFIGS.quadrilateral),
  );
  const samples = useMemo(() => sampleConvexCombinations2D(points), [points]);
  const hull = useMemo(() => convexHull2D(points), [points]);
  const affineDimension = affineDimension2D(points);
  const redundantIndices = points.flatMap((point, index) =>
    pointInConvexHull2D(
      point,
      points.filter((_candidate, candidateIndex) => candidateIndex !== index),
    )
      ? [index]
      : [],
  );

  const handlePresetChange = (nextPreset: FourPointPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      setPoints(copyPoints(FOUR_POINT_CONFIGS[nextPreset]));
    }
  };

  const handlePointsChange = (nextPoints: Point2[]) => {
    setPoints(nextPoints);
    setPreset("custom");
  };

  const reset = () => {
    setPreset("quadrilateral");
    setPoints(copyPoints(FOUR_POINT_CONFIGS.quadrilateral));
  };

  const redundancyText =
    redundantIndices.length === 0
      ? "无凸冗余点：四点都是凸包顶点"
      : `P${redundantIndices.join(", P")} 可由其他三点的凸组合表示`;

  const canvas = (
    <HullCanvas2D
      canvasTestId="r2-four-canvas"
      points={points}
      onPointsChange={handlePointsChange}
      onReset={reset}
    />
  );
  const readouts = (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="affine-readouts"
      >
        <MetricCard
          label="仿射维数 $\dim \operatorname{aff}(S)$"
          testId="r2-four-affine-dimension"
          value={String(affineDimension)}
        />
        <MetricCard
          label="仿射关系"
          testId="r2-four-affine-status"
          value="仿射相关（二维最多 3 点无关）"
        />
        <MetricCard
          label="凸包顶点数 $|V(\operatorname{conv})|$"
          testId="r2-four-hull-vertex-count"
          value={String(hull.length)}
        />
        <MetricCard
          label="凸冗余判定"
          testId="r2-four-redundancy-summary"
          value={redundancyText}
        />
      </div>
      <FormulaCard
        title="仿射冗余 vs 凸冗余与极点判据"
        definitions={
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span>
                仿射冗余：
                {"$P_i \\in \\operatorname{aff}(S \\setminus \\{P_i\\})$"}
                <span className="ml-1 text-[11px] text-muted/80">
                  （在 ℝ² 中 4 点必全部仿射冗余）
                </span>
              </span>
              <span>
                凸冗余：
                {"$P_i \\in \\operatorname{conv}(S \\setminus \\{P_i\\})$"}
              </span>
            </div>
            <div>
              凸包极点（顶点）充要条件：
              {
                "$P_i \\text{ 是凸包顶点} \\iff P_i \\notin \\operatorname{conv}(S \\setminus \\{P_i\\})$"
              }
            </div>
          </>
        }
        statusType={redundantIndices.length === 0 ? "success" : "warning"}
        status={
          redundantIndices.length === 0 ? (
            <>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ✅ 4 个凸包极点（无凸冗余）：
              </span>
              <span>
                {
                  "$\\forall i, \\; P_i \\notin \\operatorname{conv}(S \\setminus \\{P_i\\})$"
                }
                <span className="ml-1.5">
                  四点全部位于凸包边界上，构成非退化凸四边形。
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                ⚠️ 检测到凸冗余点：
              </span>
              <span>
                {`$P_{${redundantIndices.join(", ")}} \\in \\operatorname{conv}(S \\setminus \\{P_{${redundantIndices.join(", ")}}\\})$`}
                <span className="ml-1.5">
                  该点落在其余点的凸包内部，剔除后凸包保持不变。
                </span>
              </span>
            </>
          )
        }
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {points.map((_point, index) => (
          <span key={index} data-testid={`r2-four-point-status-${index}`}>
            <strong>P{index}</strong>：
            {redundantIndices.includes(index)
              ? "内部凸冗余点（剔除不影响凸包）"
              : "凸包极点（不可剔除顶点）"}
          </span>
        ))}
      </div>
      <span className="sr-only" data-testid="r2-four-sample-count">
        {samples.length}
      </span>
    </div>
  );

  return (
    <KdeWindowShell
      channel="CH 02"
      title="仿射包与凸包实验 · R² 四点冗余度判定"
      eyebrow="BREEZE WORKSPACE · AFFINE HULL"
      mark="B"
      modeTag="R² 4-PTS"
      testId="affine-hull-convex-redundancy-demo"
      tabs={scenarioSelector}
      display={canvas}
      footer={readouts}
      controls={
        <div className="space-y-4" data-testid="r2-four-experiment">
          <KdeGroupBox
            title="SCENARIO PRESETS & VERTICES"
            subtitle="四点在二维中必仿射相关，但凸包未必有冗余顶点。拖动点，观察哪些点仍是凸包的极点。"
            action={
              <PresetSelector
                label="点集预设："
                options={FOUR_POINT_PRESETS}
                value={preset}
                onChange={handlePresetChange}
              />
            }
          >
            <VertexCoordinatesRack
              points={points}
              redundantIndices={redundantIndices}
              dimension={affineDimension}
              isFourPoint={true}
            />
          </KdeGroupBox>
        </div>
      }
    />
  );
}

const TETRA_BASE: Point3[] = [
  { x: -1.2, y: -0.9, z: 0 },
  { x: 1.2, y: -0.9, z: 0 },
  { x: 0, y: 1.3, z: 0 },
];
const TETRA_POINT_XY = { x: 0, y: -1 / 6 };
const DEFAULT_TETRA_HEIGHT = 1.2;

interface TetraSceneApi {
  scene: Scene;
  setHeight(height: number): void;
  dispose(): void;
}

function tetrahedronPoints(height: number): Point3[] {
  return [
    ...TETRA_BASE.map((point) => ({ ...point })),
    { ...TETRA_POINT_XY, z: height },
  ];
}

function tetrahedronSixVolume(points: readonly Point3[]): number {
  const [p0, p1, p2, p3] = points;
  const a = new Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  const b = new Vector3(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
  const c = new Vector3(p3.x - p0.x, p3.y - p0.y, p3.z - p0.z);
  return a.cross(b).dot(c);
}

function createTetrahedronScene(): TetraSceneApi {
  const scene = createStandardScene3D({ size: 6, divisions: 12 });
  scene.add(createAxesGroup(2.4));
  const dynamicGroup = new Group();
  scene.add(dynamicGroup);
  let currentHeight = DEFAULT_TETRA_HEIGHT;

  const update = (height: number) => {
    currentHeight = height;
    disposeObject(dynamicGroup);
    dynamicGroup.clear();
    const points = tetrahedronPoints(height);
    const samples = sampleConvexCombinations3D(points);
    const theme = readThemeColors();

    const samplePositions: number[] = [];
    for (const point of samples) {
      samplePositions.push(...mathToWorld(point.x, point.y, point.z));
    }
    const sampleGeometry = new BufferGeometry();
    sampleGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(samplePositions, 3),
    );
    dynamicGroup.add(
      new Points(
        sampleGeometry,
        new PointsMaterial({
          color: new Color(theme.accent),
          size: 4,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      ),
    );

    const isTetrahedron = height > GEOMETRY_EPSILON;
    const faces = isTetrahedron
      ? [
          [0, 1, 2],
          [0, 1, 3],
          [1, 2, 3],
          [2, 0, 3],
        ]
      : [[0, 1, 2]];
    const facePositions: number[] = [];
    const faceColors: number[] = [];
    const color = new Color(theme.accent);
    for (const face of faces) {
      for (const index of face) {
        const point = points[index];
        facePositions.push(...mathToWorld(point.x, point.y, point.z));
        faceColors.push(color.r, color.g, color.b);
      }
    }
    const surfaceGeometry = new BufferGeometry();
    surfaceGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(facePositions, 3),
    );
    surfaceGeometry.setAttribute(
      "color",
      new Float32BufferAttribute(faceColors, 3),
    );
    surfaceGeometry.computeVertexNormals();
    dynamicGroup.add(
      new Mesh(surfaceGeometry, createSurfaceMaterial({ opacity: 0.2 })),
    );

    const edgeIndices = isTetrahedron
      ? [
          [0, 1],
          [1, 2],
          [2, 0],
          [0, 3],
          [1, 3],
          [2, 3],
        ]
      : [
          [0, 1],
          [1, 2],
          [2, 0],
        ];
    const edgePositions: number[] = [];
    for (const [start, end] of edgeIndices) {
      edgePositions.push(
        ...mathToWorld(points[start].x, points[start].y, points[start].z),
      );
      edgePositions.push(
        ...mathToWorld(points[end].x, points[end].y, points[end].z),
      );
    }
    const edgeGeometry = new BufferGeometry();
    edgeGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(edgePositions, 3),
    );
    dynamicGroup.add(
      new LineSegments(
        edgeGeometry,
        new LineBasicMaterial({ color: new Color(theme.accent) }),
      ),
    );

    const markerColor = new Color(theme.ink).getHex();
    points.forEach((point, index) => {
      const marker = createMarker(markerColor, index === 3 ? 0.12 : 0.1);
      const [x, y, z] = mathToWorld(point.x, point.y, point.z);
      marker.position.set(x, y, z);
      dynamicGroup.add(marker);
    });
  };

  const stopThemeWatch = watchTheme(() => update(currentHeight));
  update(currentHeight);
  return {
    scene,
    setHeight: update,
    dispose() {
      stopThemeWatch();
      disposeObject(scene);
    },
  };
}

function R3FourPointExperiment({
  scenarioSelector,
}: {
  scenarioSelector: ReactNode;
}) {
  const [height, setHeight] = useState(DEFAULT_TETRA_HEIGHT);
  const onUpdate = useCallback(
    ({ api }: { api: TetraSceneApi }) => api.setHeight(height),
    [height],
  );
  const { containerRef, apiRef, viewerRef } = useViewer3D(
    createTetrahedronScene,
    onUpdate,
    [height],
  );

  const points = tetrahedronPoints(height);
  const volume = Math.abs(tetrahedronSixVolume(points)) / 6;
  const affineDimension = height > GEOMETRY_EPSILON ? 3 : 2;
  const sampleCount = sampleSimplexWeights(4).length;

  const handleReset = () => {
    setHeight(DEFAULT_TETRA_HEIGHT);
    apiRef.current?.setHeight(DEFAULT_TETRA_HEIGHT);
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.position.set(3, 2.5, 4);
    viewer.camera.lookAt(0, 0, 0);
    viewer.controls.target.set(0, 0, 0);
    viewer.controls.update();
    viewer.render();
  };

  const canvas = (
    <div
      ref={containerRef}
      className="relative flex-1 h-full min-h-[var(--demo-height,28rem)] w-full overflow-hidden"
      data-testid="r3-tetra-canvas-container"
    >
      <CanvasToolbar onReset={handleReset} />
      <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
    </div>
  );
  const readouts = (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="affine-readouts"
      >
        <MetricCard
          label="仿射维数 $\dim \operatorname{aff}(S)$"
          testId="r3-affine-dimension"
          value={String(affineDimension)}
        />
        <MetricCard
          label="相关性判定"
          testId="r3-affine-status"
          value={affineDimension === 3 ? "仿射无关" : "仿射相关"}
        />
        <MetricCard
          label="四面体体积 $V$"
          testId="r3-tetra-volume"
          value={volume.toFixed(3)}
        />
        <MetricCard
          label="重心格采样 $N = \binom{10+3}{3}$"
          testId="r3-sample-count"
          value={String(sampleCount)}
        />
      </div>
      <FormulaCard
        title="四面体有向体积与三维退化判据"
        definitions={
          <>
            <div>
              行列式有向体积公式：
              {
                "$V = \\frac{1}{6} \\left| (P_1 - P_0) \\cdot ((P_2 - P_0) \\times (P_3 - P_0)) \\right| = \\frac{1}{6} \\left| \\det [P_1 - P_0, \\; P_2 - P_0, \\; P_3 - P_0] \\right|$"
              }
            </div>
            <div>
              共面退化充要条件：
              {
                "$V = 0 \\iff P_3 \\in \\operatorname{aff}(P_0, P_1, P_2) \\iff \\dim \\operatorname{aff}(S) \\le 2$"
              }
            </div>
          </>
        }
        statusType={affineDimension === 3 ? "success" : "warning"}
        status={
          affineDimension === 3 ? (
            <>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ✅ 空间单纯形（仿射无关）：
              </span>
              <span>
                {`$h = ${height.toFixed(2)} > 0$ 使得 $V = ${volume.toFixed(3)} > 0$ ，$\\dim \\operatorname{aff}(S) = 3$，四点构成空间非退化实心四面体（3-Simplex）。`}
              </span>
            </>
          ) : (
            <>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                ⚠️ 共面退化（仿射相关）：
              </span>
              <span>
                {
                  "$h = 0.00 \\implies V = 0.000$，第四点落在底面仿射平面（$P_3 \\in \\operatorname{aff}(P_0, P_1, P_2)$），$\\dim \\operatorname{aff}(S) = 2$，体积归零退化为二维三角形。"
                }
              </span>
            </>
          )
        }
      />
      <p className="text-xs text-muted">
        $P_0, P_1, P_2$ 为底面固定顶点；$P_3$ 沿底面法向 $z$
        轴移动。高度为零时四点共面，仿射维数降为 2。
      </p>
    </div>
  );

  return (
    <KdeWindowShell
      channel="CH 02"
      title="仿射包与凸包实验 · R³ 四面体退化测试"
      eyebrow="BREEZE WORKSPACE · AFFINE HULL"
      mark="B"
      modeTag="R³ 4-PTS"
      testId="affine-hull-convex-redundancy-demo"
      tabs={scenarioSelector}
      display={canvas}
      footer={readouts}
      controls={
        <div className="space-y-4" data-testid="r3-four-experiment">
          <KdeGroupBox
            title="3D SIMPLEX ELEVATION"
            subtitle="底面三点固定，调节 P3 的高度观察四面体从三维单纯形退化为平面三角形。"
            action={
              <div data-testid="tetra-height-control">
                <ParamSlider
                  labelMode="adaptive"
                  label="第四点高度 $h$"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={height}
                  onChange={setHeight}
                  display={height.toFixed(2)}
                  widthClass="w-36"
                />
              </div>
            }
          >
            <VertexCoordinatesRack3D
              points={points}
              affineDimension={affineDimension}
            />
          </KdeGroupBox>
        </div>
      }
    />
  );
}

function FormulaCard({
  title,
  definitions,
  status,
  statusType = "info",
}: {
  title: string;
  definitions: ReactNode;
  status: ReactNode;
  statusType?: "success" | "warning" | "info";
}) {
  const badgeVariant =
    statusType === "success"
      ? "success"
      : statusType === "warning"
        ? "warning"
        : "primary";

  return (
    <KdeCard
      title={title}
      badge={<KdeBadge variant={badgeVariant}>形式化公理与判据</KdeBadge>}
      footer={
        <KdeMessageBar
          variant={statusType === "info" ? "info" : statusType}
          mode="card"
        >
          {status}
        </KdeMessageBar>
      }
    >
      <div
        className="space-y-1.5 leading-relaxed text-xs text-[var(--kde-muted)]"
        data-console-formula
      >
        {definitions}
      </div>
    </KdeCard>
  );
}

function MetricCard({
  label,
  value,
  testId,
}: {
  label: ReactNode;
  value: string;
  testId: string;
}) {
  return (
    <KdeReadout
      label={label}
      value={<span data-testid={testId}>{value}</span>}
      testId={testId ? `${testId}-container` : undefined}
    />
  );
}

export default function AffineHullConvexRedundancyDemo() {
  const [scenario, setScenario] = useState<ScenarioId>("r2-three");
  const scenarioSelector = (
    <KdeTabs<ScenarioId>
      label="SCENARIO"
      options={SCENARIO_OPTIONS}
      value={scenario}
      onChange={(id) => setScenario(id)}
      size="sm"
      variant="default"
    />
  );

  return (
    <AutoMath>
      <ExpandableDemo id="affine-hull-convex-redundancy">
        {scenario === "r2-three" && (
          <R2ThreePointExperiment scenarioSelector={scenarioSelector} />
        )}
        {scenario === "r3-four" && (
          <R3FourPointExperiment scenarioSelector={scenarioSelector} />
        )}
        {scenario === "r2-four" && (
          <R2FourPointExperiment scenarioSelector={scenarioSelector} />
        )}
      </ExpandableDemo>
    </AutoMath>
  );
}
