import { useEffect, useMemo, useState } from "react";
import {
  bernsteinWeights,
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
import KdeMessageBar from "../framework/KdeMessageBar";
import KdeReadout from "../framework/KdeReadout";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
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
  "#e67e22", // amber
  "#8e44ad", // violet
  "#2980b9", // dark blue
  "#2c3e50", // navy
];

const PRESET_DEGREES: readonly KdeTabOption<string>[] = [
  { id: "2", label: "n=2 (二次)" },
  { id: "3", label: "n=3 (三次)" },
  { id: "5", label: "n=5" },
  { id: "10", label: "n=10" },
  { id: "20", label: "n=20" },
  { id: "30", label: "n=30" },
];

/** 生成均匀分布在 [-3.2, 3.2] 水平线上的基准控制点集 */
function generateBaseControlPoints(n: number): Point2[] {
  const points: Point2[] = [];
  const xMin = -3.2;
  const xMax = 3.2;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = xMin + t * (xMax - xMin);
    // 基准 Y 坐标：呈微弱拱形底线，突出后续扰动
    const y = -1.2 + 0.3 * Math.sin(t * Math.PI);
    points.push([x, y]);
  }
  return points;
}

/** de Casteljau 求值单点 */
function evaluateBezierAt(points: readonly Point2[], t: number): Point2 {
  let current: Point2[] = points.map(([x, y]) => [x, y]);
  while (current.length > 1) {
    const next: Point2[] = [];
    for (let i = 0; i < current.length - 1; i += 1) {
      const x = (1 - t) * current[i][0] + t * current[i + 1][0];
      const y = (1 - t) * current[i][1] + t * current[i + 1][1];
      next.push([x, y]);
    }
    current = next;
  }
  return current[0] ?? [0, 0];
}

