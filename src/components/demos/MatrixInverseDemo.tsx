import React, { useState, useRef, useEffect } from "react";
import ExpandableDemo from "../framework/ExpandableDemo";
import CapsuleTabs from "../framework/CapsuleTabs";
import ParamSlider from "../framework/ParamSlider";
import InlineMath from "../framework/InlineMath";
import CanvasToolbar from "../framework/CanvasToolbar";
import { useCanvas2D } from "../framework/useCanvas2D";
import {
  drawDragHandle,
  readThemeColors,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";

type DemoMode = "transform" | "normal";
type PresetKey = "rot45" | "shear" | "scale" | "singular";

const DEMO_MODES: Array<{ id: DemoMode; label: string }> = [
  { id: "transform", label: "2D 空间变换与 A⁻¹ 撤销还原" },
  { id: "normal", label: "图形学法线变换：直接 M vs 逆转置 (M⁻¹)ᵀ" },
];

const BOUNDS_2D: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };

interface TransformPreset {
  name: string;
  matrix: [[number, number], [number, number]];
  desc: string;
}

const PRESETS: Record<PresetKey, TransformPreset> = {
  rot45: {
    name: "45° 旋转 (正交矩阵)",
    matrix: [
      [Math.SQRT1_2, -Math.SQRT1_2],
      [Math.SQRT1_2, Math.SQRT1_2],
    ],
    desc: "刚体旋转变换，行列式 det(A) = 1.00，逆矩阵 A⁻¹ = Aᵀ（旋转 -45° 直接还原）。",
  },
  shear: {
    name: "水平剪切 (Shear)",
    matrix: [
      [1.0, 1.2],
      [0.0, 1.0],
    ],
    desc: "保面积的仿射剪切，行列式 det(A) = 1.00，逆矩阵向相反方向剪切即可复原。",
  },
  scale: {
    name: "非均匀缩放 (Stretch)",
    matrix: [
      [1.5, 0.0],
      [0.0, 0.8],
    ],
    desc: "沿坐标轴不同比例拉伸，det(A) = 1.20，逆矩阵对角元素取倒数 [1/1.5, 1/0.8] 还原。",
  },
  singular: {
    name: "奇异矩阵 (不可逆降维)",
    matrix: [
      [1.2, 0.6],
      [0.8, 0.4],
    ],
    desc: "两列完全线性相关，整个二维平面被压扁到一条直线上，det(A) = 0，零空间丢失无法求逆！",
  },
};

