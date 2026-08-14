import React, { useState, useRef, useEffect } from "react";
import { useCanvas2D } from "../framework/useCanvas2D";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";
import { type Bounds2 } from "../../visualizations/core/plot2d";

type PresetType = "rank1" | "proj" | "full" | "shear";

interface MatrixPreset {
  name: string;
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  desc: string;
}

const PRESETS: Record<PresetType, MatrixPreset> = {
  rank1: {
    name: "秩-1 (退化 1D)",
    a11: 1.5,
    a12: 3.0,
    a21: 1.0,
    a22: 2.0,
    desc: "rank = 1：行空间与核均为 1 维直线且互相垂直；列空间与左核亦为垂直 1 维直线。",
  },
  proj: {
    name: "正交投影矩阵",
    a11: 0.8,
    a12: 0.4,
    a21: 0.4,
    a22: 0.2,
    desc: "rank = 1：将整个平面正交投影到方向 (2, 1) 的直线上。",
  },
  full: {
    name: "满秩 (2×2 可逆)",
    a11: 1.5,
    a12: -0.8,
    a21: 0.6,
    a22: 1.2,
    desc: "rank = 2：行空间与列空间均为全空间 R²，核与左核退化为原点 {0}。",
  },
  shear: {
    name: "剪切矩阵 (全秩)",
    a11: 1.0,
    a12: 1.2,
    a21: 0.0,
    a22: 1.0,
    desc: "rank = 2：保持 x 轴不变并沿水平方向平行剪切。",
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
  const [preset, setPreset] = useState<PresetType>("rank1");
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

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS,
    onLeftDown(e, plot) {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const halfW = plot.width / 2;
      if (px < halfW) {
        isDraggingRef.current = true;
        updateVectorFromMouse(px, py, plot.width, plot.height);
        return true;
      }
      return false;
    },
    onLeftMove(e, plot) {
      if (!isDraggingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      updateVectorFromMouse(px, py, plot.width, plot.height);
    },
    onLeftUp() {
      isDraggingRef.current = false;
    },
    draw(ctx, plot, theme) {
      const { width, height } = plot;

      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;
      const halfW = width / 2;
      const scale = Math.min(halfW, height) / 7;

      const centerLeft = { x: halfW / 2, y: height / 2 };
      const centerRight = { x: halfW + halfW / 2, y: height / 2 };

      const toLeftCanvas = (wx: number, wy: number) => ({
        x: centerLeft.x + wx * scale,
        y: centerLeft.y - wy * scale,
      });

      const toRightCanvas = (wx: number, wy: number) => ({
        x: centerRight.x + wx * scale,
        y: centerRight.y - wy * scale,
      });

      // Divider
      ctx.save();
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, height);
      ctx.stroke();
      ctx.restore();

      // LEFT VIEW: Input Space R^2
      if (st.showAxes) {
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let x = -3; x <= 3; x++) {
          if (x === 0) continue;
          const sx = centerLeft.x + x * scale;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();
        }
        for (let y = -3; y <= 3; y++) {
          if (y === 0) continue;
          const sy = centerLeft.y - y * scale;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(halfW, sy);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, centerLeft.y);
        ctx.lineTo(halfW, centerLeft.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerLeft.x, 0);
        ctx.lineTo(centerLeft.x, height);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("输入空间 ℝ² (Input Space)", 12, 22);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = theme.muted;
      ctx.fillText("x = x_row + x_null", 12, 38);
      ctx.restore();

      if (st.isRank1) {
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const r1 = toLeftCanvas(-st.rowDir.x * 5, -st.rowDir.y * 5);
        const r2 = toLeftCanvas(st.rowDir.x * 5, st.rowDir.y * 5);
        ctx.moveTo(r1.x, r1.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.stroke();
        ctx.fillStyle = "#2563eb";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("行空间 Row(A)", r2.x - 30, r2.y - 8);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const n1 = toLeftCanvas(-st.nullDir.x * 5, -st.nullDir.y * 5);
        const n2 = toLeftCanvas(st.nullDir.x * 5, st.nullDir.y * 5);
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
        ctx.fillRect(0, 0, halfW, height);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText("行空间 Row(A) = ℝ²", 12, 56);
        ctx.fillStyle = "#dc2626";
        ctx.fillText("零空间 Null(A) = {0}", 12, 72);
        ctx.restore();
      }

      const pX = toLeftCanvas(st.xVec.x, st.xVec.y);
      const pRow = toLeftCanvas(st.xRow.x, st.xRow.y);
      const pNull = toLeftCanvas(st.xNull.x, st.xNull.y);
      const pOriginLeft = toLeftCanvas(0, 0);

      if (st.isRank1) {
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
          pOriginLeft.x,
          pOriginLeft.y,
          pRow.x,
          pRow.y,
          "#2563eb",
          2,
        );
        drawPixelPoint(ctx, pRow.x, pRow.y, "#2563eb", 4);
        drawPixelSegment(
          ctx,
          pOriginLeft.x,
          pOriginLeft.y,
          pNull.x,
          pNull.y,
          "#dc2626",
          2,
        );
        drawPixelPoint(ctx, pNull.x, pNull.y, "#dc2626", 4);
      }

      drawPixelSegment(
        ctx,
        pOriginLeft.x,
        pOriginLeft.y,
        pX.x,
        pX.y,
        "#d97706",
        3,
      );
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

      // RIGHT VIEW: Output Space R^2
      if (st.showAxes) {
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let x = -3; x <= 3; x++) {
          if (x === 0) continue;
          const sx = centerRight.x + x * scale;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();
        }
        for (let y = -3; y <= 3; y++) {
          if (y === 0) continue;
          const sy = centerRight.y - y * scale;
          ctx.beginPath();
          ctx.moveTo(halfW, sy);
          ctx.lineTo(width, sy);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(halfW, centerRight.y);
        ctx.lineTo(width, centerRight.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerRight.x, 0);
        ctx.lineTo(centerRight.x, height);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = theme.ink;
      ctx.fillText("输出空间 ℝ² (Output Space)", halfW + 12, 22);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = theme.muted;
      ctx.fillText("b = A · x = A · x_row", halfW + 12, 38);
      ctx.restore();

      if (st.isRank1) {
        ctx.save();
        ctx.strokeStyle = "#9333ea";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const c1 = toRightCanvas(-st.colDir.x * 5, -st.colDir.y * 5);
        const c2 = toRightCanvas(st.colDir.x * 5, st.colDir.y * 5);
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.fillStyle = "#9333ea";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText("列空间 Col(A)", c2.x - 30, c2.y - 8);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const ln1 = toRightCanvas(-st.leftNullDir.x * 5, -st.leftNullDir.y * 5);
        const ln2 = toRightCanvas(st.leftNullDir.x * 5, st.leftNullDir.y * 5);
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
        ctx.fillRect(halfW, 0, halfW, height);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#9333ea";
        ctx.fillText("列空间 Col(A) = ℝ²", halfW + 12, 56);
        ctx.fillStyle = "#059669";
        ctx.fillText("左零空间 Null(Aᵀ) = {0}", halfW + 12, 72);
        ctx.restore();
      }

      const pB = toRightCanvas(st.bVec.x, st.bVec.y);
      const pOriginRight = toRightCanvas(0, 0);

      drawPixelSegment(
        ctx,
        pOriginRight.x,
        pOriginRight.y,
        pB.x,
        pB.y,
        "#9333ea",
        3,
      );
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
    redraw();
  }, [preset, showAxes, xVec, redraw]);

  const updateVectorFromMouse = (
    px: number,
    py: number,
    width: number,
    height: number,
  ) => {
    const halfW = width / 2;
    const scale = Math.min(halfW, height) / 7;
    const centerLeft = { x: halfW / 2, y: height / 2 };
    const wx = (px - centerLeft.x) / scale;
    const wy = (centerLeft.y - py) / scale;
    const clampedX = Math.max(-2.8, Math.min(2.8, wx));
    const clampedY = Math.max(-2.8, Math.min(2.8, wy));
    setXVec({ x: clampedX, y: clampedY });
  };

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-4">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
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
            <p className="mb-1 font-semibold text-foreground">
              当前变换矩阵 <InlineMath tex="A" />
            </p>
            <div className="font-mono text-xs text-muted leading-relaxed">
              <p>
                A = [{a11.toFixed(1)}, {a12.toFixed(1)}; {a21.toFixed(1)},{" "}
                {a22.toFixed(1)}]
              </p>
              <p className="mt-1 text-foreground font-medium">
                矩阵的秩 rank(A) = {rank} ({isRank1 ? "秩亏退化" : "满秩可逆"})
              </p>
              <p className="mt-1 text-muted text-[11px]">{activePreset.desc}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 font-semibold text-foreground">
              四大子空间维度关系
            </p>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-blue-600 dark:text-blue-400">
                行空间 <InlineMath tex="\text{Row}(A)" />: 维度 r = {rank}
              </p>
              <p className="text-red-600 dark:text-red-400">
                零空间 <InlineMath tex="\text{Null}(A)" />: 维度 n - r ={" "}
                {2 - rank} (垂直于 Row)
              </p>
              <p className="text-purple-600 dark:text-purple-400">
                列空间 <InlineMath tex="\text{Col}(A)" />: 维度 r = {rank}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">
                左零空间 <InlineMath tex="\text{Null}(A^T)" />: 维度 m - r ={" "}
                {2 - rank} (垂直于 Col)
              </p>
            </div>
          </div>
        </div>

        {/* Interaction Hint */}
        <p className="text-xs text-muted">
          提示：在左侧输入空间中拖动橙色向量点{" "}
          <span className="font-medium text-amber-600">x</span>
          ，观察它如何在正交行空间分量与零空间分量间分解，并映射为右侧列空间中的{" "}
          <span className="font-medium text-purple-600">b = Ax</span>。
        </p>
      </div>
    </ExpandableDemo>
  );
};