export default function BezierWeightDilutionDemo() {
  const [degree, setDegree] = useState<number>(3);
  const defaultTargetIndex = Math.floor(degree / 2);
  const [targetIndex, setTargetIndex] = useState<number>(defaultTargetIndex);
  const [displacementY, setDisplacementY] = useState<number>(2.5);

  // 当阶数改变时，自动将选中的控制点置为中间控制点
  useEffect(() => {
    setTargetIndex(Math.floor(degree / 2));
  }, [degree]);

  // 基准控制点与扰动后控制点
  const basePoints = useMemo(() => generateBaseControlPoints(degree), [degree]);
  const perturbedPoints = useMemo(() => {
    return basePoints.map(([x, y], idx) => {
      if (idx === targetIndex) {
        return [x, y + displacementY] as Point2;
      }
      return [x, y] as Point2;
    });
  }, [basePoints, targetIndex, displacementY]);

  // 理论峰值与实际峰值计算
  const tPeak = targetIndex / degree;
  const weightsAtPeak = useMemo(
    () => bernsteinWeights(degree, tPeak),
    [degree, tPeak],
  );
  const actualPeakWeight = weightsAtPeak[targetIndex] ?? 0;
  const theoreticalCenterPeak = Math.sqrt(2 / (Math.PI * degree));
  const maxDisplacementDelta = actualPeakWeight * displacementY;

  // ---------------------------------------------------------------------------
  // Canvas 1: 左侧 Bernstein 基函数群与 O(1/√n) 衰减包络线
  // ---------------------------------------------------------------------------
  const {
    containerRef: basisContainerRef,
    canvasRef: basisCanvasRef,
    resetBounds: resetBasisBounds,
  } = useCanvas2D(
    {
      initialBounds: { xMin: -0.05, xMax: 1.05, yMin: -0.05, yMax: 1.1 },
      margin: 32,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "t", "B_i(t)");

        // 1. 绘制 ∑ = 1.0 参考虚线
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(0), plot.toScreenY(1));
        ctx.lineTo(plot.toScreenX(1), plot.toScreenY(1));
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = theme.muted;
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText(
          "∑ 权重恒等 = 1.0",
          plot.toScreenX(1) - 4,
          plot.toScreenY(1) - 4,
        );

        // 2. 绘制 O(1/√n) 理论中心峰值参考水平线
        const theoreticalY = Math.min(1.0, theoreticalCenterPeak);
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(0), plot.toScreenY(theoreticalY));
        ctx.lineTo(plot.toScreenX(1), plot.toScreenY(theoreticalY));
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(
          `理论中心峰值 √(2/πn) ≈ ${(theoreticalCenterPeak * 100).toFixed(1)}%`,
          plot.toScreenX(0.02),
          plot.toScreenY(theoreticalY) - 4,
        );

        // 3. 绘制所有基函数曲线
        for (let i = 0; i <= degree; i += 1) {
          const isTarget = i === targetIndex;
          const samples: Point2[] = [];
          const stepCount = 80;
          for (let s = 0; s <= stepCount; s += 1) {
            const t = s / stepCount;
            const w = bernsteinWeights(degree, t)[i];
            samples.push([t, w]);
          }

          const color = isTarget
            ? "#38bdf8"
            : BASIS_PALETTE[i % BASIS_PALETTE.length];
          drawPolyline(ctx, plot, samples, {
            color,
            width: isTarget ? 3.0 : 1.4,
            alpha: isTarget ? 1.0 : 0.45,
          });
        }

        // 4. 标注当前控制点对应基函数的峰值
        const peakScreenX = plot.toScreenX(tPeak);
        const peakScreenY = plot.toScreenY(actualPeakWeight);

        // 垂直参考线
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(peakScreenX, plot.toScreenY(0));
        ctx.lineTo(peakScreenX, peakScreenY);
        ctx.stroke();
        ctx.restore();

        // 峰值亮点
        drawPoint(ctx, plot, tPeak, actualPeakWeight, {
          color: "#38bdf8",
          filled: true,
          radius: 5,
        });

        // 峰值气泡文字（清晰文本，避免画布中渲染生硬伪公式）
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = tPeak > 0.7 ? "right" : "left";
        const textOffsetX = tPeak > 0.7 ? -8 : 8;
        ctx.fillText(
          `B${targetIndex}(t*) = ${(actualPeakWeight * 100).toFixed(1)}%`,
          peakScreenX + textOffsetX,
          peakScreenY - 6,
        );
      },
    },
    [degree, targetIndex, actualPeakWeight, theoreticalCenterPeak, tPeak],
  );

  // ---------------------------------------------------------------------------
  // Canvas 2: 右侧 Bézier 曲线拖拽形变与位移敏感度实测
  // ---------------------------------------------------------------------------
  const {
    containerRef: curveContainerRef,
    canvasRef: curveCanvasRef,
    resetBounds: resetCurveBounds,
  } = useCanvas2D(
    {
      initialBounds: { xMin: -3.8, xMax: 3.8, yMin: -2.2, yMax: 3.2 },
      margin: 32,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "X", "Y");

        // 1. 绘制原曲线 (虚线幽灵轮廓)
        const baseSamples: Point2[] = [];
        const stepCount = 100;
        for (let s = 0; s <= stepCount; s += 1) {
          baseSamples.push(evaluateBezierAt(basePoints, s / stepCount));
        }
        drawPolyline(ctx, plot, baseSamples, {
          color: theme.muted,
          width: 1.5,
          dash: [4, 4],
          alpha: 0.5,
        });

        // 2. 绘制扰动后的新曲线 (实线高亮)
        const perturbedSamples: Point2[] = [];
        for (let s = 0; s <= stepCount; s += 1) {
          perturbedSamples.push(
            evaluateBezierAt(perturbedPoints, s / stepCount),
          );
        }
        drawPolyline(ctx, plot, perturbedSamples, {
          color: "#10b981",
          width: 2.8,
          alpha: 0.95,
        });

        // 3. 绘制控制多边形 (浅色折线)
        drawPolyline(ctx, plot, perturbedPoints, {
          color: theme.border,
          width: 1.2,
          dash: [4, 4],
          alpha: 0.7,
        });

        // 4. 绘制各控制点
        perturbedPoints.forEach(([x, y], idx) => {
          const isTarget = idx === targetIndex;
          drawPoint(ctx, plot, x, y, {
            color: isTarget ? "#38bdf8" : theme.muted,
            filled: true,
            radius: isTarget ? 6 : 3.5,
          });

          ctx.fillStyle = isTarget ? "#38bdf8" : theme.muted;
          ctx.font = isTarget
            ? "bold 11px ui-sans-serif, system-ui, sans-serif"
            : "9px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`P${idx}`, plot.toScreenX(x), plot.toScreenY(y) - 8);
        });

        // 5. 绘制位移传导测量线 (在峰值 tPeak 处)
        const ptOrig = evaluateBezierAt(basePoints, tPeak);
        const ptNew = evaluateBezierAt(perturbedPoints, tPeak);

        const screenOrigX = plot.toScreenX(ptOrig[0]);
        const screenOrigY = plot.toScreenY(ptOrig[1]);
        const screenNewX = plot.toScreenX(ptNew[0]);
        const screenNewY = plot.toScreenY(ptNew[1]);

        if (Math.abs(displacementY) > 0.05) {
          // 曲线最大响应位移标注双向箭头
          ctx.save();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(screenOrigX, screenOrigY);
          ctx.lineTo(screenNewX, screenNewY);
          ctx.stroke();

          // 箭头尖端
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(screenNewX, screenNewY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 响应位移文字
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(
            `ΔC_max = ${maxDisplacementDelta.toFixed(2)} (${(actualPeakWeight * 100).toFixed(1)}%)`,
            screenNewX + 10,
            (screenOrigY + screenNewY) / 2,
          );
        }
      },
    },
    [
      basePoints,
      perturbedPoints,
      targetIndex,
      displacementY,
      tPeak,
      maxDisplacementDelta,
      actualPeakWeight,
    ],
  );

  const handleReset = () => {
    setDegree(3);
    setTargetIndex(1);
    setDisplacementY(2.5);
    resetBasisBounds();
    resetCurveBounds();
  };

  const basisViewport = (
    <div className="bezier-basis__viewport">
      <div className="bezier-basis__viewport-header">
        <span>BERNSTEIN BASIS & ENVELOPE</span>
        <span className="bezier-basis__viewport-caption">
          {`$n = ${degree}$ · 峰值 ${(actualPeakWeight * 100).toFixed(1)}%`}
        </span>
      </div>
      <div
        ref={basisContainerRef}
        data-testid="bezier-weight-dilution-basis-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
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
        <span>BEZIER SENSITIVITY MEASUREMENT</span>
        <span className="bezier-basis__viewport-caption font-mono">
          {`$\\Delta \\mathbf{C}_{\\max} = B_{${targetIndex}} \\cdot \\Delta \\mathbf{P}_{${targetIndex}}$`}
        </span>
      </div>
      <div
        ref={curveContainerRef}
        data-testid="bezier-weight-dilution-curve-canvas"
        className="bezier-basis__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
      >
        <CanvasToolbar onReset={resetCurveBounds} />
        <canvas
          ref={curveCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );

  return (
    <AutoMath>
      <ExpandableDemo id="bezier-weight-dilution-demo">
        <KdeWindowShell
          channel="EXP 02"
          title="Bernstein 权重稀释与控制敏感度衰减探针"
          eyebrow="BEZIER STRUCTURAL LIMITS · WEIGHT DILUTION"
          mark="B"
          modeTag="DILUTION"
          testId="bezier-weight-dilution-console"
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
              testId="bezier-weight-dilution-canvas-group"
            />
          }
          controls={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full items-stretch">
              {/* Column 1: 阶数快速预设与微调 */}
              <KdeCard
                title="1. 多项式阶数 (Degree n)"
                badge={<KdeBadge variant="primary">{`n = ${degree}`}</KdeBadge>}
              >
                <div className="flex flex-col gap-3">
                  <KdeTabs<string>
                    options={PRESET_DEGREES}
                    value={String(degree)}
                    onChange={(val) => setDegree(Number(val))}
                    size="xs"
                    variant="pill"
                  />
                  <ParamSlider
                    labelMode="stacked"
                    label="阶数微调"
                    min={2}
                    max={30}
                    step={1}
                    value={degree}
                    onChange={setDegree}
                    display={`$n = ${degree}$ (${degree + 1} 点)`}
                  />
                </div>
              </KdeCard>

              {/* Column 2: 控制点扰动设定 */}
              <KdeCard title="2. 目标扰动设定">
                <div className="flex flex-col gap-3">
                  <ParamSlider
                    labelMode="stacked"
                    label={`目标控制点索引 $k$`}
                    min={0}
                    max={degree}
                    step={1}
                    value={targetIndex}
                    onChange={setTargetIndex}
                    display={`$P_{${targetIndex}}$ ($t = ${(targetIndex / degree).toFixed(2)}$)`}
                  />
                  <ParamSlider
                    labelMode="stacked"
                    label={`施加位移量 $\\Delta P_k$`}
                    min={-3.0}
                    max={3.0}
                    step={0.1}
                    value={displacementY}
                    onChange={setDisplacementY}
                    display={`$\\Delta P = ${displacementY.toFixed(2)}$`}
                  />
                  <KdeButton variant="default" size="xs" onClick={handleReset}>
                    ↺ 重置参数与视口
                  </KdeButton>
                </div>
              </KdeCard>

              {/* Column 3: 理论衰减与权重指标 */}
              <KdeCard
                title="3. 理论衰减指标"
                badge={<KdeBadge variant="primary">ASYMPTOTIC</KdeBadge>}
                variant="highlight"
              >
                <div className="space-y-2 text-xs text-[var(--kde-ink)]">
                  <KdeReadout
                    label={`选定控制点 $P_{${targetIndex}}$ 最大权重`}
                    value={`${(actualPeakWeight * 100).toFixed(1)}%`}
                    variant="accent"
                    dense
                  />
                  <KdeReadout
                    label="理论中心渐近峰值 $\\sqrt{2/(\\pi n)}$"
                    value={`≈ ${(theoreticalCenterPeak * 100).toFixed(1)}%`}
                    variant="warning"
                    dense
                  />
                  <div className="border-t border-[var(--kde-border)]/50 pt-1 text-[10px] text-[var(--kde-muted)]">
                    {`当 $n$ 从 $2$ 升至 $30$ 时，最大话语权从 $50.0\\%$ 跌落至 ${(actualPeakWeight * 100).toFixed(1)}%！`}
                  </div>
                </div>
              </KdeCard>

              {/* Column 4: 塑形控制力评价 */}
              <KdeMessageBar
                variant={
                  actualPeakWeight >= 0.35
                    ? "success"
                    : actualPeakWeight >= 0.18
                      ? "warning"
                      : "danger"
                }
                mode="card"
                title={
                  actualPeakWeight >= 0.35
                    ? "🟢 强力控制区（拉拽灵敏）"
                    : actualPeakWeight >= 0.18
                      ? "🟡 中度钝化区（局部模糊）"
                      : "🔴 严重稀释区（极度迟钝）"
                }
                className="h-full"
              >
                <div className="space-y-1.5 text-xs leading-relaxed text-[var(--kde-ink)]">
                  <p>
                    {`施加位移 $\\Delta \\mathbf{P}_{${targetIndex}} = ${displacementY.toFixed(2)}$，产生位移 `}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {`$\\Delta \\mathbf{C}_{\\max} = ${maxDisplacementDelta.toFixed(2)}$`}
                    </strong>
                    {`（传导效率 ${(actualPeakWeight * 100).toFixed(1)}%）。`}
                  </p>
                  <p className="border-t border-[var(--kde-border)]/50 pt-1 text-[10px] text-[var(--kde-muted)]">
                    {actualPeakWeight >= 0.35
                      ? "低阶多项式集中近半权重，拉动控制点有立竿见影的局部塑形反应。"
                      : actualPeakWeight >= 0.18
                        ? "多项式次数上升导致权重被瓜分，需拉动较大距离才能产生形变。"
                        : "数十个控制点导致权重被极其严重摊薄，局部可塑性彻底丧失！"}
                  </p>
                </div>
              </KdeMessageBar>
            </div>
          }
        />
      </ExpandableDemo>
    </AutoMath>
  );
}
