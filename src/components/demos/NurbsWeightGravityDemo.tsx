import { useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateNurbs,
  nurbsBasisAll,
  sampleNurbs,
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
import KdeCard from "../framework/KdeCard";
import KdeReadout from "../framework/KdeReadout";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./NurbsWeightGravityDemo.css";
import "./BezierSplineWorkspace.css";

const BASIS_COLORS = [
  "#3daee9", // R0: Blue
  "#27ae60", // R1: Green
  "#f67400", // R2: Orange
];

type PresetKey =
  "standard" | "arc90" | "arc120" | "gravity-high" | "gravity-zero";

interface PresetConfig {
  label: string;
  desc: string;
  points: Point2[];
  weights: [number, number, number];
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  isArc?: boolean;
  arcRadius?: number;
  arcStartAngle?: number;
  arcEndAngle?: number;
}

const PRESETS: Record<PresetKey, PresetConfig> = {
  standard: {
    label: "二次 B-Spline (w₁ = 1)",
    desc: "所有权重等权退化为标准多项式抛物线",
    points: [
      [-1.5, -0.6],
      [0, 1.8],
      [1.5, -0.6],
    ],
    weights: [1, 1, 1],
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -1.2, yMax: 2.4 },
  },
  arc90: {
    label: "90° 四分之一圆弧",
    desc: "w₁ = 1/√2 ≈ 0.7071，精确匹配单位圆弧",
    points: [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    weights: [1, Math.SQRT1_2, 1],
    bounds: { xMin: -0.2, xMax: 1.4, yMin: -0.2, yMax: 1.4 },
    isArc: true,
    arcRadius: 1,
    arcStartAngle: 0,
    arcEndAngle: Math.PI / 2,
  },
  arc120: {
    label: "120° 圆弧 (w₁ = 0.5)",
    desc: "w₁ = cos(60°) = 0.5，切线交点外推至 1/cos(60°) = 2",
    points: [
      [0.5, -Math.sqrt(3) / 2],
      [2, 0],
      [0.5, Math.sqrt(3) / 2],
    ],
    weights: [1, 0.5, 1],
    bounds: { xMin: -0.2, xMax: 2.3, yMin: -1.4, yMax: 1.4 },
    isArc: true,
    arcRadius: 1,
    arcStartAngle: -Math.PI / 3,
    arcEndAngle: Math.PI / 3,
  },
  "gravity-high": {
    label: "强引力拉扯 (w₁ = 4.0)",
    desc: "中间控制点引力极强，曲线高度贴近 P₁",
    points: [
      [-1.5, -0.6],
      [0, 1.8],
      [1.5, -0.6],
    ],
    weights: [1, 4.0, 1],
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -1.2, yMax: 2.4 },
  },
  "gravity-zero": {
    label: "零引力退化 (w₁ = 0.0)",
    desc: "中间控制点权重为 0，曲线退化为连接 P₀ 与 P₂ 的弦直线",
    points: [
      [-1.5, -0.6],
      [0, 1.8],
      [1.5, -0.6],
    ],
    weights: [1, 0.0, 1],
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -1.2, yMax: 2.4 },
  },
};

const PRESET_OPTIONS: PresetOption<PresetKey>[] = [
  {
    id: "standard",
    label: PRESETS.standard.label,
    description: PRESETS.standard.desc,
  },
  { id: "arc90", label: PRESETS.arc90.label, description: PRESETS.arc90.desc },
  {
    id: "arc120",
    label: PRESETS.arc120.label,
    description: PRESETS.arc120.desc,
  },
  {
    id: "gravity-high",
    label: PRESETS["gravity-high"].label,
    description: PRESETS["gravity-high"].desc,
  },
  {
    id: "gravity-zero",
    label: PRESETS["gravity-zero"].label,
    description: PRESETS["gravity-zero"].desc,
  },
];

const DEGREE = 2;
const CLAMPED_KNOTS = [0, 0, 0, 1, 1, 1];

interface NurbsBasisCanvasProps {
  weights: readonly number[];
  uParam: number;
}

