import { useState, useRef, useEffect, useMemo } from "react";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import ParamSlider from "../framework/ParamSlider";
import InlineMath from "../framework/InlineMath";
import { useCanvas2D } from "../framework/useCanvas2D";
import {
  drawAdaptiveAxes,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import {
  type Mat2,
  mat2Vec,
  mat2Mul,
  transpose2,
  determinant2,
  lu2x2,
  qr2x2,
  polar2x2,
  svd2x2,
  mix,
} from "@math";

type DecompTab = "lu" | "qr" | "polar" | "svd";

const PRESETS: PresetOption[] = [
  {
    value: "general_transform",
    label: "一般仿射变换 (剪切+伸缩+旋转)",
    description:
      "A = [[1.5, 0.8], [0.4, 1.2]]，包含全面的剪切、非对称缩放与刚体旋转",
  },
  {
    value: "pure_rotation_45",
    label: "纯刚体旋转 (45°)",
    description:
      "A = [[0.71, -0.71], [0.71, 0.71]]，正交矩阵，极分解与 QR 中的形变分量退化为单位矩阵",
  },
  {
    value: "symmetric_spd",
    label: "实对称正定 (纯主轴拉伸)",
    description:
      "A = [[1.8, 0.6], [0.6, 1.2]]，无旋转剪切，极分解正交项为 I，特征值等于奇异值",
  },
  {
    value: "anisotropic_shear",
    label: "水平强剪切 (Shear)",
    description:
      "A = [[1.0, 1.2], [0.0, 1.0]]，下三角 L 为单位阵，LU 直接显现上三角纯剪切",
  },
  {
    value: "near_singular",
    label: "接近奇异退化 (病态矩阵)",
    description:
      "A = [[1.5, 1.4], [1.5, 1.6]]，列向量接近共线，最小奇异值趋近于 0",
  },
];

function fmt(n: number, d = 2): string {
  const v = Math.abs(n) < 1e-6 ? 0 : n;
  return v.toFixed(d);
}

function interpolateMat2(m1: Mat2, m2: Mat2, t: number): Mat2 {
  return [
    mix(m1[0], m2[0], t),
    mix(m1[1], m2[1], t),
    mix(m1[2], m2[2], t),
    mix(m1[3], m2[3], t),
  ];
}

export default function MatrixDecompositionsDemo({
  height = "560px",
}: {
  height?: string;
}) {
  const [activeTab, setActiveTab] = useState<DecompTab>("polar");
  const [matrix, setMatrix] = useState<Mat2>([1.5, 0.4, 0.8, 1.2]); // [a, c, b, d]
  const [presetKey, setPresetKey] = useState<string>("general_transform");
  const [progress, setProgress] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCircle, setShowCircle] = useState<boolean>(true);

  const lu = useMemo(() => lu2x2(matrix), [matrix]);
  const qr = useMemo(() => qr2x2(matrix), [matrix]);
  const polar = useMemo(() => polar2x2(matrix), [matrix]);
  const svd = useMemo(() => svd2x2(matrix), [matrix]);
  const detA = useMemo(() => determinant2(matrix), [matrix]);
  const condNum = useMemo(() => {
    return svd.sigma2 > 1e-6 ? svd.sigma1 / svd.sigma2 : Infinity;
  }, [svd]);

  const currentTransform = useMemo<Mat2>(() => {
    const I: Mat2 = [1, 0, 0, 1];
    const t = Math.max(0, Math.min(1, progress));

    if (activeTab === "lu") {
      if (t <= 0.5) {
        return interpolateMat2(I, lu.U, t * 2);
      } else {
        const currentL = interpolateMat2(I, lu.L, (t - 0.5) * 2);
        return mat2Mul(currentL, lu.U);
      }
    } else if (activeTab === "qr") {
      if (t <= 0.5) {
        return interpolateMat2(I, qr.R, t * 2);
      } else {
        const currentQ = interpolateMat2(I, qr.Q, (t - 0.5) * 2);
        return mat2Mul(currentQ, qr.R);
      }
    } else if (activeTab === "polar") {
      if (t <= 0.5) {
        return interpolateMat2(I, polar.P, t * 2);
      } else {
        const currentQ = interpolateMat2(I, polar.Q, (t - 0.5) * 2);
        return mat2Mul(currentQ, polar.P);
      }
    } else {
      const VT = transpose2(svd.V);
      const Sigma: Mat2 = [svd.sigma1, 0, 0, svd.sigma2];
      if (t <= 0.333) {
        const subT = t / 0.333;
        return interpolateMat2(I, VT, subT);
      } else if (t <= 0.666) {
        const subT = (t - 0.333) / 0.333;
        const currentSigma = interpolateMat2(I, Sigma, subT);
        return mat2Mul(currentSigma, VT);
      } else {
        const subT = (t - 0.666) / 0.334;
        const currentU = interpolateMat2(I, svd.U, subT);
        return mat2Mul(currentU, mat2Mul(Sigma, VT));
      }
    }
  }, [activeTab, progress, matrix, lu, qr, polar, svd]);

  const stateRef = useRef({
    currentTransform,
    showGrid,
    showCircle,
  });

  useEffect(() => {
    stateRef.current = { currentTransform, showGrid, showCircle };
  }, [currentTransform, showGrid, showCircle]);

  const handlePreset = (val: string) => {
    setPresetKey(val);
    setProgress(1.0);
    setIsPlaying(false);
    if (val === "general_transform") {
      setMatrix([1.5, 0.4, 0.8, 1.2]);
    } else if (val === "pure_rotation_45") {
      const c = Math.cos(Math.PI / 4);
      const s = Math.sin(Math.PI / 4);
      setMatrix([c, s, -s, c]);
    } else if (val === "symmetric_spd") {
      setMatrix([1.8, 0.6, 0.6, 1.2]);
    } else if (val === "anisotropic_shear") {
      setMatrix([1.0, 0.0, 1.2, 1.0]);
    } else if (val === "near_singular") {
      setMatrix([1.5, 1.5, 1.4, 1.6]);
    }
  };

  const reqRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      return;
    }
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setProgress((prev) => {
        const next = prev + dt * 0.35;
        return next > 1 ? 0 : next;
      });
      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying]);

  const initialBounds: Bounds2 = useMemo(
    () => ({
      xMin: -3.0,
      xMax: 3.0,
      yMin: -2.6,
      yMax: 2.6,
    }),
    [],
  );

  const { containerRef, canvasRef, redraw, resetBounds } = useCanvas2D({
    initialBounds,
    equalScale: true,
    draw: (ctx, plot, theme) => {
      const {
        currentTransform: M,
        showGrid: sGrid,
        showCircle: sCircle,
      } = stateRef.current;
      drawAdaptiveAxes(ctx, plot, theme, "x", "y");

      // 1. Draw Transformed Grid
      if (sGrid) {
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        const step = 0.5;
        const range = 2.5;

        for (let y = -range; y <= range + 1e-4; y += step) {
          const pStart = mat2Vec(M, { x: -range, y });
          const pEnd = mat2Vec(M, { x: range, y });
          const sx1 = plot.toScreenX(pStart.x);
          const sy1 = plot.toScreenY(pStart.y);
          const sx2 = plot.toScreenX(pEnd.x);
          const sy2 = plot.toScreenY(pEnd.y);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }

        for (let x = -range; x <= range + 1e-4; x += step) {
          const pStart = mat2Vec(M, { x, y: -range });
          const pEnd = mat2Vec(M, { x, y: range });
          const sx1 = plot.toScreenX(pStart.x);
          const sy1 = plot.toScreenY(pStart.y);
          const sx2 = plot.toScreenX(pEnd.x);
          const sy2 = plot.toScreenY(pEnd.y);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Draw Transformed Unit Circle -> Ellipse
      if (sCircle) {
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const numSegments = 90;
        for (let i = 0; i <= numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          const sx = plot.toScreenX(Math.cos(theta));
          const sy = plot.toScreenY(Math.sin(theta));
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
        ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          const pt = mat2Vec(M, { x: Math.cos(theta), y: Math.sin(theta) });
          const sx = plot.toScreenX(pt.x);
          const sy = plot.toScreenY(pt.y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw Transformed Basis Vectors
      const v1 = mat2Vec(M, { x: 1, y: 0 });
      const v2 = mat2Vec(M, { x: 0, y: 1 });

      const drawArrow = (
        toX: number,
        toY: number,
        color: string,
        label: string,
      ) => {
        const x1 = plot.toScreenX(0);
        const y1 = plot.toScreenY(0);
        const x2 = plot.toScreenX(toX);
        const y2 = plot.toScreenY(toY);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
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

        ctx.font = "bold 12px sans-serif";
        ctx.fillText(label, x2 + 6, y2 - 6);
        ctx.restore();
      };

      drawArrow(v1.x, v1.y, "#3b82f6", "a₁");
      drawArrow(v2.x, v2.y, "#ef4444", "a₂");
    },
  });

  useEffect(() => {
    redraw();
  }, [currentTransform, showGrid, showCircle, redraw]);

  return (
    <ExpandableDemo id="matrix-decompositions-demo" height={height}>
      <div id="matrix-decompositions-demo" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex rounded-lg bg-surface-hover p-1">
            <button
              onClick={() => {
                setActiveTab("lu");
                setProgress(1.0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "lu"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              1. LU 分解 (高斯消元)
            </button>
            <button
              onClick={() => {
                setActiveTab("qr");
                setProgress(1.0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "qr"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              2. QR 分解 (单边正交)
            </button>
            <button
              onClick={() => {
                setActiveTab("polar");
                setProgress(1.0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "polar"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              3. 极分解 (旋转-应变分离)
            </button>
            <button
              onClick={() => {
                setActiveTab("svd");
                setProgress(1.0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "svd"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              4. SVD 奇异值分解 (终极正交)
            </button>
          </div>

          <PresetSelector
            options={PRESETS}
            value={presetKey}
            onChange={handlePreset}
            className="w-56"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-2">
            <div
              ref={containerRef}
              className="relative h-[var(--demo-height,24rem)] w-full overflow-hidden rounded-xl border border-border bg-surface-hover/30"
            >
              <canvas ref={canvasRef} className="h-full w-full touch-none" />
              <CanvasToolbar
                onReset={() => {
                  resetBounds();
                  handlePreset("general_transform");
                }}
              >
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    showGrid
                      ? "bg-accent/20 text-accent font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  网格
                </button>
                <button
                  onClick={() => setShowCircle(!showCircle)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    showCircle
                      ? "bg-accent/20 text-accent font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  椭圆
                </button>
              </CanvasToolbar>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  几何变换分步时间轴 <InlineMath tex="t \in [0, 1]" />
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground shadow-xs hover:bg-accent/90"
                  >
                    {isPlaying ? "⏸ 暂停" : "▶ 播放分步"}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setProgress(progress < 0.5 ? 0.5 : 1.0);
                    }}
                    className="rounded bg-surface-hover px-2 py-1 text-[11px] text-muted hover:text-foreground"
                  >
                    跳至下一阶段
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={progress}
                onChange={(e) => {
                  setIsPlaying(false);
                  setProgress(parseFloat(e.target.value));
                }}
                className="w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono">
                <span>0.0: 初始标准正交基 I</span>
                {activeTab === "svd" ? (
                  <>
                    <span>0.33: Vᵀ 旋转</span>
                    <span>0.66: Σ 对角拉伸</span>
                    <span>1.0: U 终态旋转</span>
                  </>
                ) : (
                  <>
                    <span>
                      0.5:{" "}
                      {activeTab === "lu"
                        ? "U (上三角剪切+缩放)"
                        : activeTab === "qr"
                          ? "R (上三角拉伸)"
                          : "P (纯主轴对称拉伸)"}
                    </span>
                    <span>1.0: 最终矩阵 A</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3 rounded-xl border border-border bg-surface p-4 text-xs">
            <div className="border-b border-border/60 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  待分解矩阵{" "}
                  <InlineMath tex="A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix}" />
                </span>
                <span className="font-mono text-[11px] text-muted">
                  det(A) = {fmt(detA)} | κ(A) = {fmt(condNum, 1)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ParamSlider
                  label="a₁₁"
                  value={matrix[0]}
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  onChange={(v) => {
                    setMatrix([v, matrix[1], matrix[2], matrix[3]]);
                    setPresetKey("custom");
                  }}
                />
                <ParamSlider
                  label="a₁₂"
                  value={matrix[2]}
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  onChange={(v) => {
                    setMatrix([matrix[0], matrix[1], v, matrix[3]]);
                    setPresetKey("custom");
                  }}
                />
                <ParamSlider
                  label="a₂₁"
                  value={matrix[1]}
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  onChange={(v) => {
                    setMatrix([matrix[0], v, matrix[2], matrix[3]]);
                    setPresetKey("custom");
                  }}
                />
                <ParamSlider
                  label="a₂₂"
                  value={matrix[3]}
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  onChange={(v) => {
                    setMatrix([matrix[0], matrix[1], matrix[2], v]);
                    setPresetKey("custom");
                  }}
                />
              </div>
            </div>

            {activeTab === "lu" && (
              <div className="space-y-2.5">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-amber-500 font-bold">
                    <span>高斯消元三角分解：A = L · U</span>
                    <span className="text-[10px] text-muted">非正交消元</span>
                  </div>
                  <div className="flex flex-col gap-1 justify-center py-1">
                    <InlineMath
                      tex={`L = \\begin{pmatrix} 1 & 0 \\\\ ${fmt(lu.L[1])} & 1 \\end{pmatrix},\\quad U = \\begin{pmatrix} ${fmt(lu.U[0])} & ${fmt(lu.U[2])} \\\\ 0 & ${fmt(lu.U[3])} \\end{pmatrix}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted font-sans pt-1">
                    💡 <strong>几何直观</strong>：矩阵 <InlineMath tex="U" />{" "}
                    负责主轴缩放与水平剪切；单位下三角矩阵{" "}
                    <InlineMath tex="L" /> 记录消元过程的逆向垂直剪切。
                  </p>
                </div>
              </div>
            )}

            {activeTab === "qr" && (
              <div className="space-y-2.5">
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-blue-500 font-bold">
                    <span>单边正交三角分解：A = Q · R</span>
                    <span className="text-[10px] text-muted">QᵀQ = I</span>
                  </div>
                  <div className="flex flex-col gap-1 justify-center py-1">
                    <InlineMath
                      tex={`Q = \\begin{pmatrix} ${fmt(qr.Q[0])} & ${fmt(qr.Q[2])} \\\\ ${fmt(qr.Q[1])} & ${fmt(qr.Q[3])} \\end{pmatrix},\\quad R = \\begin{pmatrix} ${fmt(qr.R[0])} & ${fmt(qr.R[2])} \\\\ 0 & ${fmt(qr.R[3])} \\end{pmatrix}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted font-sans pt-1">
                    💡 <strong>几何直观</strong>：矩阵 <InlineMath tex="R" />{" "}
                    负责在原始坐标轴上剪切拉伸，
                    <InlineMath tex="Q" />{" "}
                    是纯正交旋转/反射矩阵，将剪切后的基底刚体旋转到最终位置。
                  </p>
                </div>
              </div>
            )}

            {activeTab === "polar" && (
              <div className="space-y-2.5">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-emerald-500 font-bold">
                    <span>右极分解：A = Q · P</span>
                    <span className="text-[10px] text-muted">
                      旋转 × 对称拉伸
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 justify-center py-1">
                    <InlineMath
                      tex={`Q = \\begin{pmatrix} ${fmt(polar.Q[0])} & ${fmt(polar.Q[2])} \\\\ ${fmt(polar.Q[1])} & ${fmt(polar.Q[3])} \\end{pmatrix},\\quad P = \\begin{pmatrix} ${fmt(polar.P[0])} & ${fmt(polar.P[2])} \\\\ ${fmt(polar.P[1])} & ${fmt(polar.P[3])} \\end{pmatrix}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted font-sans pt-1">
                    💡 <strong>物理与图形学灵魂</strong>：
                    <InlineMath tex="P = \sqrt{A^\top A}" />{" "}
                    为半正定对称矩阵，代表纯拉伸形变；
                    <InlineMath tex="Q = U V^\top" /> 为正交矩阵，代表刚体旋转。
                  </p>
                </div>
              </div>
            )}

            {activeTab === "svd" && (
              <div className="space-y-2.5">
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-purple-500 font-bold">
                    <span>奇异值分解：A = U · Σ · Vᵀ</span>
                    <span className="text-[10px] text-muted">
                      双边完全正交对角化
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 justify-center py-1 text-[10px]">
                    <InlineMath
                      tex={`\\Sigma = \\begin{pmatrix} ${fmt(svd.sigma1)} & 0 \\\\ 0 & ${fmt(svd.sigma2)} \\end{pmatrix}`}
                    />
                    <InlineMath
                      tex={`U = \\begin{pmatrix} ${fmt(svd.u1.x)} & ${fmt(svd.u2.x)} \\\\ ${fmt(svd.u1.y)} & ${fmt(svd.u2.y)} \\end{pmatrix},\\quad V = \\begin{pmatrix} ${fmt(svd.v1.x)} & ${fmt(svd.v2.x)} \\\\ ${fmt(svd.v1.y)} & ${fmt(svd.v2.y)} \\end{pmatrix}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted font-sans pt-1">
                    💡 <strong>终极正交统领</strong>：通过在输入空间 (
                    <InlineMath tex="V" />) 与输出空间 (<InlineMath tex="U" />)
                    同时寻找标准正交基，将所有剪切分量完全归零，只留下纯对角缩放{" "}
                    <InlineMath tex="\Sigma" />。
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-surface-hover/60 p-2.5 text-[11px] text-muted space-y-1 border border-border/50">
              <div className="font-semibold text-foreground">
                🧭 矩阵分解演进逻辑：
              </div>
              <div>
                • <strong>LU</strong>：代数高斯消元，计算量{" "}
                <InlineMath tex="\frac{2}{3}n^3" />
                ，速度最快。
              </div>
              <div>
                • <strong>QR</strong>：单边 Gram-Schmidt
                正交化，数值稳定求解最小二乘。
              </div>
              <div>
                • <strong>极分解</strong>：高维极坐标{" "}
                <InlineMath tex="A = QP" />
                ，物理形变分析与点云配准基石。
              </div>
              <div>
                • <strong>SVD</strong>
                ：双边正交终极对角化，主轴几何大一统与最佳低秩逼近。
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
