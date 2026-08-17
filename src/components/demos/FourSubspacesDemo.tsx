import React, { useState, useRef, useEffect } from "react";
import { useCanvas2D } from "../framework/useCanvas2D";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";
import {
  drawAdaptiveAxes,
  getVisibleBounds,
  type Bounds2,
  type Plot2D,
} from "../../visualizations/core/2d/plot2d";

type PresetType =
  "ortho_21" | "oblique_x" | "oblique_diag" | "rank1" | "full" | "shear";

interface MatrixPreset {
  name: string;
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  desc: string;
}

const PRESETS: Record<PresetType, MatrixPreset> = {
  ortho_21: {
    name: "正交投影 (2, 1)",
    a11: 0.8,
    a12: 0.4,
    a21: 0.4,
    a22: 0.2,
    desc: "正交投影到方向 (2, 1)。满足 P² = P 且 Pᵀ = P（对称），列空间等于行空间，零空间与列空间正交垂直。",
  },
  oblique_x: {
    name: "斜投影 ((1,1)→x轴)",
    a11: 1.0,
    a12: -1.0,
    a21: 0.0,
    a22: 0.0,
    desc: "沿方向 (1, 1) 斜向投影至 x 轴。满足 P² = P 但 Pᵀ ≠ P（非对称），列空间为 x 轴，零空间为直线 y = x（非垂直夹角）。",
  },
  oblique_diag: {
    name: "斜投影 (y轴→y=x)",
    a11: 1.0,
    a12: 0.0,
    a21: 1.0,
    a22: 0.0,
    desc: "沿 y 轴斜向投影至直线 y = x。满足 P² = P 但 Pᵀ ≠ P，列空间为直线 y = x，零空间为 y 轴。",
  },
  rank1: {
    name: "一般秩-1 (退化)",
    a11: 1.5,
    a12: 3.0,
    a21: 1.0,
    a22: 2.0,
    desc: "一般秩亏退化矩阵（非投影算子，P² ≠ P）。行空间与零空间垂直，列空间与左零空间垂直。",
  },
  full: {
    name: "满秩 (2×2 可逆)",
    a11: 1.5,
    a12: -0.8,
    a21: 0.6,
    a22: 1.2,
    desc: "满秩同构变换：行空间与列空间均为全空间 ℝ²，零空间与左零空间退化为原点 {0}。",
  },
  shear: {
    name: "剪切矩阵 (全秩)",
    a11: 1.0,
    a12: 1.2,
    a21: 0.0,
    a22: 1.0,
    desc: "保持 x 轴不变并沿水平方向平行剪切，可逆满秩变换。",
  },
};

const BOUNDS: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };

function drawPixelSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 2,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
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