function NurbsBasisCanvas({ weights, uParam }: NurbsBasisCanvasProps) {
  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: { xMin: 0, xMax: 1, yMin: -0.05, yMax: 1.15 },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "u", "R");

        // 1. Partition of Unity 参考基准线: y = 1.00
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
        ctx.fillText(
          "∑ Rᵢ = 1.00",
          plot.toScreenX(1) - 4,
          plot.toScreenY(1) - 4,
        );

        // 2. 绘制 3 条有理基函数曲线 R_{0,2}, R_{1,2}, R_{2,2}
        const sampleCount = 120;
        for (let i = 0; i < 3; i += 1) {
          const polyline: Point2[] = [];
          for (let s = 0; s <= sampleCount; s += 1) {
            const u = s / sampleCount;
            const { rationalWeights } = nurbsBasisAll(
              DEGREE,
              u,
              CLAMPED_KNOTS,
              weights,
            );
            polyline.push([u, rationalWeights[i] ?? 0]);
          }
          drawPolyline(ctx, plot, polyline, {
            color: BASIS_COLORS[i],
            width: 2.2,
            alpha: 0.95,
          });
        }

        // 3. 当前参数 u 的指示竖线与采样圆点
        const { rationalWeights: currentWeights } = nurbsBasisAll(
          DEGREE,
          uParam,
          CLAMPED_KNOTS,
          weights,
        );

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plot.toScreenX(uParam), plot.toScreenY(-0.05));
        ctx.lineTo(plot.toScreenX(uParam), plot.toScreenY(1.1));
        ctx.stroke();
        ctx.restore();

        currentWeights.forEach((weight, i) => {
          drawPoint(ctx, plot, uParam, weight, {
            color: BASIS_COLORS[i],
            filled: true,
            radius: 4.5,
          });
        });

        // 4. 显示图例
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "left";
        const legendItems = [
          {
            label: `R₀(u): ${(currentWeights[0] ?? 0).toFixed(2)}`,
            color: BASIS_COLORS[0],
          },
          {
            label: `R₁(u): ${(currentWeights[1] ?? 0).toFixed(2)}`,
            color: BASIS_COLORS[1],
          },
          {
            label: `R₂(u): ${(currentWeights[2] ?? 0).toFixed(2)}`,
            color: BASIS_COLORS[2],
          },
        ];
        legendItems.forEach((item, idx) => {
          ctx.fillStyle = item.color;
          ctx.fillText(
            item.label,
            plot.toScreenX(0.04) + idx * 80,
            plot.toScreenY(1.08),
          );
        });
      },
    },
    [weights, uParam],
  );

  return (
    <div
      className="nurbs-weight__viewport"
      data-testid="nurbs-weight-basis-viewport"
    >
      <div className="nurbs-weight__viewport-header">
        <span>有理基函数谱系</span>
        <span className="nurbs-weight__viewport-caption">R_i,p(u)</span>
      </div>
      <div
        ref={containerRef}
        data-testid="nurbs-weight-basis-canvas"
        className="nurbs-weight__canvas relative flex-1 min-h-[var(--demo-height,14rem)] h-full w-full overflow-hidden"
      >
        <CanvasToolbar onReset={resetBounds} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
      </div>
    </div>
  );
}

