import { useMemo, useRef, useState, useEffect } from "react";
import {
  evaluateBezier,
  sampleBezier,
  evaluateBSpline,
  sampleBSpline,
  createClampedKnotVector,
  type Point2,
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
import KdeSwitch from "../framework/KdeSwitch";
import KdeButton from "../framework/KdeButton";
import KdeBadge from "../framework/KdeBadge";
import KdeWindowShell from "../framework/KdeWindowShell";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BezierGlobalVsLocalDemo.css";
import "./BezierSplineWorkspace.css";

export type DemoMode = "global_vs_local" | "oscillation";

const MODE_OPTIONS: readonly KdeTabOption<DemoMode>[] = [
  { id: "global_vs_local", label: "全局影响 vs 局部支撑" },
  { id: "oscillation", label: "多点控制与次数解耦" },
];

const BASELINE_POINTS_GLOBAL: Point2[] = [
  [-4.8, -1.2],
  [-3.0, 2.2],
  [-1.2, 2.8],
  [0.8, -1.8],
  [2.8, 1.8],
  [4.8, -1.0],
];

const OSCILLATION_PRESETS: Record<
  string,
  { label: string; description: string; points: Point2[] }
> = {
  bump: {
    label: "局部单峰突变",
    description: "6 控制点：单峰局部大幅拉高，高阶 Bézier 产生全域平摊变形",
    points: [
      [-4.5, -1.0],
      [-2.8, -0.8],
      [-0.8, 3.2],
      [0.8, -0.8],
      [2.8, -1.0],
      [4.5, -1.0],
    ],
  },
  zigzag: {
    label: "多波交替折线",
    description:
      "7 控制点：多重凹凸折线，高阶 Bézier 升至 6 次导致控制钝化与大凸包",
    points: [
      [-4.6, -1.5],
      [-3.2, 2.5],
      [-1.8, -2.0],
      [0.0, 2.5],
      [1.8, -2.0],
      [3.2, 2.5],
      [4.6, -1.5],
    ],
  },
  hairpin: {
    label: "局部回环折角",
    description:
      "8 控制点：急剧转折多边形，对比高阶 Bézier 与分段 3 次 B-Spline 的局部贴合性",
    points: [
      [-4.8, -2.0],
      [-3.5, 0.5],
      [-1.5, 3.0],
      [0.0, 3.0],
      [1.5, 0.5],
      [2.2, -1.8],
      [3.5, -1.8],
      [4.8, 1.2],
    ],
  },
};

const PRESET_OPTIONS: PresetOption<string>[] = Object.entries(
  OSCILLATION_PRESETS,
).map(([id, p]) => ({
  id,
  label: p.label,
  description: p.description,
}));

export default function BezierGlobalVsLocalDemo() {
  const [mode, setMode] = useState<DemoMode>("global_vs_local");
  const [oscillationPreset, setOscillationPreset] = useState<string>("bump");

  // Control points state
  const [pointsGlobal, setPointsGlobal] = useState<Point2[]>(() =>
    BASELINE_POINTS_GLOBAL.map(([x, y]) => [x, y]),
  );
  const [baselinePoints, setBaselinePoints] = useState<Point2[]>(() =>
    BASELINE_POINTS_GLOBAL.map(([x, y]) => [x, y]),
  );

  const [pointsOscillation, setPointsOscillation] = useState<Point2[]>(() =>
    OSCILLATION_PRESETS.bump.points.map(([x, y]) => [x, y]),
  );

  // Visual toggles
  const [showBezier, setShowBezier] = useState(true);
  const [showBSpline, setShowBSpline] = useState(true);
  const [showDisplacementField, setShowDisplacementField] = useState(true);
  const [showGhostBaseline, setShowGhostBaseline] = useState(true);

  // Active dragged point index
  const [activePointIndex, setActivePointIndex] = useState<number | null>(2);

  const currentPoints =
    mode === "global_vs_local" ? pointsGlobal : pointsOscillation;
  const currentDegree = currentPoints.length - 1;

  // Knot vector for B-Spline (cubic p = 3 clamped)
  const bsplineDegree = 3;
  const knots = useMemo(() => {
    return createClampedKnotVector(currentPoints.length, bsplineDegree);
  }, [currentPoints.length]);

  const baselineKnots = useMemo(() => {
    return createClampedKnotVector(baselinePoints.length, bsplineDegree);
  }, [baselinePoints.length]);

  // Handle Preset change
  const handlePresetChange = (presetId: string) => {
    setOscillationPreset(presetId);
    if (OSCILLATION_PRESETS[presetId]) {
      setPointsOscillation(
        OSCILLATION_PRESETS[presetId].points.map(([x, y]) => [x, y]),
      );
      setActivePointIndex(null);
    }
  };

  // Reset perturbation
  const handleResetPerturbation = () => {
    if (mode === "global_vs_local") {
      setPointsGlobal(BASELINE_POINTS_GLOBAL.map(([x, y]) => [x, y]));
      setBaselinePoints(BASELINE_POINTS_GLOBAL.map(([x, y]) => [x, y]));
      setActivePointIndex(2);
    } else {
      if (OSCILLATION_PRESETS[oscillationPreset]) {
        setPointsOscillation(
          OSCILLATION_PRESETS[oscillationPreset].points.map(([x, y]) => [x, y]),
        );
      }
    }
  };

  // Compute metrics
  const telemetry = useMemo(() => {
    if (mode === "global_vs_local") {
      const draggedIdx = activePointIndex ?? 2;
      const n = currentPoints.length - 1;
      const p = bsplineDegree;

      // B-Spline non-zero basis domain for P_k: [u_k, u_{k+p+1})
      const uStart = knots[draggedIdx] ?? 0;
      const uEnd = knots[draggedIdx + p + 1] ?? knots[knots.length - 1];
      const totalSpan = knots[knots.length - 1] - knots[0];
      const bsplineRangeFraction =
        totalSpan > 0 ? ((uEnd - uStart) / totalSpan) * 100 : 100;

      // Compute max displacement between baseline and current
      let maxBezierDisp = 0;
      let maxBSplineDisp = 0;
      const samples = 100;

      for (let s = 0; s <= samples; s += 1) {
        const t = s / samples;
        const ptBez = evaluateBezier(currentPoints, t);
        const ptBezBase = evaluateBezier(baselinePoints, t);
        const dBez = Math.hypot(
          ptBez[0] - ptBezBase[0],
          ptBez[1] - ptBezBase[1],
        );
        if (dBez > maxBezierDisp) maxBezierDisp = dBez;

        const u = knots[0] + (s / samples) * totalSpan;
        const ptBsp = evaluateBSpline(currentPoints, p, u, knots);
        const ptBspBase = evaluateBSpline(baselinePoints, p, u, baselineKnots);
        const dBsp = Math.hypot(
          ptBsp[0] - ptBspBase[0],
          ptBsp[1] - ptBspBase[1],
        );
        if (dBsp > maxBSplineDisp) maxBSplineDisp = dBsp;
      }

      return {
        draggedIdx,
        bezierAffected: "全域 100% [0, 1]",
        bsplineAffected: `局部 [${uStart.toFixed(1)}, ${uEnd.toFixed(1)}) (${bsplineRangeFraction.toFixed(0)}% 域)`,
        maxBezierDisp,
        maxBSplineDisp,
        degree: n,
      };
    } else {
      return {
        draggedIdx: null,
        bezierAffected: "全域绑定",
        bsplineAffected: "局部固定三次",
        maxBezierDisp: 0,
        maxBSplineDisp: 0,
        degree: currentDegree,
      };
    }
  }, [
    mode,
    activePointIndex,
    currentPoints,
    baselinePoints,
    knots,
    baselineKnots,
    currentDegree,
  ]);

  // Set up 2D Canvas
  const pointsRef = useRef(currentPoints);
  useEffect(() => {
    pointsRef.current = currentPoints;
  }, [currentPoints]);

  const dragIndexRef = useRef<number | null>(null);

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: { xMin: -6, xMax: 6, yMin: -3.8, yMax: 4.2 },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        const pts = pointsRef.current;
        const n = pts.length - 1;
        const p = bsplineDegree;

        // 1. Draw Ghost Baseline Curves (if in global_vs_local and toggled)
        if (mode === "global_vs_local" && showGhostBaseline) {
          if (showBezier) {
            const ghostBezier = sampleBezier(baselinePoints, 120);
            drawPolyline(ctx, plot, ghostBezier, {
              color: "rgba(245, 124, 0, 0.4)",
              width: 1.5,
              dash: [4, 4],
            });
          }

          if (showBSpline) {
            const ghostBSpline = sampleBSpline(
              baselinePoints,
              p,
              baselineKnots,
              30,
            );
            drawPolyline(ctx, plot, ghostBSpline, {
              color: "rgba(0, 153, 123, 0.4)",
              width: 1.5,
              dash: [4, 4],
            });
          }
        }

        // 2. Draw Displacement Vector Field
        if (mode === "global_vs_local" && showDisplacementField) {
          const arrowSteps = 16;
          for (let i = 1; i < arrowSteps; i += 1) {
            const t = i / arrowSteps;
            if (showBezier) {
              const pBase = evaluateBezier(baselinePoints, t);
              const pCurr = evaluateBezier(pts, t);
              const dist = Math.hypot(pCurr[0] - pBase[0], pCurr[1] - pBase[1]);
              if (dist > 0.04) {
                drawSegment(ctx, plot, pBase[0], pBase[1], pCurr[0], pCurr[1], {
                  color: "rgba(245, 124, 0, 0.6)",
                  width: 1.2,
                });
              }
            }

            if (showBSpline) {
              const totalSpan = knots[knots.length - 1] - knots[0];
              const u = knots[0] + t * totalSpan;
              const pBase = evaluateBSpline(
                baselinePoints,
                p,
                u,
                baselineKnots,
              );
              const pCurr = evaluateBSpline(pts, p, u, knots);
              const dist = Math.hypot(pCurr[0] - pBase[0], pCurr[1] - pBase[1]);
              if (dist > 0.04) {
                drawSegment(ctx, plot, pBase[0], pBase[1], pCurr[0], pCurr[1], {
                  color: "rgba(0, 153, 123, 0.75)",
                  width: 1.5,
                });
              }
            }
          }
        }

        // 3. Draw Control Polygon
        drawPolyline(ctx, plot, pts, {
          color: "rgba(100, 115, 130, 0.4)",
          width: 1.2,
          dash: [3, 3],
        });

        // 4. Draw Bézier Curve
        if (showBezier) {
          const bezierSamples = sampleBezier(pts, 160);
          drawPolyline(ctx, plot, bezierSamples, {
            color: "#f57c00",
            width: 2.5,
          });
        }

        // 5. Draw B-Spline Curve
        if (showBSpline) {
          const bsplineSamples = sampleBSpline(pts, p, knots, 35);
          drawPolyline(ctx, plot, bsplineSamples, {
            color: "#00997b",
            width: 2.8,
          });
        }

        // 6. Draw Control Points & Handles
        pts.forEach(([x, y], idx) => {
          const isDragged = idx === activePointIndex;
          const ptColor = isDragged
            ? "#3daee9"
            : idx === 0 || idx === n
              ? "#232629"
              : "#626b73";

          drawPoint(ctx, plot, x, y, {
            color: ptColor,
            filled: true,
            radius: isDragged ? 7 : 5,
            width: 2,
          });

          // Label
          ctx.fillStyle = isDragged ? "#1d72b8" : theme.ink;
          ctx.font = isDragged
            ? "bold 12px ui-sans-serif, system-ui, sans-serif"
            : "11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(`P${idx}`, plot.toScreenX(x) + 8, plot.toScreenY(y) - 8);
        });
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        let nearest: number | null = null;
        let minDist = 22;

        pointsRef.current.forEach(([x, y], idx) => {
          const dist = Math.hypot(
            plot.toScreenX(x) - px,
            plot.toScreenY(y) - py,
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = idx;
          }
        });

        dragIndexRef.current = nearest;
        if (nearest !== null) {
          setActivePointIndex(nearest);
          return true;
        }
        return false;
      },
      onLeftMove(event, plot) {
        const idx = dragIndexRef.current;
        if (idx === null) return;
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;

        const nextX =
          Math.round(plot.toWorldX(event.clientX - rect.left) * 100) / 100;
        const nextY =
          Math.round(plot.toWorldY(event.clientY - rect.top) * 100) / 100;

        const prev = pointsRef.current;
        const nextPts = prev.map((pt, i): Point2 =>
          i === idx ? [nextX, nextY] : pt,
        );

        pointsRef.current = nextPts;
        if (mode === "global_vs_local") {
          setPointsGlobal(nextPts);
        } else {
          setPointsOscillation(nextPts);
        }
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [
      mode,
      pointsGlobal,
      pointsOscillation,
      baselinePoints,
      knots,
      baselineKnots,
      showBezier,
      showBSpline,
      showDisplacementField,
      showGhostBaseline,
      activePointIndex,
    ],
  );

  return (
    <AutoMath>
      <div className="bezier-global-local-root">
        <ExpandableDemo id="bezier-global-vs-local">
          <KdeWindowShell
            title="Bézier 全局控制力与多项式次数局限性分析器"
            eyebrow="BREEZE WORKSPACE · GLOBAL VS LOCAL CONTROL"
            mark="B"
            modeTag={`Bézier ${currentDegree}次 · B-Spline ${bsplineDegree}次`}
          >
            <div className="flex flex-col gap-3 p-3">
              {/* Mode Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--kde-border,#bec5cc)]/60 pb-2">
                <KdeTabs
                  options={MODE_OPTIONS}
                  value={mode}
                  onChange={(m) => {
                    setMode(m);
                    setActivePointIndex(null);
                  }}
                  variant="pill"
                  size="sm"
                />

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bgl-legend-item">
                      <span className="bgl-legend-dot bg-[#f57c00]" />
                      Bézier ({currentDegree} 次)
                    </span>
                    <span className="bgl-legend-item">
                      <span className="bgl-legend-dot bg-[#00997b]" />
                      B-Spline (3 次)
                    </span>
                  </div>

                  <KdeButton
                    variant="default"
                    size="xs"
                    onClick={handleResetPerturbation}
                    title="重置控制点至初始基准"
                  >
                    ↺ 重置位置
                  </KdeButton>
                </div>
              </div>

              {/* Mode Description */}
              {mode === "global_vs_local" ? (
                <KdeMessageBar variant="info">
                  <strong>全局支撑与局部控制对比实验</strong>
                  ：拖动任意控制点 $\mathbf P_k$（例如 $\mathbf P_2$），观察橙色
                  5 次 Bézier 曲线与绿色 3 次 B-Spline 曲线的形变差异。Bernstein
                  基函数全域 $t \in (0, 1)$ 非零导致整条 Bézier 曲线 100%
                  蠕动；而 B-Spline 仅在局部有限 Knot Span 内响应。
                </KdeMessageBar>
              ) : (
                <KdeMessageBar variant="warning">
                  <strong>多点控制与次数解耦对比</strong>
                  ：切换不同预设观察控制点增多（6~8点）时，高阶 Bézier
                  曲线多项式次数被迫升至 5~7
                  次，导致全域大凸包钝化与局部塑形困难；而固定 3 次的 B-Spline
                  始终保持敏锐的局部贴合与可控性。
                </KdeMessageBar>
              )}

              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--kde-control-radius,0.35rem)] bg-[var(--kde-panel,#eff0f1)]/50 p-2 text-xs">
                {mode === "global_vs_local" ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <KdeSwitch
                      checked={showDisplacementField}
                      onChange={setShowDisplacementField}
                      label="扰动位移场 $\Delta \mathbf C$"
                      size="sm"
                    />
                    <KdeSwitch
                      checked={showGhostBaseline}
                      onChange={setShowGhostBaseline}
                      label="初始基准虚线"
                      size="sm"
                    />
                    <KdeSwitch
                      checked={showBezier}
                      onChange={setShowBezier}
                      label="Bézier 曲线"
                      size="sm"
                    />
                    <KdeSwitch
                      checked={showBSpline}
                      onChange={setShowBSpline}
                      label="B-Spline 曲线"
                      size="sm"
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <PresetSelector
                      options={PRESET_OPTIONS}
                      value={oscillationPreset}
                      onChange={handlePresetChange}
                      label="折线形态预设:"
                      size="xs"
                    />
                    <div className="flex items-center gap-3">
                      <KdeSwitch
                        checked={showBezier}
                        onChange={setShowBezier}
                        label="Bézier 曲线"
                        size="sm"
                      />
                      <KdeSwitch
                        checked={showBSpline}
                        onChange={setShowBSpline}
                        label="B-Spline 曲线"
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Main Layout: Canvas + Telemetry Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                {/* Canvas Viewport (Span 2) */}
                <div className="lg:col-span-2 flex flex-col h-full min-h-0">
                  <div
                    ref={containerRef}
                    className="relative flex-1 min-h-[var(--demo-height,18rem)] overflow-hidden rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border,#bec5cc)] bg-[var(--kde-canvas-bg,#fcfcfd)] bgl-canvas-container"
                  >
                    <canvas
                      ref={canvasRef}
                      className="h-full w-full block cursor-crosshair"
                    />
                    <CanvasToolbar onReset={resetBounds} />
                  </div>
                  <CanvasResizer />
                </div>

                {/* Mathematical Telemetry (Span 1) */}
                <div className="flex flex-col gap-2.5 h-full min-h-0">
                  <KdeCard title="数学与几何遥测">
                    <div className="flex flex-col gap-2 p-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--kde-muted,#626b73)]">
                          当前操作点:
                        </span>
                        <KdeBadge
                          variant={
                            activePointIndex !== null ? "primary" : "neutral"
                          }
                        >
                          {activePointIndex !== null
                            ? `控制点 P${activePointIndex}`
                            : "未选择 (拖拽任意点)"}
                        </KdeBadge>
                      </div>

                      {mode === "global_vs_local" ? (
                        <>
                          <KdeReadout
                            label="Bézier 受扰动影响区间"
                            value={telemetry.bezierAffected}
                            variant="warning"
                          />
                          <KdeReadout
                            label="B-Spline 受扰动影响区间"
                            value={telemetry.bsplineAffected}
                            variant="success"
                          />
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <KdeReadout
                              label="Bézier 最大偏移"
                              value={
                                telemetry.maxBezierDisp > 0.001
                                  ? `${telemetry.maxBezierDisp.toFixed(2)} u`
                                  : "0.00 u"
                              }
                              variant="warning"
                            />
                            <KdeReadout
                              label="B-Spline 最大偏移"
                              value={
                                telemetry.maxBSplineDisp > 0.001
                                  ? `${telemetry.maxBSplineDisp.toFixed(2)} u`
                                  : "0.00 u"
                              }
                              variant="success"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <KdeReadout
                            label="多项式次数对比"
                            value={`Bézier: ${currentDegree} 次 vs B-Spline: 3 次`}
                            variant="accent"
                          />
                          <KdeReadout
                            label="局部凸包紧密度"
                            value="B-Spline 保持局部四边形凸包紧包络"
                            variant="success"
                          />
                          <KdeReadout
                            label="局部塑形响应"
                            value="B-Spline 保持固定 3 次局部敏锐响应"
                            variant="success"
                          />
                        </>
                      )}
                    </div>
                  </KdeCard>

                  <KdeCard title="理论核心结论" className="flex-1">
                    <div className="p-1 text-xs leading-relaxed text-[var(--kde-ink,#232629)]">
                      {mode === "global_vs_local" ? (
                        <p>
                          <strong>全局支撑机理</strong>
                          ：Bernstein 基函数 $B_i^n(t) &gt; 0$ 在开区间 $(0,1)$
                          内处处非零，因此扰动任意 $\mathbf P_i$
                          会导致整个参数域 $t$ 的点全部位移；而 B-Spline 基函数{" "}
                          {"$N_{i,p}(u)$"} 仅在 {"$[u_i, u_{i+p+1})$"}{" "}
                          上非零，实现了精准的
                          <strong>局部可控性（Local Control）</strong>。
                        </p>
                      ) : (
                        <p>
                          <strong>次数解耦机理</strong>：Bézier 曲线的次数 $n$
                          与控制点数 $n+1$ 强行绑定，点数多则次数过高引发
                          <strong>控制力稀释与求值开销上升</strong>
                          ；B-Spline
                          通过插入节点自由增加控制点，同时多项式次数固定为平滑的三次（$p=3$）。
                        </p>
                      )}
                    </div>
                  </KdeCard>
                </div>
              </div>
            </div>
          </KdeWindowShell>
        </ExpandableDemo>
      </div>
    </AutoMath>
  );
}