export const FourSubspacesDemo: React.FC<{ height?: string }> = ({
  height,
}) => {
  const [preset, setPreset] = useState<PresetType>("ortho_21");
  const showAxes = true;
  const [xVec, setXVec] = useState<{ x: number; y: number }>({
    x: 1.2,
    y: 1.0,
  });

  const activePreset = PRESETS[preset];
  const { a11, a12, a21, a22 } = activePreset;

  const detA = a11 * a22 - a12 * a21;
  const isRank1 = Math.abs(detA) < 1e-4;
  const rank = isRank1 ? 1 : 2;

  // Projection properties (P^2 == P & P^T == P)
  const sq11 = a11 * a11 + a12 * a21;
  const sq12 = a11 * a12 + a12 * a22;
  const sq21 = a21 * a11 + a22 * a21;
  const sq22 = a21 * a12 + a22 * a22;
  const isIdempotent =
    Math.abs(sq11 - a11) < 1e-3 &&
    Math.abs(sq12 - a12) < 1e-3 &&
    Math.abs(sq21 - a21) < 1e-3 &&
    Math.abs(sq22 - a22) < 1e-3;
  const isSymmetric = Math.abs(a12 - a21) < 1e-3;

  let rowLen = Math.hypot(a11, a12);
  if (rowLen < 1e-6) rowLen = 1;
  const rowDir = { x: a11 / rowLen, y: a12 / rowLen };
  const nullDir = { x: -rowDir.y, y: rowDir.x };

  let colLen = Math.hypot(a11, a21);
  if (colLen < 1e-6) colLen = 1;
  const colDir = { x: a11 / colLen, y: a21 / colLen };
  const leftNullDir = { x: -colDir.y, y: colDir.x };

  const projRowScalar = xVec.x * rowDir.x + xVec.y * rowDir.y;
  const xRow = { x: projRowScalar * rowDir.x, y: projRowScalar * rowDir.y };
  const projNullScalar = xVec.x * nullDir.x + xVec.y * nullDir.y;
  const xNull = {
    x: projNullScalar * nullDir.x,
    y: projNullScalar * nullDir.y,
  };

  const bVec = {
    x: a11 * xVec.x + a12 * xVec.y,
    y: a21 * xVec.x + a22 * xVec.y,
  };

  const stateRef = useRef({
    showAxes,
    isRank1,
    xVec,
    xRow,
    xNull,
    bVec,
    rowDir,
    nullDir,
    colDir,
    leftNullDir,
  });

  useEffect(() => {
    stateRef.current = {
      showAxes,
      isRank1,
      xVec,
      xRow,
      xNull,
      bVec,
      rowDir,
      nullDir,
      colDir,
      leftNullDir,
    };
  }, [
    showAxes,
    isRank1,
    xVec,
    xRow,
    xNull,
    bVec,
    rowDir,
    nullDir,
    colDir,
    leftNullDir,
  ]);

  const isDraggingRef = useRef<boolean>(false);

  const updateVectorFromMouse = (px: number, py: number, plot: Plot2D) => {
    const wx = plot.toWorldX(px);
    const wy = plot.toWorldY(py);
    const visible = getVisibleBounds(plot);
    const maxExtent =
      Math.max(
        Math.abs(visible.xMin),
        Math.abs(visible.xMax),
        Math.abs(visible.yMin),
        Math.abs(visible.yMax),
      ) * 1.5;
    const clampedX = Math.max(-maxExtent, Math.min(maxExtent, wx));
    const clampedY = Math.max(-maxExtent, Math.min(maxExtent, wy));
    setXVec({ x: clampedX, y: clampedY });
  };

  // 1. LEFT CANVAS (Input Space R^2)
  const leftCanvas = useCanvas2D({
    initialBounds: BOUNDS,
    onLeftDown(e, plot) {
      const canvas = leftCanvas.canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      isDraggingRef.current = true;
      updateVectorFromMouse(px, py, plot);
      return true;
    },
    onLeftMove(e, plot) {
      if (!isDraggingRef.current) return;
      const canvas = leftCanvas.canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      updateVectorFromMouse(px, py, plot);
    },
    onLeftUp() {
      isDraggingRef.current = false;
    },
    draw(ctx, plot, theme) {
      const { width, height } = plot;
      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;
      const visible = getVisibleBounds(plot);

      // Adaptive Axes & Grid
      if (st.showAxes) {
        drawAdaptiveAxes(ctx, plot, theme);
      }

      const toCanvas = (wx: number, wy: number) => ({
        x: plot.toScreenX(wx),
        y: plot.toScreenY(wy),
      });

      const span =
        Math.max(
          Math.abs(visible.xMin),
          Math.abs(visible.xMax),
          Math.abs(visible.yMin),
          Math.abs(visible.yMax),
        ) * 2;

      // Subspaces
      if (st.isRank1) {
        // Row Space (Blue line)
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const r1 = toCanvas(-st.rowDir.x * span, -st.rowDir.y * span);
        const r2 = toCanvas(st.rowDir.x * span, st.rowDir.y * span);
        ctx.moveTo(r1.x, r1.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.stroke();
        ctx.fillStyle = "#2563eb";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("行空间 Row(A)", r2.x - 30, r2.y - 8);
        ctx.restore();

        // Null Space (Red line)
        ctx.save();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const n1 = toCanvas(-st.nullDir.x * span, -st.nullDir.y * span);
        const n2 = toCanvas(st.nullDir.x * span, st.nullDir.y * span);
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("零空间 Null(A)", n2.x + 8, n2.y);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = "rgba(37, 99, 235, 0.05)";
        ctx.fillRect(0, 0, width, height);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText("行空间 Row(A) = ℝ²", 12, 56);
        ctx.fillStyle = "#dc2626";
        ctx.fillText("零空间 Null(A) = {0}", 12, 72);
        ctx.restore();
      }

      const pX = toCanvas(st.xVec.x, st.xVec.y);
      const pRow = toCanvas(st.xRow.x, st.xRow.y);
      const pNull = toCanvas(st.xNull.x, st.xNull.y);
      const pOrigin = toCanvas(0, 0);

      if (st.isRank1) {
        // Projections
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pX.x, pX.y);
        ctx.lineTo(pRow.x, pRow.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pX.x, pX.y);
        ctx.lineTo(pNull.x, pNull.y);
        ctx.stroke();
        ctx.restore();

        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pRow.x,
          pRow.y,
          "#2563eb",
          2,
        );
        drawPixelPoint(ctx, pRow.x, pRow.y, "#2563eb", 4);
        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pNull.x,
          pNull.y,
          "#dc2626",
          2,
        );
        drawPixelPoint(ctx, pNull.x, pNull.y, "#dc2626", 4);
      }

      // x vector
      drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pX.x, pX.y, "#d97706", 3);
      drawPixelPoint(ctx, pX.x, pX.y, "#d97706", 7);

      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#d97706";
      ctx.fillText(
        `x (${st.xVec.x.toFixed(1)}, ${st.xVec.y.toFixed(1)})`,
        pX.x + 8,
        pX.y - 8,
      );
      ctx.restore();
    },
  });

  // 2. RIGHT CANVAS (Output Space R^2)
  const rightCanvas = useCanvas2D({
    initialBounds: BOUNDS,
    draw(ctx, plot, theme) {
      const { width, height } = plot;
      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;
      const visible = getVisibleBounds(plot);

      // Adaptive Axes & Grid
      if (st.showAxes) {
        drawAdaptiveAxes(ctx, plot, theme);
      }

      const toCanvas = (wx: number, wy: number) => ({
        x: plot.toScreenX(wx),
        y: plot.toScreenY(wy),
      });

      const span =
        Math.max(
          Math.abs(visible.xMin),
          Math.abs(visible.xMax),
          Math.abs(visible.yMin),
          Math.abs(visible.yMax),
        ) * 2;

      // Subspaces
      if (st.isRank1) {
        // Column Space (Purple line)
        ctx.save();
        ctx.strokeStyle = "#9333ea";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const c1 = toCanvas(-st.colDir.x * span, -st.colDir.y * span);
        const c2 = toCanvas(st.colDir.x * span, st.colDir.y * span);
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.fillStyle = "#9333ea";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("列空间 Col(A)", c2.x - 30, c2.y - 8);
        ctx.restore();

        // Left Null Space (Emerald line)
        ctx.save();
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const ln1 = toCanvas(
          -st.leftNullDir.x * span,
          -st.leftNullDir.y * span,
        );
        const ln2 = toCanvas(st.leftNullDir.x * span, st.leftNullDir.y * span);
        ctx.moveTo(ln1.x, ln1.y);
        ctx.lineTo(ln2.x, ln2.y);
        ctx.stroke();
        ctx.fillStyle = "#059669";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("左零空间 Null(Aᵀ)", ln2.x + 8, ln2.y);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = "rgba(147, 51, 234, 0.05)";
        ctx.fillRect(0, 0, width, height);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#9333ea";
        ctx.fillText("列空间 Col(A) = ℝ²", 12, 56);
        ctx.fillStyle = "#059669";
        ctx.fillText("左零空间 Null(Aᵀ) = {0}", 12, 72);
        ctx.restore();
      }

      const pB = toCanvas(st.bVec.x, st.bVec.y);
      const pOrigin = toCanvas(0, 0);

      // b = Ax vector
      drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pB.x, pB.y, "#9333ea", 3);
      drawPixelPoint(ctx, pB.x, pB.y, "#9333ea", 7);

      ctx.save();
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#9333ea";
      ctx.fillText(
        `b = Ax (${st.bVec.x.toFixed(1)}, ${st.bVec.y.toFixed(1)})`,
        pB.x + 8,
        pB.y - 8,
      );
      ctx.restore();
    },
  });

  useEffect(() => {
    leftCanvas.redraw();
    rightCanvas.redraw();
  }, [preset, showAxes, xVec, leftCanvas.redraw, rightCanvas.redraw]);

  return (
    <ExpandableDemo id="four-subspaces" height={height}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Left Canvas: Input Space */}
          <div
            ref={leftCanvas.containerRef}
            className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border bg-surface"
          >
            <CanvasToolbar onReset={leftCanvas.resetBounds} />
            <canvas
              ref={leftCanvas.canvasRef}
              className="absolute inset-0 h-full w-full cursor-crosshair"
            />
            <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 select-none">
              <span className="font-semibold text-xs text-foreground">
                输入空间 <InlineMath tex="\mathbb{R}^2" /> (Input Space)
              </span>
              <span className="text-xs text-muted">
                <InlineMath tex="x = x_{\text{row}} + x_{\text{null}}" />
              </span>
            </div>
          </div>

          {/* Right Canvas: Output Space */}
          <div
            ref={rightCanvas.containerRef}
            className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border bg-surface"
          >
            <CanvasToolbar onReset={rightCanvas.resetBounds} />
            <canvas
              ref={rightCanvas.canvasRef}
              className="absolute inset-0 h-full w-full"
            />
            <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 select-none">
              <span className="font-semibold text-xs text-foreground">
                输出空间 <InlineMath tex="\mathbb{R}^2" /> (Output Space)
              </span>
              <span className="text-xs text-muted">
                <InlineMath tex="b = Ax = A x_{\text{row}}" />
              </span>
            </div>
          </div>
        </div>

        {/* Preset Controls */}
        <PresetSelector
          label="预设矩阵 A:"
          options={PRESETS}
          value={preset}
          onChange={setPreset}
        />

        {/* Description & Matrix Formula Panel */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">
                当前变换矩阵 <InlineMath tex="A" />
              </p>
              {isIdempotent && isSymmetric && (
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  正交投影 (P²=P, Pᵀ=P)
                </span>
              )}
              {isIdempotent && !isSymmetric && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  斜投影 (P²=P, Pᵀ≠P)
                </span>
              )}
              {!isIdempotent && (
                <span className="rounded bg-muted/15 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                  非幂等变换 (P²≠P)
                </span>
              )}
            </div>

            <div className="text-xs text-muted leading-relaxed">
              <div className="my-1.5 text-ink">
                <InlineMath
                  tex={`A = \\begin{pmatrix} ${a11.toFixed(1)} & ${a12.toFixed(1)} \\\\ ${a21.toFixed(1)} & ${a22.toFixed(1)} \\end{pmatrix}`}
                />
              </div>
              <p className="mt-1 font-medium text-foreground">
                矩阵的秩{" "}
                <InlineMath tex={`\\operatorname{rank}(A) = ${rank}`} /> (
                {isRank1 ? "秩亏退化" : "满秩可逆"})
              </p>
              <p className="mt-1 text-muted text-[11px]">{activePreset.desc}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 font-semibold text-foreground">
              四大子空间维度关系
            </p>
            <div className="space-y-1 text-xs text-muted leading-relaxed">
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                行空间 <InlineMath tex="\operatorname{Row}(A)" />: 维度{" "}
                <InlineMath tex={`r = ${rank}`} />
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                零空间 <InlineMath tex="\operatorname{Null}(A)" />: 维度{" "}
                <InlineMath tex={`n - r = ${2 - rank}`} />{" "}
                {isRank1 ? "(垂直于 Row)" : ""}
              </p>
              <p className="text-purple-600 dark:text-purple-400 font-medium">
                列空间 <InlineMath tex="\operatorname{Col}(A)" />: 维度{" "}
                <InlineMath tex={`r = ${rank}`} />
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                左零空间 <InlineMath tex="\operatorname{Null}(A^\top)" />: 维度{" "}
                <InlineMath tex={`m - r = ${2 - rank}`} />{" "}
                {isRank1 ? "(垂直于 Col)" : ""}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted">
          提示：在左侧“输入空间 <InlineMath tex="\mathbb{R}^2" />
          ”中拖拽橙色点 <InlineMath tex="x" />
          ，观察其在行空间与零空间的正交分解 <InlineMath tex="x_{\text{row}}" />{" "}
          与 <InlineMath tex="x_{\text{null}}" />
          ；右侧“输出空间 <InlineMath tex="\mathbb{R}^2" />
          ”中对应输出向量 <InlineMath tex="b = Ax" /> 始终落在列空间中，且完全由{" "}
          <InlineMath tex="x_{\text{row}}" /> 决定（
          <InlineMath tex="Ax_{\text{null}} = 0" />
          ）。两个视口均支持独立的滚轮缩放与平移。
        </p>
      </div>
    </ExpandableDemo>
  );
};

export default FourSubspacesDemo;