export default function NurbsWeightGravityDemo() {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("standard");
  const [points, setPoints] = useState<Point2[]>(() =>
    PRESETS.standard.points.map((p) => [...p]),
  );
  const [w1, setW1] = useState(1.0);
  const [w0] = useState(1.0);
  const [w2] = useState(1.0);
  const [uParam, setUParam] = useState(0.5);

  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;

  const weights = useMemo<[number, number, number]>(
    () => [w0, w1, w2],
    [w0, w1, w2],
  );

  // 曲线求值
  const curvePoints = useMemo(
    () => sampleNurbs(points, weights, DEGREE, CLAMPED_KNOTS, 64),
    [points, weights],
  );

  const currentUPoint = useMemo(
    () => evaluateNurbs(points, weights, DEGREE, uParam, CLAMPED_KNOTS),
    [points, weights, uParam],
  );

  const midpointC = useMemo(
    () => evaluateNurbs(points, weights, DEGREE, 0.5, CLAMPED_KNOTS),
    [points, weights],
  );

  // 弦中点 M = (P0 + P2) / 2
  const chordMidpoint = useMemo<Point2>(() => {
    const p0 = points[0] ?? [0, 0];
    const p2 = points[2] ?? [0, 0];
    return [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
  }, [points]);

  // 切换预设
  const handleSelectPreset = (key: PresetKey) => {
    setSelectedPreset(key);
    const p = PRESETS[key];
    setPoints(p.points.map((pt) => [...pt]));
    setW1(p.weights[1]);
  };

  const { containerRef, canvasRef, setBounds, resetBounds } = useCanvas2D(
    {
      initialBounds: PRESETS[selectedPreset].bounds,
      margin: 36,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme, "x", "y");

        // 1. 若为圆弧预设，绘制真实的完美参考圆弧（虚线对比）
        const presetConf = PRESETS[selectedPreset];
        if (presetConf.isArc && presetConf.arcRadius !== undefined) {
          const r = presetConf.arcRadius;
          const startA = presetConf.arcStartAngle ?? 0;
          const endA = presetConf.arcEndAngle ?? Math.PI / 2;
          const arcSamples: Point2[] = [];
          const arcSteps = 60;
          for (let s = 0; s <= arcSteps; s += 1) {
            const ang = startA + (endA - startA) * (s / arcSteps);
            arcSamples.push([r * Math.cos(ang), r * Math.sin(ang)]);
          }
          drawPolyline(ctx, plot, arcSamples, {
            color: theme.border,
            width: 1.5,
            dash: [4, 4],
          });
        }

        // 2. 控制多边形（虚线）
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.muted,
          width: 1.4,
          dash: [5, 5],
        });

        // 3. 弦与中心拉力杠杆可视化 (连接 M 与 P1)
        const p1 = pointsRef.current[1] ?? [0, 0];
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = `${theme.muted}88`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(
          plot.toScreenX(chordMidpoint[0]),
          plot.toScreenY(chordMidpoint[1]),
        );
        ctx.lineTo(plot.toScreenX(p1[0]), plot.toScreenY(p1[1]));
        ctx.stroke();
        ctx.restore();

        // 4. NURBS 曲线
        drawPolyline(ctx, plot, curvePoints, {
          color: theme.accent,
          width: 2.8,
        });

        // 5. 中点 C(0.5) 特别标识
        drawPoint(ctx, plot, midpointC[0], midpointC[1], {
          color: theme.accent,
          filled: true,
          radius: 5,
        });
        ctx.fillStyle = theme.accent;
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(
          "C(0.5)",
          plot.toScreenX(midpointC[0]) + 6,
          plot.toScreenY(midpointC[1]) - 6,
        );

        // 6. 当前参数 u 对应点
        if (Math.abs(uParam - 0.5) > 0.02) {
          drawPoint(ctx, plot, currentUPoint[0], currentUPoint[1], {
            color: "#e74c3c",
            filled: true,
            radius: 4,
          });
          ctx.fillStyle = "#e74c3c";
          ctx.fillText(
            `C(u=${uParam.toFixed(2)})`,
            plot.toScreenX(currentUPoint[0]) + 6,
            plot.toScreenY(currentUPoint[1]) - 6,
          );
        }

        // 7. 控制点绘制与编号
        pointsRef.current.forEach(([x, y], idx) => {
          const isPulled = idx === 1;
          drawPoint(ctx, plot, x, y, {
            color: isPulled ? theme.accent : theme.ink,
            filled: false,
            radius: isPulled ? 6 : 5,
          });
          ctx.fillStyle = theme.ink;
          ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(
            `P${idx}(w=${weights[idx].toFixed(2)})`,
            plot.toScreenX(x) + 8,
            plot.toScreenY(y) - 6,
          );
        });
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        let nearest: number | null = null;
        let distance = 20;
        pointsRef.current.forEach(([x, y], idx) => {
          const dx = plot.toScreenX(x) - px;
          const dy = plot.toScreenY(y) - py;
          const candidate = Math.hypot(dx, dy);
          if (candidate < distance) {
            distance = candidate;
            nearest = idx;
          }
        });
        dragIndexRef.current = nearest;
        return nearest !== null;
      },
      onLeftMove(event, plot) {
        const idx = dragIndexRef.current;
        if (idx === null) return;
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;
        const nextX = plot.toWorldX(event.clientX - rect.left);
        const nextY = plot.toWorldY(event.clientY - rect.top);
        setPoints((curr) =>
          curr.map((p, pIdx) => (pIdx === idx ? [nextX, nextY] : p)),
        );
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [
      curvePoints,
      currentUPoint,
      midpointC,
      chordMidpoint,
      weights,
      uParam,
      selectedPreset,
    ],
  );

  useEffect(() => {
    setBounds(PRESETS[selectedPreset].bounds);
  }, [selectedPreset, setBounds]);

  const handleReset = () => {
    handleSelectPreset(selectedPreset);
    resetBounds();
  };

  // 理论中点拉伸比计算: rho = w1 / (1 + w1) (在 w0=w2=1 时)
  const theoreticalRho = w1 / (1 + w1);

  return (
    <AutoMath>
      <ExpandableDemo id="nurbs-weight-gravity">
        <KdeWindowShell
          title="NURBS · 权重引力场与有理基函数"
          eyebrow="BREEZE WORKSPACE · RATIONAL POLYNOMIALS"
          mark="N"
          modeTag="NURBS"
          testId="nurbs-weight-gravity-demo"
          className="bezier-spline-workspace"
          display={
            <InteractiveViewportGroup
              columns={1}
              className="nurbs-weight__viewport-group flex-1 h-full"
              items={[
                <div
                  key="geom"
                  className="nurbs-weight__viewport flex-1"
                  data-testid="nurbs-weight-geom-viewport"
                >
                  <div className="nurbs-weight__viewport-header">
                    <span>几何空间 · 控制多边形与曲线</span>
                    <span className="nurbs-weight__viewport-caption">
                      C(u) = ∑ R_i,p(u) P_i
                    </span>
                  </div>
                  <div
                    ref={containerRef}
                    data-testid="nurbs-weight-geom-canvas"
                    className="nurbs-weight__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
                  >
                    <CanvasToolbar onReset={handleReset} />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 h-full w-full"
                    />
                    <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
                  </div>
                </div>,
                <NurbsBasisCanvas
                  key="basis"
                  weights={weights}
                  uParam={uParam}
                />,
              ]}
            />
          }
          controls={
            <div className="nurbs-demo__stack">
              <KdeCard title="场景与几何预设" variant="dense">
                <PresetSelector
                  label="预设配置:"
                  options={PRESET_OPTIONS}
                  value={selectedPreset}
                  onChange={handleSelectPreset}
                  size="xs"
                  layout="vertical"
                  testId="nurbs-preset-selector"
                />
              </KdeCard>

              <KdeCard title="引力权重控制" variant="dense">
                <div className="space-y-3">
                  <ParamSlider
                    label="$w_1$"
                    min={0.0}
                    max={5.0}
                    step={0.01}
                    value={w1}
                    onChange={setW1}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={w1.toFixed(2)}
                  />
                  <ParamSlider
                    label="$u$"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={uParam}
                    onChange={setUParam}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={uParam.toFixed(2)}
                  />
                  <p className="text-xs text-muted leading-relaxed">
                    拖动 $w_1$ 观察中点曲线如何沿连杆向 $P_1$
                    引力拉近；支持在画布上直接拖拽控制点。
                  </p>
                </div>
              </KdeCard>

              <KdeCard title="中点引力代数读数" variant="dense">
                <div className="space-y-2">
                  <div className="nurbs-demo__readout-row">
                    <span>{"引力杠杆比 $\\rho = \\frac{w_1}{1+w_1}$:"}</span>
                    <span className="nurbs-demo__readout-val">
                      {(theoreticalRho * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="nurbs-demo__readout-row">
                    <span>中点基函数 $R_1(0.5)$:</span>
                    <span className="nurbs-demo__readout-val">
                      {theoreticalRho.toFixed(3)}
                    </span>
                  </div>
                  <div className="nurbs-demo__readout-row">
                    <span>端点基函数 $R_0(0.5)=R_2(0.5)$:</span>
                    <span className="nurbs-demo__readout-val">
                      {((1 - theoreticalRho) / 2).toFixed(3)}
                    </span>
                  </div>
                  <KdeReadout
                    label="曲线中点坐标 C(0.5)"
                    value={`(${midpointC[0].toFixed(2)}, ${midpointC[1].toFixed(2)})`}
                  />
                </div>
              </KdeCard>
            </div>
          }
        />
      </ExpandableDemo>
    </AutoMath>
  );
}