function fmt(v: number): string {
  const s = v.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function drawPixelSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 2,
  dash: number[] = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawPixelPoint(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  radius = 6,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------
// Sub-view 1: 2D Transformation & Inverse Undo
// -------------------------------------------------------------
function ViewTransform({ showAxes }: { showAxes: boolean }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("rot45");
  const [progress, setProgress] = useState<number>(1.0);
  const [vVec, setVVec] = useState<{ x: number; y: number }>({
    x: 1.5,
    y: 1.0,
  });

  const activePreset = PRESETS[presetKey];
  const A = activePreset.matrix;
  const detA = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const isSingular = Math.abs(detA) < 1e-5;

  // Inverse matrix A^-1
  const invA = isSingular
    ? null
    : [
        [A[1][1] / detA, -A[0][1] / detA],
        [-A[1][0] / detA, A[0][0] / detA],
      ];

  // Current interpolated transformation matrix M(t)
  let curM: [[number, number], [number, number]];
  if (progress <= 1.0) {
    const t = progress;
    curM = [
      [1 + t * (A[0][0] - 1), t * A[0][1]],
      [t * A[1][0], 1 + t * (A[1][1] - 1)],
    ];
  } else {
    const t = progress - 1.0;
    if (isSingular) {
      curM = A;
    } else if (invA) {
      curM = [
        [A[0][0] + t * (1 - A[0][0]), A[0][1] + t * (0 - A[0][1])],
        [A[1][0] + t * (0 - A[1][0]), A[1][1] + t * (1 - A[1][1])],
      ];
    } else {
      curM = A;
    }
  }

  // Transformed vector v' = curM * v
  const curV = {
    x: curM[0][0] * vVec.x + curM[0][1] * vVec.y,
    y: curM[1][0] * vVec.x + curM[1][1] * vVec.y,
  };

  const stateRef = useRef({
    showAxes,
    curM,
    vVec,
    curV,
    isSingular,
    progress,
  });

  useEffect(() => {
    stateRef.current = {
      showAxes,
      curM,
      vVec,
      curV,
      isSingular,
      progress,
    };
  }, [showAxes, curM, vVec, curV, isSingular, progress]);

  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS_2D,
    onHover(e) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const st = stateRef.current;
      const center = { x: canvas.width / 2, y: canvas.height / 2 };
      const scale = Math.min(canvas.width, canvas.height) / 7.5;
      const pCurV = {
        x: center.x + st.curV.x * scale,
        y: center.y - st.curV.y * scale,
      };
      const hit = Math.hypot(px - pCurV.x, py - pCurV.y) <= 24;
      isHoveredRef.current = hit;
      if (isDraggingRef.current) {
        canvas.style.cursor = "grabbing";
      } else if (hit) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "";
      }
    },
    onLeftDown(e) {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const st = stateRef.current;
      const center = { x: canvas.width / 2, y: canvas.height / 2 };
      const scale = Math.min(canvas.width, canvas.height) / 7.5;
      const pCurV = {
        x: center.x + st.curV.x * scale,
        y: center.y - st.curV.y * scale,
      };
      if (Math.hypot(px - pCurV.x, py - pCurV.y) <= 24) {
        isDraggingRef.current = true;
        isHoveredRef.current = true;
        canvas.style.cursor = "grabbing";
        updateVectorFromMouse(px, py, canvas.width, canvas.height);
        return true;
      }
      return false;
    },
    onLeftMove(e) {
      if (!isDraggingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      updateVectorFromMouse(
        e.clientX - rect.left,
        e.clientY - rect.top,
        canvas.width,
        canvas.height,
      );
    },
    onLeftUp() {
      isDraggingRef.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = isHoveredRef.current ? "grab" : "";
      }
    },
    draw(ctx) {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);
      const theme = readThemeColors();
      const st = stateRef.current;

      const center = { x: width / 2, y: height / 2 };
      const scale = Math.min(width, height) / 7.5;

      const toCanvas = (wx: number, wy: number) => ({
        x: center.x + wx * scale,
        y: center.y - wy * scale,
      });

      // 1. Reference Coordinate Axes & Standard Grid
      if (st.showAxes) {
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let x = -3; x <= 3; x++) {
          if (x === 0) continue;
          const p = toCanvas(x, 0);
          ctx.beginPath();
          ctx.moveTo(p.x, 0);
          ctx.lineTo(p.x, height);
          ctx.stroke();
        }
        for (let y = -3; y <= 3; y++) {
          if (y === 0) continue;
          const p = toCanvas(0, y);
          ctx.beginPath();
          ctx.moveTo(0, p.y);
          ctx.lineTo(width, p.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, center.y);
        ctx.lineTo(width, center.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x, 0);
        ctx.lineTo(center.x, height);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Deformed/Animated Grid under curM
      ctx.save();
      ctx.strokeStyle = st.isSingular
        ? "rgba(239, 68, 68, 0.4)"
        : "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 1.2;

      for (let i = -3; i <= 3; i++) {
        const pStart1 = toCanvas(
          st.curM[0][0] * i + st.curM[0][1] * -3.5,
          st.curM[1][0] * i + st.curM[1][1] * -3.5,
        );
        const pEnd1 = toCanvas(
          st.curM[0][0] * i + st.curM[0][1] * 3.5,
          st.curM[1][0] * i + st.curM[1][1] * 3.5,
        );
        ctx.beginPath();
        ctx.moveTo(pStart1.x, pStart1.y);
        ctx.lineTo(pEnd1.x, pEnd1.y);
        ctx.stroke();

        const pStart2 = toCanvas(
          st.curM[0][0] * -3.5 + st.curM[0][1] * i,
          st.curM[1][0] * -3.5 + st.curM[1][1] * i,
        );
        const pEnd2 = toCanvas(
          st.curM[0][0] * 3.5 + st.curM[0][1] * i,
          st.curM[1][0] * 3.5 + st.curM[1][1] * i,
        );
        ctx.beginPath();
        ctx.moveTo(pStart2.x, pStart2.y);
        ctx.lineTo(pEnd2.x, pEnd2.y);
        ctx.stroke();
      }
      ctx.restore();

      const pOrigin = toCanvas(0, 0);

      // 3. Basis vectors under current transformation
      const col1 = toCanvas(st.curM[0][0], st.curM[1][0]);
      const col2 = toCanvas(st.curM[0][1], st.curM[1][1]);

      drawPixelSegment(
        ctx,
        pOrigin.x,
        pOrigin.y,
        col1.x,
        col1.y,
        "#ef4444",
        2.5,
      );
      drawPixelPoint(ctx, col1.x, col1.y, "#ef4444", 4);

      drawPixelSegment(
        ctx,
        pOrigin.x,
        pOrigin.y,
        col2.x,
        col2.y,
        "#10b981",
        2.5,
      );
      drawPixelPoint(ctx, col2.x, col2.y, "#10b981", 4);

      // 4. Interactive Vector
      const pOrigV = toCanvas(st.vVec.x, st.vVec.y);
      drawPixelSegment(
        ctx,
        pOrigin.x,
        pOrigin.y,
        pOrigV.x,
        pOrigV.y,
        "rgba(156, 163, 175, 0.6)",
        1.5,
        [3, 3],
      );
      drawPixelPoint(ctx, pOrigV.x, pOrigV.y, "rgba(156, 163, 175, 0.8)", 4);

      const pCurV = toCanvas(st.curV.x, st.curV.y);
      drawPixelSegment(
        ctx,
        pOrigin.x,
        pOrigin.y,
        pCurV.x,
        pCurV.y,
        "#f59e0b",
        3.5,
      );

      drawDragHandle(ctx, pCurV.x, pCurV.y, {
        color: "#f59e0b",
        isHovered: isHoveredRef.current,
        isDragging: isDraggingRef.current,
      });

      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(
        `v' (${st.curV.x.toFixed(2)}, ${st.curV.y.toFixed(2)})`,
        pCurV.x + 10,
        pCurV.y - 8,
      );
      ctx.restore();
    },
  });

  useEffect(() => {
    redraw();
  }, [presetKey, progress, showAxes, vVec, redraw]);

  const updateVectorFromMouse = (
    px: number,
    py: number,
    width: number,
    height: number,
  ) => {
    const scale = Math.min(width, height) / 7.5;
    const center = { x: width / 2, y: height / 2 };
    const wx = (px - center.x) / scale;
    const wy = (center.y - py) / scale;
    setVVec({
      x: Math.max(-3.0, Math.min(3.0, wx)),
      y: Math.max(-3.0, Math.min(3.0, wy)),
    });
  };

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted font-medium">矩阵 A 预设:</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setPresetKey(key);
                setProgress(1.0);
              }}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                presetKey === key
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-hover text-foreground hover:bg-border"
              }`}
            >
              {PRESETS[key].name}
            </button>
          ))}
        </div>

        {/* Quick Undo / Redo Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setProgress(0.0)}
            className="rounded border border-border px-2.5 py-1 hover:bg-surface-hover transition-colors"
          >
            初始网格 I
          </button>
          <button
            onClick={() => setProgress(1.0)}
            className="rounded border border-border px-2.5 py-1 hover:bg-surface-hover transition-colors"
          >
            应用正变换 A
          </button>
          <button
            disabled={isSingular}
            onClick={() => setProgress(2.0)}
            className={`rounded border border-border px-2.5 py-1 transition-colors ${
              isSingular
                ? "opacity-40 cursor-not-allowed"
                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
            }`}
          >
            一键 A⁻¹ 撤销还原
          </button>
        </div>
      </div>

      {/* Progress Timeline Slider */}
      <div className="rounded-lg border border-border bg-surface-hover/30 p-3">
        <ParamSlider
          label={
            <span className="font-medium text-foreground">
              变换时间轴进度 (0 初始 → 1 正变换 A → 2 逆变换 A⁻¹ 还原)：
            </span>
          }
          value={progress}
          min={0.0}
          max={2.0}
          step={0.05}
          onChange={setProgress}
          display={
            progress <= 0.05
              ? "0.00 (初始 I)"
              : progress >= 0.95 && progress <= 1.05
                ? "1.00 (正变换 A)"
                : progress >= 1.95
                  ? "2.00 (逆还原 A⁻¹)"
                  : progress < 1.0
                    ? `t = ${progress.toFixed(2)} (I → A)`
                    : `t = ${progress.toFixed(2)} (A → A⁻¹ 还原)`
          }
        />
      </div>

      {/* 2D Canvas View */}
      <div
        ref={containerRef}
        className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
      >
        <CanvasToolbar onReset={() => setProgress(1.0)} />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
      </div>

      {/* Coordinate & Matrix Breakdown Panel */}
      <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">矩阵 A 与 逆矩阵 A⁻¹</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">正变换 A：</span>
              <InlineMath
                tex={`A = \\begin{pmatrix} ${fmt(A[0][0])} & ${fmt(A[0][1])} \\\\ ${fmt(A[1][0])} & ${fmt(A[1][1])} \\end{pmatrix}`}
              />
              <span className="font-mono text-muted ml-2">
                <InlineMath tex={`\\det(A) = ${fmt(detA)}`} />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted">逆变换 A⁻¹：</span>
              {isSingular ? (
                <span className="font-semibold text-red-500">
                  不存在（矩阵奇异不可逆，信息已塌缩丢失）
                </span>
              ) : (
                <InlineMath
                  tex={`A^{-1} = \\begin{pmatrix} ${fmt(invA![0][0])} & ${fmt(invA![0][1])} \\\\ ${fmt(invA![1][0])} & ${fmt(invA![1][1])} \\end{pmatrix}`}
                />
              )}
            </div>

            <p className="text-[11px] text-muted pt-1 border-t border-border/50">
              {activePreset.desc}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            向量坐标实时跟踪与恒等验证
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">原始向量 v：</span>
              <span className="font-mono">
                <InlineMath
                  tex={`v = (${fmt(vVec.x)},\\, ${fmt(vVec.y)})^\\top`}
                />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">当前映射位置 v'：</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                <InlineMath
                  tex={`v' = (${fmt(curV.x)},\\, ${fmt(curV.y)})^\\top`}
                />
              </span>
            </div>
            <div className="text-[11px] text-muted pt-1 border-t border-border/50 leading-normal">
              {progress >= 1.95 && !isSingular ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ 完美还原：A⁻¹(Av) = I v = ({fmt(vVec.x)}, {fmt(vVec.y)})ᵀ
                </span>
              ) : isSingular ? (
                <span className="text-red-500">
                  ✕ 塌缩不可逆：降维后多个原向量映射到同一点，无法单射还原。
                </span>
              ) : (
                <span>
                  提示：拖动时间轴或点击“一键 A⁻¹
                  撤销还原”观察网格与向量回到原位。
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-view 2: Graphics Normal Transformation vs Tangent
// -------------------------------------------------------------
function ViewNormalTransformation({ showAxes }: { showAxes: boolean }) {
  const [scaleX, setScaleX] = useState<number>(2.0);
  const [scaleY, setScaleY] = useState<number>(0.8);
  const [angleDeg, setAngleDeg] = useState<number>(45);

  const rad = (angleDeg * Math.PI) / 180;
  const p0 = { x: Math.cos(rad), y: Math.sin(rad) };
  const t0 = { x: -Math.sin(rad), y: Math.cos(rad) };
  const n0 = { x: Math.cos(rad), y: Math.sin(rad) };

  // Transformation Matrix M = diag(scaleX, scaleY)
  const pPrime = { x: scaleX * p0.x, y: scaleY * p0.y };

  // Tangent transforms with M: T' = M * T0
  const tPrime = { x: scaleX * t0.x, y: scaleY * t0.y };
  const lenT = Math.hypot(tPrime.x, tPrime.y);
  const tNorm = { x: tPrime.x / lenT, y: tPrime.y / lenT };

  // 1. Naive Normal transformed with M: N_naive' = M * N0
  const nNaive = { x: scaleX * n0.x, y: scaleY * n0.y };
  const lenNNaive = Math.hypot(nNaive.x, nNaive.y);
  const nNaiveNorm = { x: nNaive.x / lenNNaive, y: nNaive.y / lenNNaive };
  const dotNaive = tNorm.x * nNaiveNorm.x + tNorm.y * nNaiveNorm.y;

  // 2. Correct Normal transformed with (M^-1)^T: N_correct' = diag(1/scaleX, 1/scaleY) * N0
  const nCorrect = { x: (1 / scaleX) * n0.x, y: (1 / scaleY) * n0.y };
  const lenNCorrect = Math.hypot(nCorrect.x, nCorrect.y);
  const nCorrectNorm = {
    x: nCorrect.x / lenNCorrect,
    y: nCorrect.y / lenNCorrect,
  };
  const dotCorrect = tNorm.x * nCorrectNorm.x + tNorm.y * nCorrectNorm.y;

  const stateRef = useRef({
    showAxes,
    scaleX,
    scaleY,
    pPrime,
    tNorm,
    nNaiveNorm,
    nCorrectNorm,
  });

  useEffect(() => {
    stateRef.current = {
      showAxes,
      scaleX,
      scaleY,
      pPrime,
      tNorm,
      nNaiveNorm,
      nCorrectNorm,
    };
  }, [showAxes, scaleX, scaleY, pPrime, tNorm, nNaiveNorm, nCorrectNorm]);

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS_2D,
    draw(ctx) {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);
      const theme = readThemeColors();
      const st = stateRef.current;

      const center = { x: width / 2, y: height / 2 };
      const scale = Math.min(width, height) / 7.5;

      const toCanvas = (wx: number, wy: number) => ({
        x: center.x + wx * scale,
        y: center.y - wy * scale,
      });

      // 1. Reference Axes
      if (st.showAxes) {
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(0, center.y);
        ctx.lineTo(width, center.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x, 0);
        ctx.lineTo(center.x, height);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Transformed Ellipse Curve
      ctx.save();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const theta = (i / 120) * Math.PI * 2;
        const ex = st.scaleX * Math.cos(theta);
        const ey = st.scaleY * Math.sin(theta);
        const p = toCanvas(ex, ey);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();

      const pCenter = toCanvas(st.pPrime.x, st.pPrime.y);

      // Tangent vector T' (Blue)
      const pT = toCanvas(
        st.pPrime.x + 1.2 * st.tNorm.x,
        st.pPrime.y + 1.2 * st.tNorm.y,
      );
      drawPixelSegment(ctx, pCenter.x, pCenter.y, pT.x, pT.y, "#3b82f6", 3.0);
      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#3b82f6";
      ctx.fillText(`切线 t' = M t`, pT.x + 8, pT.y - 4);
      ctx.restore();

      // Naive Normal vector N_naive' (Red dashed - Incorrect!)
      const pNNaive = toCanvas(
        st.pPrime.x + 1.2 * st.nNaiveNorm.x,
        st.pPrime.y + 1.2 * st.nNaiveNorm.y,
      );
      drawPixelSegment(
        ctx,
        pCenter.x,
        pCenter.y,
        pNNaive.x,
        pNNaive.y,
        "#ef4444",
        2.5,
        [4, 4],
      );
      drawPixelPoint(ctx, pNNaive.x, pNNaive.y, "#ef4444", 4);
      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.fillText(`错误法线 M n (偏斜失真)`, pNNaive.x + 8, pNNaive.y - 4);
      ctx.restore();

      // Correct Normal vector N_correct' (Green - Correct!)
      const pNCorrect = toCanvas(
        st.pPrime.x + 1.2 * st.nCorrectNorm.x,
        st.pPrime.y + 1.2 * st.nCorrectNorm.y,
      );
      drawPixelSegment(
        ctx,
        pCenter.x,
        pCenter.y,
        pNCorrect.x,
        pNCorrect.y,
        "#10b981",
        3.0,
      );
      drawPixelPoint(ctx, pNCorrect.x, pNCorrect.y, "#10b981", 5);
      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#10b981";
      ctx.fillText(
        `正确法线 (M⁻¹)ᵀ n (垂直)`,
        pNCorrect.x + 8,
        pNCorrect.y - 4,
      );
      ctx.restore();

      // Surface point P'
      drawPixelPoint(ctx, pCenter.x, pCenter.y, "#f59e0b", 6);
    },
  });

  useEffect(() => {
    redraw();
  }, [scaleX, scaleY, angleDeg, showAxes, redraw]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ParamSlider
          label="X 轴缩放因子 s_x"
          value={scaleX}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={setScaleX}
        />
        <ParamSlider
          label="Y 轴缩放因子 s_y"
          value={scaleY}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={setScaleY}
        />
        <ParamSlider
          label="曲面采样点角度 θ"
          value={angleDeg}
          min={0}
          max={360}
          step={5}
          onChange={setAngleDeg}
        />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
      >
        <CanvasToolbar
          onReset={() => {
            setScaleX(2.0);
            setScaleY(0.8);
            setAngleDeg(45);
          }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      {/* Math Comparison Cards */}
      <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            为什么不能用模型矩阵 M 直接变换法线？
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-medium">
              <span>直接变换点积 t' · (M n)：</span>
              <span className="font-mono">
                {dotNaive.toFixed(3)} ≠ 0 (失真)
              </span>
            </div>
            <p className="text-muted leading-relaxed">
              在非均匀缩放下，切线方向被拉伸 $s_x$ 倍，直接乘以 $M$
              会使法线同样沿长轴拉伸，导致法线偏离垂直方向，光照着色彻底错误！
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            法线矩阵的正解：逆转置矩阵 (M⁻¹)ᵀ
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>逆转置点积 t' · ((M⁻¹)ᵀ n)：</span>
              <span className="font-mono">
                {dotCorrect.toFixed(3)} = 0 (严格垂直)
              </span>
            </div>
            <div className="p-2 rounded bg-surface border border-border font-mono text-[11px] overflow-x-auto">
              <InlineMath tex="\mathbf{t}'^\top \mathbf{n}' = (M\mathbf{t})^\top ((M^{-1})^\top \mathbf{n}) = \mathbf{t}^\top (M^\top M^{-\top}) \mathbf{n} = \mathbf{t}^\top \mathbf{n} = 0" />
            </div>
            <p className="text-[11px] text-muted">
              中间的 $M^\top (M^\top)^{-1} = I$ 刚好消去，恒等保证正交性。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatrixInverseDemo({ height }: { height?: string }) {
  const [demoMode, setDemoMode] = useState<DemoMode>("transform");
  const showAxes = true;

  return (
    <ExpandableDemo id="matrix-inverse" height={height}>
      <div className="space-y-4">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={DEMO_MODES}
            value={demoMode}
            onChange={(val) => setDemoMode(val as DemoMode)}
          />
        </div>

        {/* Views */}
        {demoMode === "transform" ? (
          <ViewTransform showAxes={showAxes} />
        ) : (
          <ViewNormalTransformation showAxes={showAxes} />
        )}

        {/* Interaction Hint */}
        <p className="text-xs text-muted">
          {demoMode === "transform"
            ? "提示：拖动时间轴滑块或点击“一键 A⁻¹ 撤销还原”，观察空间网格与向量如何被逆矩阵原路拉回；切换到奇异矩阵观察塌缩失效。"
            : "提示：调节非均匀缩放因子 s_x 与 s_y，观察红色错误法线（直接 M 变换）如何严重偏斜，而绿色正确法线（(M⁻¹)ᵀ 变换）始终严格垂直于切线。"}
        </p>
      </div>
    </ExpandableDemo>
  );
}
