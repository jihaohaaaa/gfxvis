import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useCanvas2D } from "../framework/useCanvas2D";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import CapsuleTabs from "../framework/CapsuleTabs";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector from "../framework/PresetSelector";
import {
  drawAdaptiveAxes,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";

interface MatrixPreset {
  name: string;
  a: number;
  b: number;
  c: number;
  d: number;
  desc: string;
}

const PRESETS: Record<string, MatrixPreset> = {
  general: {
    name: "一般矩阵 (拉伸+旋转)",
    a: 1.5,
    b: 0.8,
    c: 0.4,
    d: 1.2,
    desc: "将单位圆变换为倾斜椭圆，奇异值 σ₁ ≈ 1.95, σ₂ ≈ 0.76",
  },
  shear: {
    name: "剪切矩阵 (不可对角化但可 SVD)",
    a: 1.0,
    b: 1.2,
    c: 0.0,
    d: 1.0,
    desc: "代数不可对角化，但 SVD 仍能完美将其分解为正交旋转与主轴拉伸",
  },
  singular: {
    name: "奇异矩阵 (Rank 1 降维压缩)",
    a: 1.2,
    b: 0.6,
    c: 0.8,
    d: 0.4,
    desc: "列线性相关 (det=0)，σ₂=0，单位圆被完全压扁为一条 1D 直线段",
  },
  symmetric: {
    name: "对称正定矩阵 (U = V)",
    a: 1.6,
    b: 0.5,
    c: 0.5,
    d: 1.0,
    desc: "实对称矩阵的 SVD 与特征值分解重合，右奇异向量与左奇异向量同向",
  },
  rotation: {
    name: "纯旋转矩阵 (σ₁ = σ₂ = 1)",
    a: 0.6,
    b: -0.8,
    c: 0.8,
    d: 0.6,
    desc: "保持所有向量长度不变，奇异值恒等于 1，单位圆保持为标准圆",
  },
};

type StepId = "0" | "1" | "2" | "3";

const STEPS: Array<{ id: StepId; label: string; stepVal: number }> = [
  { id: "0", label: "0. 输入单位圆 (基底 V)", stepVal: 0 },
  { id: "1", label: "1. 旋转对齐 (Vᵀ)", stepVal: 1 },
  { id: "2", label: "2. 轴向缩放 (Σ)", stepVal: 2 },
  { id: "3", label: "3. 旋转输出 (U)", stepVal: 3 },
];

interface SvdResult {
  sigma1: number;
  sigma2: number;
  v1: [number, number];
  v2: [number, number];
  u1: [number, number];
  u2: [number, number];
  thetaV: number;
  thetaU: number;
  detA: number;
  conditionNumber: number;
}

function compute2DSvd(a: number, b: number, c: number, d: number): SvdResult {
  const detA = a * d - b * c;
  const p = a * a + c * c;
  const q = a * b + c * d;
  const r = b * b + d * d;

  const tr = p + r;
  const diff = p - r;
  const disc = Math.sqrt(Math.max(0, diff * diff + 4 * q * q));

  const lambda1 = Math.max(0, (tr + disc) / 2);
  const lambda2 = Math.max(0, (tr - disc) / 2);

  const sigma1 = Math.sqrt(lambda1);
  const sigma2 = Math.sqrt(lambda2);

  const thetaV = 0.5 * Math.atan2(2 * q, diff);
  let v1: [number, number] = [Math.cos(thetaV), Math.sin(thetaV)];
  let v2: [number, number] = [-Math.sin(thetaV), Math.cos(thetaV)];

  const v1Check = p * v1[0] + q * v1[1];
  const lambdaCheck = lambda1 * v1[0];
  if (Math.abs(v1Check - lambdaCheck) > 0.1 && Math.abs(q) > 1e-5) {
    const temp = v1;
    v1 = v2;
    v2 = [-temp[0], -temp[1]];
  }

  const u1: [number, number] =
    sigma1 > 1e-6
      ? [(a * v1[0] + b * v1[1]) / sigma1, (c * v1[0] + d * v1[1]) / sigma1]
      : [1, 0];

  const u2: [number, number] =
    sigma2 > 1e-6
      ? [(a * v2[0] + b * v2[1]) / sigma2, (c * v2[0] + d * v2[1]) / sigma2]
      : [-u1[1], u1[0]];

  const thetaU = Math.atan2(u1[1], u1[0]);
  const conditionNumber = sigma2 > 1e-6 ? sigma1 / sigma2 : Infinity;

  return {
    sigma1,
    sigma2,
    v1,
    v2,
    u1,
    u2,
    thetaV,
    thetaU,
    detA,
    conditionNumber,
  };
}

export default function SvdDemo({ height }: { height?: string }) {
  const [matrix, setMatrix] = useState({ a: 1.5, b: 0.8, c: 0.4, d: 1.2 });
  const [presetKey, setPresetKey] = useState("general");
  const [stageProgress, setStageProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [probeAngle, setProbeAngle] = useState(Math.PI / 4);

  const svd = useMemo(() => {
    return compute2DSvd(matrix.a, matrix.b, matrix.c, matrix.d);
  }, [matrix]);

  const stateRef = useRef({
    matrix,
    stageProgress,
    probeAngle,
    svd,
  });

  useEffect(() => {
    stateRef.current = { matrix, stageProgress, probeAngle, svd };
  }, [matrix, stageProgress, probeAngle, svd]);

  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setStageProgress((prev) => {
        const next = prev + dt * 0.8;
        if (next >= 3) {
          setIsPlaying(false);
          return 3;
        }
        return next;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handlePresetChange = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setPresetKey(key);
    setMatrix({ a: p.a, b: p.b, c: p.c, d: p.d });
  };

  const handleCustomParam = (k: "a" | "b" | "c" | "d", v: number) => {
    setPresetKey("custom");
    setMatrix((prev) => ({ ...prev, [k]: v }));
  };

  const initialBounds: Bounds2 = useMemo(() => {
    const maxVal = Math.max(2.6, svd.sigma1 * 1.3);
    return { xMin: -maxVal, xMax: maxVal, yMin: -maxVal, yMax: maxVal };
  }, [svd.sigma1]);

  const getTransformAtProgress = useCallback(
    (
      t: number,
      curSvd: SvdResult,
    ): ((x: number, y: number) => [number, number]) => {
      const { thetaV, thetaU, sigma1, sigma2 } = curSvd;

      return (x: number, y: number): [number, number] => {
        let curX = x;
        let curY = y;

        // Stage 1: V^T (rotate by -thetaV)
        const t1 = Math.max(0, Math.min(1, t));
        if (t1 > 0) {
          const angle1 = -thetaV * t1;
          const cos1 = Math.cos(angle1);
          const sin1 = Math.sin(angle1);
          const nx = cos1 * curX - sin1 * curY;
          const ny = sin1 * curX + cos1 * curY;
          curX = nx;
          curY = ny;
        }

        // Stage 2: Sigma (stretch x by sigma1, y by sigma2)
        const t2 = Math.max(0, Math.min(1, t - 1));
        if (t2 > 0) {
          const s1 = 1 + (sigma1 - 1) * t2;
          const s2 = 1 + (sigma2 - 1) * t2;
          curX *= s1;
          curY *= s2;
        }

        // Stage 3: U (rotate by thetaU)
        const t3 = Math.max(0, Math.min(1, t - 2));
        if (t3 > 0) {
          const angle3 = thetaU * t3;
          const cos3 = Math.cos(angle3);
          const sin3 = Math.sin(angle3);
          const nx = cos3 * curX - sin3 * curY;
          const ny = sin3 * curX + cos3 * curY;
          curX = nx;
          curY = ny;
        }

        return [curX, curY];
      };
    },
    [],
  );

  const { containerRef, canvasRef, redraw, resetBounds } = useCanvas2D({
    initialBounds,
    equalScale: true,
    draw: (ctx, plot, theme) => {
      const {
        stageProgress: curProgress,
        probeAngle: curAngle,
        svd: curSvd,
      } = stateRef.current;

      drawAdaptiveAxes(ctx, plot, theme, "x", "y");

      const transform = getTransformAtProgress(curProgress, curSvd);

      // Transformed grid
      ctx.save();
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;

      const gridSize = 3;
      const step = 0.5;
      for (let gx = -gridSize; gx <= gridSize; gx += step) {
        ctx.beginPath();
        for (let gy = -gridSize; gy <= gridSize; gy += 0.1) {
          const [tx, ty] = transform(gx, gy);
          const sx = plot.toScreenX(tx);
          const sy = plot.toScreenY(ty);
          if (gy === -gridSize) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      for (let gy = -gridSize; gy <= gridSize; gy += step) {
        ctx.beginPath();
        for (let gx = -gridSize; gx <= gridSize; gx += 0.1) {
          const [tx, ty] = transform(gx, gy);
          const sx = plot.toScreenX(tx);
          const sy = plot.toScreenY(ty);
          if (gx === -gridSize) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Original unit circle
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
        const sx = plot.toScreenX(Math.cos(a));
        const sy = plot.toScreenY(Math.sin(a));
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();

      // Transformed curve/ellipse
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.04) {
        const [tx, ty] = transform(Math.cos(a), Math.sin(a));
        const sx = plot.toScreenX(tx);
        const sy = plot.toScreenY(ty);
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const drawArrow = (
        toW: [number, number],
        color: string,
        width: number,
        label?: string,
      ) => {
        const x1 = plot.toScreenX(0);
        const y1 = plot.toScreenY(0);
        const x2 = plot.toScreenX(toW[0]);
        const y2 = plot.toScreenY(toW[1]);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const headLen = Math.min(10, len * 0.3);
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();

        if (label) {
          ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = color;
          ctx.fillText(
            label,
            x2 + 8 * Math.cos(angle),
            y2 + 8 * Math.sin(angle),
          );
        }
        ctx.restore();
      };

      const { v1, v2 } = curSvd;
      const tv1 = transform(v1[0], v1[1]);
      const tv2 = transform(v2[0], v2[1]);

      drawArrow(tv1, "#ef4444", 3, curProgress >= 2 ? "σ₁u₁" : "v₁");
      drawArrow(tv2, "#10b981", 3, curProgress >= 2 ? "σ₂u₂" : "v₂");

      const probeX = Math.cos(curAngle);
      const probeY = Math.sin(curAngle);
      const tProbe = transform(probeX, probeY);

      drawArrow(tProbe, "#8b5cf6", 2.5, "x(t)");

      const psx = plot.toScreenX(probeX);
      const psy = plot.toScreenY(probeY);
      ctx.save();
      ctx.fillStyle = "#8b5cf6";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(psx, psy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
  });

  useEffect(() => {
    redraw();
  }, [stageProgress, probeAngle, matrix, redraw]);

  const currentStepId =
    stageProgress < 0.5
      ? "0"
      : stageProgress < 1.5
        ? "1"
        : stageProgress < 2.5
          ? "2"
          : "3";

  const probeX = Math.cos(probeAngle);
  const probeY = Math.sin(probeAngle);
  const curTransform = useMemo(
    () => getTransformAtProgress(stageProgress, svd),
    [stageProgress, svd, getTransformAtProgress],
  );
  const [currentProbeX, currentProbeY] = useMemo(
    () => curTransform(probeX, probeY),
    [curTransform, probeX, probeY],
  );
  const currentProbeLen = Math.hypot(currentProbeX, currentProbeY);
  const currentProbeAngle = Math.atan2(currentProbeY, currentProbeX);

  const finalProbeX = matrix.a * probeX + matrix.b * probeY;
  const finalProbeY = matrix.c * probeX + matrix.d * probeY;
  const finalProbeLen = Math.hypot(finalProbeX, finalProbeY);
  const finalProbeAngle = Math.atan2(finalProbeY, finalProbeX);

  return (
    <ExpandableDemo id="singular-value-decomposition" height={height}>
      <div className="space-y-4">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PresetSelector
            label="预设矩阵:"
            options={PRESETS}
            value={presetKey}
            onChange={(key) => {
              handlePresetChange(key);
              redraw();
            }}
          />
        </div>

        {/* Step Capsule Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={STEPS}
            value={currentStepId}
            onChange={(id) => {
              setIsPlaying(false);
              const found = STEPS.find((s) => s.id === id);
              if (found) {
                setStageProgress(found.stepVal);
                redraw();
              }
            }}
          />
        </div>

        {/* Canvas Section */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>

        {/* Stage Progress Slider & Controls */}
        <div className="rounded-lg border border-border bg-surface-hover/50 p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                if (stageProgress >= 3) setStageProgress(0);
                setIsPlaying(!isPlaying);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2"
            >
              {isPlaying ? "⏸ 暂停动画" : "▶ 连续播放三阶段"}
            </button>
            <span className="text-xs text-muted font-mono">
              变换进度: {stageProgress.toFixed(2)} / 3.00
            </span>
          </div>

          <ParamSlider
            label="连续变换进度 (t: 0 ➔ 1 ➔ 2 ➔ 3)"
            value={stageProgress}
            min={0}
            max={3}
            step={0.02}
            onChange={(val) => {
              setIsPlaying(false);
              setStageProgress(val);
              redraw();
            }}
          />
          <ParamSlider
            label="探测向量角度 θ"
            value={probeAngle}
            min={0}
            max={Math.PI * 2}
            step={0.02}
            onChange={(val) => {
              setProbeAngle(val);
              redraw();
            }}
          />

          {/* Probe Vector Live Transformation Card */}
          <div className="mt-1 rounded-md border border-purple-500/30 bg-surface/80 p-3 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-1.5">
              <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
                探测向量实时变换追踪（紫色向量 <InlineMath tex="\mathbf{x}" />
                ）：
              </span>
              <span className="text-[11px] text-muted font-mono">
                输入角{" "}
                <InlineMath
                  tex={`\\theta = ${probeAngle.toFixed(3)}\\text{ rad} = ${((probeAngle * 180) / Math.PI).toFixed(3)}^\\circ`}
                />
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
              {/* Box 1: Input Vector */}
              <div className="p-2 rounded bg-surface/90 border border-border/60">
                <div className="font-semibold text-foreground mb-1">
                  1. 原输入向量{" "}
                  <InlineMath tex="\mathbf{x} \in \text{单位圆}" />
                </div>
                <div className="my-1 text-ink text-center">
                  <InlineMath
                    tex={`\\mathbf{x} = \\begin{pmatrix} \\cos \\theta \\\\ \\sin \\theta \\end{pmatrix} = \\begin{pmatrix} ${probeX.toFixed(3)} \\\\ ${probeY.toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
                <div className="text-muted text-[10px] mt-1 text-center font-mono">
                  模长 ‖x‖ = 1.000 · 方向角{" "}
                  <InlineMath
                    tex={`\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(${probeY.toFixed(3)}, ${probeX.toFixed(3)}) = ${probeAngle.toFixed(3)}\\text{ rad} = ${((probeAngle * 180) / Math.PI).toFixed(3)}^\\circ`}
                  />
                </div>
              </div>

              {/* Box 2: Current Transient Vector */}
              <div className="p-2 rounded bg-surface/90 border border-purple-500/30">
                <div className="font-semibold text-purple-600 dark:text-purple-400 mb-1">
                  2. 瞬时变换向量{" "}
                  <InlineMath
                    tex={`\\mathbf{x}(t = ${stageProgress.toFixed(2)})`}
                  />
                </div>
                <div className="my-1 text-ink text-center">
                  <InlineMath
                    tex={`\\mathbf{x}(t) = \\begin{pmatrix} ${currentProbeX.toFixed(3)} \\\\ ${currentProbeY.toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
                <div className="text-muted text-[10px] mt-1 text-center font-mono">
                  模长 = {currentProbeLen.toFixed(3)} · 瞬时角{" "}
                  <InlineMath
                    tex={`\\phi(t) = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(${currentProbeY.toFixed(3)}, ${currentProbeX.toFixed(3)}) = ${currentProbeAngle.toFixed(3)}\\text{ rad} = ${((currentProbeAngle * 180) / Math.PI).toFixed(3)}^\\circ`}
                  />
                </div>
              </div>

              {/* Box 3: Final Image Vector */}
              <div className="p-2 rounded bg-surface/90 border border-border/60">
                <div className="font-semibold text-foreground mb-1">
                  3. 最终变换像向量{" "}
                  <InlineMath tex="A\mathbf{x} \in \text{椭圆}" />
                </div>
                <div className="my-1 text-ink text-center">
                  <InlineMath
                    tex={`A\\mathbf{x} = \\begin{pmatrix} ${finalProbeX.toFixed(3)} \\\\ ${finalProbeY.toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
                <div className="text-muted text-[10px] mt-1 text-center font-mono">
                  模长 = {finalProbeLen.toFixed(3)} · 像方向角{" "}
                  <InlineMath
                    tex={`\\phi_{A\\mathbf{x}} = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(${finalProbeY.toFixed(3)}, ${finalProbeX.toFixed(3)}) = ${finalProbeAngle.toFixed(3)}\\text{ rad} = ${((finalProbeAngle * 180) / Math.PI).toFixed(3)}^\\circ`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Numerical SVD Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-surface-hover/50 rounded-lg border border-border text-center">
            <div className="text-xs text-muted">第一奇异值 σ₁ (长半轴)</div>
            <div className="text-base font-bold text-red-500 font-mono mt-1">
              {svd.sigma1.toFixed(3)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">主轴拉伸倍率</div>
          </div>
          <div className="p-3 bg-surface-hover/50 rounded-lg border border-border text-center">
            <div className="text-xs text-muted">第二奇异值 σ₂ (短半轴)</div>
            <div className="text-base font-bold text-emerald-500 font-mono mt-1">
              {svd.sigma2.toFixed(3)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">次轴拉伸倍率</div>
          </div>
          <div className="p-3 bg-surface-hover/50 rounded-lg border border-border text-center">
            <div className="text-xs text-muted">条件数 κ(A) = σ₁ / σ₂</div>
            <div className="text-base font-bold text-amber-500 font-mono mt-1">
              {Number.isFinite(svd.conditionNumber)
                ? svd.conditionNumber.toFixed(3)
                : "∞ (退化奇异)"}
            </div>
            <div className="text-[11px] text-muted mt-0.5">各向异性畸变度</div>
          </div>
          <div className="p-3 bg-surface-hover/50 rounded-lg border border-border text-center">
            <div className="text-xs text-muted">面积缩放 |det(A)| = σ₁σ₂</div>
            <div className="text-base font-bold text-blue-500 font-mono mt-1">
              {Math.abs(svd.detA).toFixed(3)}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              椭圆面积 / 单位圆面积
            </div>
          </div>
        </div>

        {/* Full SVD Matrix Equation Card: A = U Sigma V^T */}
        <div className="rounded-lg border border-border bg-surface-hover/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-xs font-semibold text-foreground">
              实时矩阵数值分解等式：
              <InlineMath tex="A = U \cdot \Sigma \cdot V^\top" />
            </span>
            <span className="text-[11px] text-muted font-mono">
              正交性校验: det(U) ={" "}
              {(svd.u1[0] * svd.u2[1] - svd.u1[1] * svd.u2[0]).toFixed(3)},
              det(V) = 1.000
            </span>
          </div>

          {/* Full Large Equation Display */}
          <div className="overflow-x-auto py-2 flex items-center justify-center text-center">
            <div className="inline-block text-ink text-sm sm:text-base font-medium">
              <InlineMath
                tex={`\\begin{pmatrix} ${matrix.a.toFixed(3)} & ${matrix.b.toFixed(3)} \\\\ ${matrix.c.toFixed(3)} & ${matrix.d.toFixed(3)} \\end{pmatrix} = \\underbrace{\\begin{pmatrix} ${svd.u1[0].toFixed(3)} & ${svd.u2[0].toFixed(3)} \\\\ ${svd.u1[1].toFixed(3)} & ${svd.u2[1].toFixed(3)} \\end{pmatrix}}_{U \\text{ (左奇异矩阵)}} \\cdot \\underbrace{\\begin{pmatrix} ${svd.sigma1.toFixed(3)} & 0.000 \\\\ 0.000 & ${svd.sigma2.toFixed(3)} \\end{pmatrix}}_{\\Sigma \\text{ (奇异值对角阵)}} \\cdot \\underbrace{\\begin{pmatrix} ${svd.v1[0].toFixed(3)} & ${svd.v1[1].toFixed(3)} \\\\ ${svd.v2[0].toFixed(3)} & ${svd.v2[1].toFixed(3)} \\end{pmatrix}}_{V^\\top \\text{ (右奇异基转置)}}`}
              />
            </div>
          </div>

          {/* 3-Column Breakdown Details with Specific Vectors u and v */}
          <div className="grid gap-3 pt-2 border-t border-border/60 text-xs sm:grid-cols-3">
            {/* Column 1: U & u1, u2 */}
            <div className="p-3 rounded-md bg-surface/60 border border-border/50 space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>
                  左奇异矩阵{" "}
                  <InlineMath tex="U = [\mathbf{u}_1, \mathbf{u}_2]" />
                </span>
                <span className="text-[10px] text-blue-500 font-mono">
                  输出正交基 (旋转)
                </span>
              </div>
              <div className="text-ink text-center">
                <InlineMath
                  tex={`U = \\begin{pmatrix} ${svd.u1[0].toFixed(3)} & ${svd.u2[0].toFixed(3)} \\\\ ${svd.u1[1].toFixed(3)} & ${svd.u2[1].toFixed(3)} \\end{pmatrix}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
                <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-red-500 font-bold block mb-0.5">
                    主轴向量 <InlineMath tex="\mathbf{u}_1" />
                  </span>
                  <InlineMath
                    tex={`\\begin{pmatrix} ${svd.u1[0].toFixed(3)} \\\\ ${svd.u1[1].toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-emerald-500 font-bold block mb-0.5">
                    次轴向量 <InlineMath tex="\mathbf{u}_2" />
                  </span>
                  <InlineMath
                    tex={`\\begin{pmatrix} ${svd.u2[0].toFixed(3)} \\\\ ${svd.u2[1].toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                列向量 <InlineMath tex="\mathbf{u}_1, \mathbf{u}_2" />{" "}
                构成输出空间标准正交基，决定椭圆长短主轴朝向（旋转角{" "}
                <InlineMath
                  tex={`\\theta_U = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(${svd.u1[1].toFixed(3)}, ${svd.u1[0].toFixed(3)}) = ${svd.thetaU.toFixed(3)}\\text{ rad} = ${((svd.thetaU * 180) / Math.PI).toFixed(3)}^\\circ`}
                />
                ）。
              </p>
            </div>

            {/* Column 2: Sigma & sigma1, sigma2 */}
            <div className="p-3 rounded-md bg-surface/60 border border-border/50 space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>
                  奇异值对角阵 <InlineMath tex="\Sigma" />
                </span>
                <span className="text-[10px] text-amber-500 font-mono">
                  坐标主轴拉伸
                </span>
              </div>
              <div className="text-ink text-center">
                <InlineMath
                  tex={`\\Sigma = \\begin{pmatrix} ${svd.sigma1.toFixed(3)} & 0.000 \\\\ 0.000 & ${svd.sigma2.toFixed(3)} \\end{pmatrix}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
                <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-red-500 font-bold block mb-0.5">
                    奇异值 <InlineMath tex="\sigma_1" />
                  </span>
                  <span className="font-mono text-red-500 font-bold">
                    {svd.sigma1.toFixed(3)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-emerald-500 font-bold block mb-0.5">
                    奇异值 <InlineMath tex="\sigma_2" />
                  </span>
                  <span className="font-mono text-emerald-500 font-bold">
                    {svd.sigma2.toFixed(3)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                对角元素 <InlineMath tex="\sigma_1 \ge \sigma_2 \ge 0" />{" "}
                表示沿正交主轴的纯拉伸倍率，对应椭圆长短半轴长度。
              </p>
            </div>

            {/* Column 3: V, V^T & v1, v2 */}
            <div className="p-3 rounded-md bg-surface/60 border border-border/50 space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>
                  右奇异矩阵{" "}
                  <InlineMath tex="V = [\mathbf{v}_1, \mathbf{v}_2]" />
                </span>
                <span className="text-[10px] text-purple-500 font-mono">
                  输入对齐基 (旋转)
                </span>
              </div>
              <div className="text-ink text-center">
                <InlineMath
                  tex={`V = \\begin{pmatrix} ${svd.v1[0].toFixed(3)} & ${svd.v2[0].toFixed(3)} \\\\ ${svd.v1[1].toFixed(3)} & ${svd.v2[1].toFixed(3)} \\end{pmatrix}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
                <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-red-500 font-bold block mb-0.5">
                    原像主向 <InlineMath tex="\mathbf{v}_1" />
                  </span>
                  <InlineMath
                    tex={`\\begin{pmatrix} ${svd.v1[0].toFixed(3)} \\\\ ${svd.v1[1].toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-emerald-500 font-bold block mb-0.5">
                    原像次向 <InlineMath tex="\mathbf{v}_2" />
                  </span>
                  <InlineMath
                    tex={`\\begin{pmatrix} ${svd.v2[0].toFixed(3)} \\\\ ${svd.v2[1].toFixed(3)} \\end{pmatrix}`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                输入空间标准正交基（旋转角{" "}
                <InlineMath
                  tex={`\\theta_V = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(${svd.v1[1].toFixed(3)}, ${svd.v1[0].toFixed(3)}) = ${svd.thetaV.toFixed(3)}\\text{ rad} = ${((svd.thetaV * 180) / Math.PI).toFixed(3)}^\\circ`}
                />
                ），在变换中将被直接映射到椭圆主轴。
              </p>
            </div>
          </div>

          {/* Singular Vector Mapping Verification: A v_i = sigma_i u_i */}
          <div className="pt-2 border-t border-border/60">
            <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>
                基底向量映射校验：
                <InlineMath tex="A\mathbf{v}_i = \sigma_i \mathbf{u}_i" />
              </span>
              <span className="text-[11px] text-muted font-mono">
                正交性:{" "}
                <InlineMath tex="\mathbf{v}_1^\top \mathbf{v}_2 = 0.000" />,{" "}
                <InlineMath tex="\mathbf{u}_1^\top \mathbf{u}_2 = 0.000" />
              </span>
            </div>
            <div className="grid gap-2 grid-cols-1 text-xs">
              <div className="p-2.5 rounded bg-surface/80 border border-red-500/30 flex items-center justify-center text-center overflow-x-auto">
                <InlineMath
                  tex={`A\\mathbf{v}_1 = \\begin{pmatrix} ${matrix.a.toFixed(3)} & ${matrix.b.toFixed(3)} \\\\ ${matrix.c.toFixed(3)} & ${matrix.d.toFixed(3)} \\end{pmatrix} \\begin{pmatrix} ${svd.v1[0].toFixed(3)} \\\\ ${svd.v1[1].toFixed(3)} \\end{pmatrix} = \\begin{pmatrix} ${(matrix.a * svd.v1[0] + matrix.b * svd.v1[1]).toFixed(3)} \\\\ ${(matrix.c * svd.v1[0] + matrix.d * svd.v1[1]).toFixed(3)} \\end{pmatrix}, \\quad \\sigma_1 \\mathbf{u}_1 = ${svd.sigma1.toFixed(3)} \\begin{pmatrix} ${svd.u1[0].toFixed(3)} \\\\ ${svd.u1[1].toFixed(3)} \\end{pmatrix} = \\begin{pmatrix} ${(svd.sigma1 * svd.u1[0]).toFixed(3)} \\\\ ${(svd.sigma1 * svd.u1[1]).toFixed(3)} \\end{pmatrix}`}
                />
              </div>
              <div className="p-2.5 rounded bg-surface/80 border border-emerald-500/30 flex items-center justify-center text-center overflow-x-auto">
                <InlineMath
                  tex={`A\\mathbf{v}_2 = \\begin{pmatrix} ${matrix.a.toFixed(3)} & ${matrix.b.toFixed(3)} \\\\ ${matrix.c.toFixed(3)} & ${matrix.d.toFixed(3)} \\end{pmatrix} \\begin{pmatrix} ${svd.v2[0].toFixed(3)} \\\\ ${svd.v2[1].toFixed(3)} \\end{pmatrix} = \\begin{pmatrix} ${(matrix.a * svd.v2[0] + matrix.b * svd.v2[1]).toFixed(3)} \\\\ ${(matrix.c * svd.v2[0] + matrix.d * svd.v2[1]).toFixed(3)} \\end{pmatrix}, \\quad \\sigma_2 \\mathbf{u}_2 = ${svd.sigma2.toFixed(3)} \\begin{pmatrix} ${svd.u2[0].toFixed(3)} \\\\ ${svd.u2[1].toFixed(3)} \\end{pmatrix} = \\begin{pmatrix} ${(svd.sigma2 * svd.u2[0]).toFixed(3)} \\\\ ${(svd.sigma2 * svd.u2[1]).toFixed(3)} \\end{pmatrix}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Parameters */}
        <div className="rounded-lg border border-border bg-surface-hover/50 p-3.5 flex flex-col gap-3">
          <div className="text-xs font-semibold text-foreground">
            自定义 2×2 变换矩阵参数：
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ParamSlider
              label="a₁₁"
              value={matrix.a}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(v) => {
                handleCustomParam("a", v);
                redraw();
              }}
            />
            <ParamSlider
              label="a₁₂"
              value={matrix.b}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(v) => {
                handleCustomParam("b", v);
                redraw();
              }}
            />
            <ParamSlider
              label="a₂₁"
              value={matrix.c}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(v) => {
                handleCustomParam("c", v);
                redraw();
              }}
            />
            <ParamSlider
              label="a₂₂"
              value={matrix.d}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(v) => {
                handleCustomParam("d", v);
                redraw();
              }}
            />
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
