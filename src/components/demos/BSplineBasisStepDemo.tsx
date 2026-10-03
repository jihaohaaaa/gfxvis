import { useEffect, useMemo, useRef, useState } from "react";
import {
  bsplineBasis,
  createStandardUniformKnotVector,
  evaluateBSpline,
  findKnotSpan,
  getBasisIndicesForSpan,
  getNonEmptyKnotSpans,
  sampleBSpline,
  sumBasisAt,
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
import KdeBadge from "../framework/KdeBadge";
import KdeButton from "../framework/KdeButton";
import KdeCard from "../framework/KdeCard";
import KdeReadout from "../framework/KdeReadout";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BezierBasisDemo.css";
import "./BezierSplineWorkspace.css";

const BASIS_PALETTE = [
  "#3daee9", // cyan-blue
  "#27ae60", // emerald
  "#f67400", // amber
  "#9b59b6", // purple
  "#e74c3c", // crimson
  "#16a085", // teal
  "#e67e22", // carrot
  "#2980b9", // sapphire
];

export type DegreeTab = "0" | "1" | "2" | "3";

export interface DegreePreset {
  id: string;
  label: string;
  points: Point2[];
  defaultU: number;
}

const DEGREE_OPTIONS: readonly KdeTabOption<DegreeTab>[] = [
  { id: "0", label: "0 次 (方块)" },
  { id: "1", label: "1 次 (三角)" },
  { id: "2", label: "2 次 (抛物)" },
  { id: "3", label: "3 次 (平滑)" },
];

const DEGREE_PRESETS: Record<DegreeTab, DegreePreset[]> = {
  "0": [
    {
      id: "staircase",
      label: "台阶序列",
      points: [
        [-4.5, -2.2],
        [-2.7, -1.0],
        [-0.9, 0.2],
        [0.9, 1.4],
        [2.7, 2.6],
        [4.5, 3.8],
      ],
      defaultU: 2.5,
    },
    {
      id: "pulse",
      label: "交替脉冲",
      points: [
        [-4.5, -1.5],
        [-2.7, 2.5],
        [-0.9, -1.5],
        [0.9, 2.5],
        [2.7, -1.5],
        [4.5, 2.5],
      ],
      defaultU: 2.5,
    },
    {
      id: "plateau",
      label: "平顶台地",
      points: [
        [-4.5, -1.5],
        [-2.7, 2.2],
        [-0.9, 2.2],
        [0.9, 2.2],
        [2.7, -1.5],
        [4.5, -1.5],
      ],
      defaultU: 2.5,
    },
  ],
  "1": [
    {
      id: "tent",
      label: "三角帐篷",
      points: [
        [-4.5, -2.0],
        [-2.7, -0.5],
        [-0.9, 3.0],
        [0.9, 3.0],
        [2.7, -0.5],
        [4.5, -2.0],
      ],
      defaultU: 2.5,
    },
    {
      id: "ridge",
      label: "折线山脊",
      points: [
        [-4.6, -1.2],
        [-2.8, 2.2],
        [-0.8, 3.2],
        [1.2, -1.8],
        [3.2, 1.8],
        [4.8, -0.8],
      ],
      defaultU: 2.5,
    },
    {
      id: "sawtooth",
      label: "锯齿折线",
      points: [
        [-4.5, -1.8],
        [-2.7, 2.2],
        [-0.9, -1.8],
        [0.9, 2.2],
        [2.7, -1.8],
        [4.5, 2.2],
      ],
      defaultU: 2.5,
    },
  ],
  "2": [
    {
      id: "arch",
      label: "抛物拱门",
      points: [
        [-4.5, -2.0],
        [-2.5, 2.8],
        [-0.5, 3.5],
        [1.5, 2.8],
        [3.5, 0.0],
        [4.8, -2.0],
      ],
      defaultU: 3.5,
    },
    {
      id: "twin_peaks",
      label: "二次双峰",
      points: [
        [-4.5, -1.5],
        [-2.7, 2.6],
        [-0.9, -0.5],
        [0.9, 2.6],
        [2.7, -0.5],
        [4.5, 2.0],
      ],
      defaultU: 3.5,
    },
    {
      id: "smooth_s",
      label: "二次 S 弯",
      points: [
        [-4.6, -1.2],
        [-2.8, 2.2],
        [-0.8, 3.2],
        [1.2, -1.8],
        [3.2, 1.8],
        [4.8, -0.8],
      ],
      defaultU: 3.5,
    },
  ],
  "3": [
    {
      id: "classic_s",
      label: "经典 S 弯",
      points: [
        [-4.6, -1.2],
        [-2.8, 2.2],
        [-0.8, 3.2],
        [1.2, -1.8],
        [3.2, 1.8],
        [4.8, -0.8],
      ],
      defaultU: 4.5,
    },
    {
      id: "wave",
      label: "平滑波浪",
      points: [
        [-4.5, -0.5],
        [-3.0, 2.8],
        [-1.2, -2.8],
        [0.8, 2.8],
        [2.8, -2.8],
        [4.5, 1.5],
      ],
      defaultU: 4.5,
    },
    {
      id: "airfoil",
      label: "CAD 翼型",
      points: [
        [-4.5, 0.0],
        [-2.5, 3.2],
        [0.0, 2.0],
        [2.0, 0.5],
        [3.5, -0.2],
        [4.8, 0.0],
      ],
      defaultU: 4.5,
    },
  ],
};

const DEFAULT_META: Record<
  DegreeTab,
  { channel: string; title: string; eyebrow: string }
> = {
  "0": {
    channel: "EXP 06",
    title: "0 次 B-Spline 阶梯方块基函数与离散点演化工作台",
    eyebrow: "DEGREE 0 · PIECEWISE CONSTANT BASIS",
  },
  "1": {
    channel: "EXP 07",
    title: "1 次 B-Spline 线性三角帽子基函数与折线演化工作台",
    eyebrow: "DEGREE 1 · LINEAR HAT BASIS & POLYLINE",
  },
  "2": {
    channel: "EXP 08",
    title: "2 次 B-Spline 抛物山包基函数与 C¹ 平滑演化工作台",
    eyebrow: "DEGREE 2 · QUADRATIC PARABOLA BASIS & C1 CONTINUITY",
  },
  "3": {
    channel: "EXP 09",
    title: "3 次 B-Spline 平滑钟形基函数与 C² 光顺演化工作台",
    eyebrow: "DEGREE 3 · CUBIC SPLINE BASIS & C2 CONTINUITY",
  },
};

function formatPoint(point: Point2): string {
  return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
}

export interface BSplineBasisStepDemoProps {
  initialDegree?: DegreeTab;
  initialPreset?: string;
  channel?: string;
  title?: string;
  eyebrow?: string;
  id?: string;
}

export default function BSplineBasisStepDemo({
  initialDegree = "1",
  initialPreset,
  channel,
  title,
  eyebrow,
  id,
}: BSplineBasisStepDemoProps) {
  const [degreeStr, setDegreeStr] = useState<DegreeTab>(initialDegree);
  const degree = parseInt(degreeStr, 10);

  const presetsForDegree = DEGREE_PRESETS[degreeStr] ?? DEGREE_PRESETS["1"];
  const defaultPreset =
    presetsForDegree.find((p) => p.id === initialPreset) ?? presetsForDegree[0];
  const [activePresetId, setActivePresetId] = useState<string>(
    defaultPreset.id,
  );

  const [points, setPoints] = useState<Point2[]>(() =>
    defaultPreset.points.map(([x, y]) => [x, y]),
  );
  const [u, setU] = useState(defaultPreset.defaultU);
  const [hoveredBasis, setHoveredBasis] = useState<number | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // Standard uniform knot vector: u_i = i for i = 0 .. n + p + 1
  const knots = useMemo(
    () => createStandardUniformKnotVector(points.length, degree),
    [points.length, degree],
  );

  const spans = useMemo(
    () => getNonEmptyKnotSpans(degree, knots),
    [degree, knots],
  );

  const minU = spans[0]?.start ?? degree;
  const maxU = spans.at(-1)?.end ?? points.length;

  // Clamp u when degree changes
  useEffect(() => {
    if (u < minU) setU(minU);
    else if (u > maxU) setU(maxU);
  }, [minU, maxU, u]);

  const currentSpanIndex = findKnotSpan(u, degree, knots);
  const currentSpan =
    spans.find((span) => span.index === currentSpanIndex) ?? spans[0];
  const activeBasisIndices = currentSpan
    ? getBasisIndicesForSpan(currentSpan.index, degree, knots)
    : [];

  const activeWeights = activeBasisIndices.map((idx) => ({
    index: idx,
    weight: bsplineBasis(idx, degree, u, knots),
    color: BASIS_PALETTE[idx % BASIS_PALETTE.length],
  }));

  const weightSum = sumBasisAt(u, degree, knots);
  const currentPoint = evaluateBSpline(points, degree, u, knots);

  // Left Canvas: Basis Curves
  const {
    containerRef: basisContainerRef,
    canvasRef: basisCanvasRef,
    setBounds: setBasisBounds,
    resetBounds: resetBasisBounds,
  } = useCanvas2D(
    {
      initialBounds: {
        xMin: -0.3,
        xMax: knots[knots.length - 1] + 0.3,
        yMin: -0.1,
        yMax: 1.15,
      },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "u", "N");

        // 1. Horizontal unity line y = 1.0
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(knots[0]), plot.toScreenY(1));
        ctx.lineTo(plot.toScreenX(knots[knots.length - 1]), plot.toScreenY(1));
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = theme.muted;
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText(
          "∑ = 1.00",
          plot.toScreenX(knots[knots.length - 1]) - 4,
          plot.toScreenY(1) - 4,
        );

        // 2. Draw vertical knot lines
        knots.forEach((knotVal) => {
          const kx = plot.toScreenX(knotVal);
          ctx.save();
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = theme.border;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(kx, plot.toScreenY(-0.05));
          ctx.lineTo(kx, plot.toScreenY(1.05));
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = theme.muted;
          ctx.font = "10px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(`u=${knotVal}`, kx, plot.toScreenY(-0.06));
        });

        // 3. Highlight current span region
        if (currentSpan) {
          const spanX1 = plot.toScreenX(currentSpan.start);
          const spanX2 = plot.toScreenX(currentSpan.end);
          ctx.fillStyle = "rgba(61, 174, 233, 0.08)";
          ctx.fillRect(
            spanX1,
            plot.toScreenY(1.1),
            spanX2 - spanX1,
            plot.toScreenY(-0.05) - plot.toScreenY(1.1),
          );
        }

        // 4. Draw all basis functions N_{i,p}(u)
        const basisCount = points.length;
        for (let i = 0; i < basisCount; i++) {
          const color = BASIS_PALETTE[i % BASIS_PALETTE.length];
          const isActive = activeBasisIndices.includes(i);
          const isHovered = hoveredBasis === i;

          const polyline: Point2[] = [];
          const startK = knots[i];
          const endK = knots[i + degree + 1] ?? knots[knots.length - 1];

          if (degree === 0) {
            // Draw step function
            polyline.push([startK, 0]);
            polyline.push([startK, 1]);
            polyline.push([endK, 1]);
            polyline.push([endK, 0]);
          } else {
            // Sample smooth/triangular basis
            const steps = Math.max(16, (degree + 1) * 12);
            const dt = (endK - startK) / steps;
            for (let s = 0; s <= steps; s++) {
              const curU = startK + s * dt;
              const val = bsplineBasis(i, degree, curU, knots);
              polyline.push([curU, val]);
            }
          }

          drawPolyline(ctx, plot, polyline, {
            color: isHovered ? "#e74c3c" : color,
            width: isHovered ? 3.5 : isActive ? 2.6 : 1.2,
          });

          // Draw peak label
          const midU = (startK + endK) / 2;
          const peakVal =
            degree === 0 ? 1.0 : bsplineBasis(i, degree, midU, knots);
          if (peakVal > 0.05) {
            ctx.fillStyle = color;
            ctx.font = isActive
              ? "bold 11px ui-monospace, monospace"
              : "10px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillText(
              `N${i},${degree}`,
              plot.toScreenX(midU),
              plot.toScreenY(peakVal) - 6,
            );
          }
        }

        // 5. Draw vertical probe line at u
        const probeX = plot.toScreenX(u);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(probeX, plot.toScreenY(-0.05));
        ctx.lineTo(probeX, plot.toScreenY(1.1));
        ctx.stroke();
        ctx.restore();

        // 6. Draw active weight dots at intersection
        activeWeights.forEach(({ weight, color }) => {
          drawPoint(ctx, plot, u, weight, {
            color,
            radius: 5,
            filled: true,
            width: 1.5,
          });
        });
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const clickU = plot.toWorldX(event.clientX - rect.left);
        const clampedU = Math.max(minU, Math.min(maxU, clickU));
        setU(clampedU);
        return true;
      },
      onLeftMove(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;
        const moveU = plot.toWorldX(event.clientX - rect.left);
        const clampedU = Math.max(minU, Math.min(maxU, moveU));
        setU(clampedU);
      },
    },
    [
      degree,
      u,
      knots,
      currentSpan?.index,
      activeBasisIndices.join(","),
      hoveredBasis,
      minU,
      maxU,
    ],
  );

  // Update Left basis canvas bounds when degree/knots change
  useEffect(() => {
    setBasisBounds({
      xMin: -0.3,
      xMax: knots[knots.length - 1] + 0.3,
      yMin: -0.1,
      yMax: 1.15,
    });
  }, [knots, setBasisBounds]);

  // Right Canvas: Geometry & Control Points
  const {
    containerRef: geomContainerRef,
    canvasRef: geomCanvasRef,
    resetBounds: resetGeomBounds,
  } = useCanvas2D(
    {
      initialBounds: {
        xMin: -5.5,
        xMax: 5.5,
        yMin: -4.0,
        yMax: 4.5,
      },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "x", "y");

        // 1. Control polygon / scaffolding
        drawPolyline(ctx, plot, points, {
          color: theme.border,
          width: 1.2,
          dash: [4, 4],
        });

        // 2. Evaluated B-Spline curve / geometry
        if (degree === 0) {
          // Degree 0: discrete piecewise points
          spans.forEach((span) => {
            const spanBasis = getBasisIndicesForSpan(span.index, 0, knots);
            if (spanBasis.length > 0) {
              const pt = points[spanBasis[0]];
              if (pt) {
                drawPoint(ctx, plot, pt[0], pt[1], {
                  color: BASIS_PALETTE[spanBasis[0] % BASIS_PALETTE.length],
                  radius: 6,
                  filled: true,
                  width: 1.5,
                });
              }
            }
          });
        } else if (degree === 1) {
          // Degree 1: polyline directly through control points
          drawPolyline(ctx, plot, points, {
            color: "#3daee9",
            width: 2.8,
          });
        } else {
          // Degree 2 or 3: smooth curve
          const curvePoints = sampleBSpline(points, degree, knots, 36);
          if (curvePoints.length > 1) {
            drawPolyline(ctx, plot, curvePoints, {
              color: "#3daee9",
              width: 3.0,
            });
          }
        }

        // 3. Control points
        points.forEach((pt, idx) => {
          const isActive = activeBasisIndices.includes(idx);
          const isHovered = hoveredBasis === idx;
          const color = BASIS_PALETTE[idx % BASIS_PALETTE.length];

          drawPoint(ctx, plot, pt[0], pt[1], {
            color: isHovered ? "#e74c3c" : isActive ? color : theme.muted,
            radius: isActive || isHovered ? 6.5 : 4.5,
            filled: true,
            width: 1.5,
          });

          // Label
          ctx.fillStyle = isActive ? color : theme.muted;
          ctx.font = isActive
            ? "bold 11px ui-monospace, monospace"
            : "10px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(
            `P${idx}`,
            plot.toScreenX(pt[0]),
            plot.toScreenY(pt[1]) - 10,
          );
        });

        // 4. Current evaluated point C(u)
        if (currentPoint) {
          drawPoint(ctx, plot, currentPoint[0], currentPoint[1], {
            color: "#e74c3c",
            radius: 7,
            filled: true,
            width: 2,
          });

          ctx.fillStyle = theme.ink;
          ctx.font = "bold 11px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.fillText(
            `C(u=${u.toFixed(2)})`,
            plot.toScreenX(currentPoint[0]) + 10,
            plot.toScreenY(currentPoint[1]) - 6,
          );
        }
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        let nearest: number | null = null;
        let minDistance = 24;
        pointsRef.current.forEach(([x, y], index) => {
          const dist = Math.hypot(
            plot.toScreenX(x) - px,
            plot.toScreenY(y) - py,
          );
          if (dist < minDistance) {
            minDistance = dist;
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
        setPoints((prev) =>
          prev.map((pt, i) => (i === index ? [nextX, nextY] : pt)),
        );
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [
      degree,
      u,
      points,
      knots,
      currentPoint[0],
      currentPoint[1],
      activeBasisIndices.join(","),
      hoveredBasis,
    ],
  );

  const handleDegreeChange = (newDegreeStr: DegreeTab) => {
    setDegreeStr(newDegreeStr);
    const newPresets = DEGREE_PRESETS[newDegreeStr] ?? DEGREE_PRESETS["1"];
    const firstPreset = newPresets[0];
    setActivePresetId(firstPreset.id);
    setPoints(firstPreset.points.map(([x, y]) => [x, y]));
    setU(firstPreset.defaultU);
    resetBasisBounds();
    resetGeomBounds();
  };

  const handlePresetChange = (presetId: string) => {
    const target = presetsForDegree.find((p) => p.id === presetId);
    if (target) {
      setActivePresetId(target.id);
      setPoints(target.points.map(([x, y]) => [x, y]));
      setU(target.defaultU);
      resetBasisBounds();
      resetGeomBounds();
    }
  };

  const handleReset = () => {
    const current =
      presetsForDegree.find((p) => p.id === activePresetId) ??
      presetsForDegree[0];
    setPoints(current.points.map(([x, y]) => [x, y]));
    setU(current.defaultU);
    resetBasisBounds();
    resetGeomBounds();
  };

  const presetOptions = useMemo(
    () =>
      presetsForDegree.map((p) => ({
        id: p.id,
        label: p.label,
      })),
    [presetsForDegree],
  );

  const basisViewport = (
    <div className="bezier-basis__viewport">
      <div className="bezier-basis__viewport-header">
        <span>B-SPLINE BASIS CURVES</span>
        <span className="bezier-basis__viewport-caption font-mono">
          {`$N_{i,${degree}}(u)$ · 跨度 ${degree + 1} Spans`}
        </span>
      </div>
      <div
        ref={basisContainerRef}
        data-testid="bspline-basis-step-basis-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden cursor-crosshair"
      >
        <CanvasToolbar onReset={resetBasisBounds} />
        <canvas
          ref={basisCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );

  const curveViewport = (
    <div className="bezier-basis__viewport">
      <div className="bezier-basis__viewport-header">
        <span>B-SPLINE GEOMETRY & CONTROL POINTS</span>
        <span className="bezier-basis__viewport-caption font-mono">
          {`$\\mathbf{C}(u) = \\sum N_{i,${degree}} \\mathbf{P}_i$`}
        </span>
      </div>
      <div
        ref={geomContainerRef}
        data-testid="bspline-basis-step-curve-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
      >
        <CanvasToolbar onReset={resetGeomBounds} />
        <canvas
          ref={geomCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );

  const shellChannel = channel ?? DEFAULT_META[degreeStr]?.channel ?? "EXP 03";
  const shellTitle =
    title ??
    DEFAULT_META[degreeStr]?.title ??
    "B-Spline 基函数阶梯演化与 Cox–de Boor 递推工作台";
  const shellEyebrow =
    eyebrow ??
    DEFAULT_META[degreeStr]?.eyebrow ??
    "B-SPLINE BASIS HIERARCHY · COX-DE BOOR RECURSION";
  const demoId = id ?? `bspline-basis-step-demo-p${initialDegree}`;

  return (
    <AutoMath>
      <div className="bgl-workspace my-6" data-testid={demoId}>
        <ExpandableDemo id={demoId}>
          <KdeWindowShell
            channel={shellChannel}
            title={shellTitle}
            eyebrow={shellEyebrow}
            mark="N"
            modeTag={`DEGREE-${degree}`}
            testId={`bspline-basis-step-console-p${degreeStr}`}
            layoutPreset="dense-dock"
            className="bezier-spline-workspace"
            displayClassName="kde-window-shell__display--viewport-group"
            display={
              <InteractiveViewportGroup
                items={[basisViewport, curveViewport]}
                columns={2}
                mobileColumns={1}
                className="bezier-basis__viewport-group"
                itemClassName="bezier-basis__viewport-item"
                testId={`bspline-basis-step-canvas-group-p${degreeStr}`}
              />
            }
            controls={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full items-stretch">
                {/* Column 1: 多项式次数与预设切换 */}
                <KdeCard
                  title="1. 阶数与场景预设"
                  badge={
                    <KdeBadge variant="primary">{`p = ${degree}`}</KdeBadge>
                  }
                >
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <div className="text-[11px] font-medium text-[var(--kde-muted,#626b73)] mb-1">
                        多项式次数:
                      </div>
                      <KdeTabs
                        options={DEGREE_OPTIONS}
                        value={degreeStr}
                        onChange={handleDegreeChange}
                        size="xs"
                        variant="pill"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[var(--kde-muted,#626b73)] mb-1">
                        几何场景预设:
                      </div>
                      <PresetSelector
                        options={presetOptions}
                        value={activePresetId}
                        onChange={handlePresetChange}
                        size="xs"
                        layout="horizontal"
                      />
                    </div>
                    <KdeButton
                      variant="default"
                      size="xs"
                      onClick={handleReset}
                      title="重置控制点与视口"
                    >
                      ↺ 重置几何预设
                    </KdeButton>
                  </div>
                </KdeCard>

                {/* Column 2: 参数探针滑动条 */}
                <KdeCard title="2. 参数探针 (Parameter u)">
                  <div className="flex flex-col gap-2">
                    <ParamSlider
                      labelMode="stacked"
                      label="参数探针 $u$"
                      min={minU}
                      max={maxU}
                      step={0.01}
                      value={u}
                      onChange={setU}
                      display={`$u = ${u.toFixed(2)}$`}
                    />
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--kde-muted,#626b73)]">
                      <span>活跃权重:</span>
                      {activeWeights.map(({ index, weight, color }) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-white shadow-xs cursor-pointer"
                          style={{ backgroundColor: color }}
                          onMouseEnter={() => setHoveredBasis(index)}
                          onMouseLeave={() => setHoveredBasis(null)}
                        >
                          {`N${index}=${weight.toFixed(2)}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </KdeCard>

                {/* Column 3: 状态与权重和遥测 */}
                <KdeCard title="3. 状态与权重和">
                  <div className="flex flex-col gap-1.5 p-1 text-xs">
                    <KdeReadout
                      label="当前跨度 Span"
                      value={
                        currentSpan
                          ? `$[${currentSpan.start.toFixed(1)}, ${currentSpan.end.toFixed(1)})$`
                          : "边界"
                      }
                      variant="accent"
                    />
                    <KdeReadout
                      label="权重和 $\\sum N_i(u)$"
                      value={weightSum.toFixed(3)}
                      variant={
                        Math.abs(weightSum - 1.0) < 0.001 ? "success" : "danger"
                      }
                    />
                  </div>
                </KdeCard>

                {/* Column 4: 几何与局部控制 */}
                <KdeCard title="4. 局部控制与坐标">
                  <div className="flex flex-col gap-1.5 p-1 text-xs">
                    <KdeReadout
                      label="活跃控制点数"
                      value={`${activeBasisIndices.length} 个 ($p + 1$)`}
                      variant="accent"
                    />
                    <KdeReadout
                      label="曲线点 $\\mathbf{C}(u)$"
                      value={formatPoint(currentPoint)}
                    />
                  </div>
                </KdeCard>
              </div>
            }
          />
        </ExpandableDemo>
      </div>
    </AutoMath>
  );
}
