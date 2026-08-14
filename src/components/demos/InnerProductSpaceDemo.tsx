import React, { useState, useRef, useEffect } from "react";
import { useCanvas2D } from "../framework/useCanvas2D";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import CapsuleTabs from "../framework/CapsuleTabs";
import ParamSlider from "../framework/ParamSlider";
import { type Bounds2 } from "../../visualizations/core/2d/plot2d";

type ModeType = "weighted" | "func" | "theorems";

const MODES: Array<{ id: ModeType; label: string }> = [
  { id: "weighted", label: "加权内积与度规椭圆" },
  { id: "func", label: "函数空间积分内积 ⟨f,g⟩" },
  { id: "theorems", label: "柯西-施瓦茨与平行四边形恒等式" },
];

const BOUNDS: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };

interface FuncPreset {
  name: string;
  fName: string;
  gName: string;
  f: (x: number) => number;
  g: (x: number) => number;
  exactIntegral: number;
}

const FUNC_PRESETS: FuncPreset[] = [
  {
    name: "sin(πx) 与 cos(πx) (区间 [-1, 1] 正交)",
    fName: "\\sin(\\pi x)",
    gName: "\\cos(\\pi x)",
    f: (x) => Math.sin(Math.PI * x),
    g: (x) => Math.cos(Math.PI * x),
    exactIntegral: 0,
  },
  {
    name: "x 与 x² (奇次与偶次多项式正交)",
    fName: "x",
    gName: "x^2",
    f: (x) => x,
    g: (x) => x * x,
    exactIntegral: 0,
  },
  {
    name: "1 与 x (正交常数与线性函数)",
    fName: "1",
    gName: "x",
    f: (_) => 1,
    g: (x) => x,
    exactIntegral: 0,
  },
  {
    name: "x 与 x (相同函数 ⟨x, x⟩ = 2/3)",
    fName: "x",
    gName: "x",
    f: (x) => x,
    g: (x) => x,
    exactIntegral: 2 / 3,
  },
];

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

export const InnerProductSpaceDemo: React.FC<{ height?: string }> = ({
  height,
}) => {
  const [mode, setMode] = useState<ModeType>("weighted");
  const showAxes = true;

  // Mode 1: Weighted inner product parameters
  const [w11, setW11] = useState<number>(1.5);
  const [w22, setW22] = useState<number>(0.6);
  const [uVec, setUVec] = useState<{ x: number; y: number }>({
    x: 1.0,
    y: 1.2,
  });

  // Mode 2: Function space preset
  const [funcIdx, setFuncIdx] = useState<number>(0);

  // Mode 3: Theorems vectors u, v
  const [uThem, setUThem] = useState<{ x: number; y: number }>({
    x: 2.0,
    y: 1.0,
  });
  const [vThem, setVThem] = useState<{ x: number; y: number }>({
    x: 0.8,
    y: 1.8,
  });

  const activeFunc = FUNC_PRESETS[funcIdx];

  // Weighted inner product computations
  // <u, v>_W = w11*u1*v1 + w22*u2*v2
  // Vector v chosen to be weighted orthogonal to u: w11*u1*v1 + w22*u2*v2 = 0 => v = (-w22*u2, w11*u1)
  const normUWeighted = Math.sqrt(
    w11 * uVec.x * uVec.x + w22 * uVec.y * uVec.y,
  );
  const vWeightedRaw = { x: -w22 * uVec.y, y: w11 * uVec.x };
  const vLen = Math.hypot(vWeightedRaw.x, vWeightedRaw.y) || 1;
  const vWeighted = {
    x: (vWeightedRaw.x / vLen) * 1.5,
    y: (vWeightedRaw.y / vLen) * 1.5,
  };
  const innerProdWeighted =
    w11 * uVec.x * vWeighted.x + w22 * uVec.y * vWeighted.y;

  // Theorems computations (Mode 3)
  const innerProdUV = uThem.x * vThem.x + uThem.y * vThem.y;
  const normU = Math.hypot(uThem.x, uThem.y);
  const normV = Math.hypot(vThem.x, vThem.y);
  const csLHS = Math.abs(innerProdUV);
  const csRHS = normU * normV;

  const sumUV = { x: uThem.x + vThem.x, y: uThem.y + vThem.y };
  const diffUV = { x: uThem.x - vThem.x, y: uThem.y - vThem.y };
  const normSumSq = sumUV.x * sumUV.x + sumUV.y * sumUV.y;
  const normDiffSq = diffUV.x * diffUV.x + diffUV.y * diffUV.y;
  const paraLHS = normSumSq + normDiffSq;
  const paraRHS = 2 * (normU * normU + normV * normV);

  const stateRef = useRef({
    mode,
    showAxes,
    w11,
    w22,
    uVec,
    vWeighted,
    activeFunc,
    uThem,
    vThem,
    sumUV,
    diffUV,
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      showAxes,
      w11,
      w22,
      uVec,
      vWeighted,
      activeFunc,
      uThem,
      vThem,
      sumUV,
      diffUV,
    };
  }, [
    mode,
    showAxes,
    w11,
    w22,
    uVec,
    vWeighted,
    activeFunc,
    uThem,
    vThem,
    sumUV,
    diffUV,
  ]);

  const dragTargetRef = useRef<"uVec" | "uThem" | "vThem" | null>(null);

  const { containerRef, canvasRef, redraw } = useCanvas2D({
    initialBounds: BOUNDS,
    onLeftDown(e, plot) {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const st = stateRef.current;
      if (st.mode === "weighted") {
        dragTargetRef.current = "uVec";
        updateVectorFromMouse(px, py, plot.width, plot.height, "uVec");
        return true;
      } else if (st.mode === "theorems") {
        const center = { x: plot.width / 2, y: plot.height / 2 };
        const scale = Math.min(plot.width, plot.height) / 8;
        const pU = {
          x: center.x + st.uThem.x * scale,
          y: center.y - st.uThem.y * scale,
        };
        const pV = {
          x: center.x + st.vThem.x * scale,
          y: center.y - st.vThem.y * scale,
        };

        const distU = Math.hypot(px - pU.x, py - pU.y);
        const distV = Math.hypot(px - pV.x, py - pV.y);

        if (distU < 20) {
          dragTargetRef.current = "uThem";
          return true;
        } else if (distV < 20) {
          dragTargetRef.current = "vThem";
          return true;
        }
      }
      return false;
    },
    onLeftMove(e, plot) {
      if (!dragTargetRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      updateVectorFromMouse(
        px,
        py,
        plot.width,
        plot.height,
        dragTargetRef.current,
      );
    },
    onLeftUp() {
      dragTargetRef.current = null;
    },
    draw(ctx, plot, theme) {
      const { width, height } = plot;

      ctx.clearRect(0, 0, width, height);
      const st = stateRef.current;

      const center = { x: width / 2, y: height / 2 };
      const scale = Math.min(width, height) / 8;

      const toCanvas = (wx: number, wy: number) => ({
        x: center.x + wx * scale,
        y: center.y - wy * scale,
      });

      // Background Grid & Axes
      if (st.showAxes) {
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let x = -3; x <= 3; x++) {
          if (x === 0) continue;
          const sx = center.x + x * scale;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();
        }
        for (let y = -3; y <= 3; y++) {
          if (y === 0) continue;
          const sy = center.y - y * scale;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(width, sy);
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

      // MODE 1: Weighted Inner Product & Metric Ellipse
      if (st.mode === "weighted") {
        // Draw Weighted Unit Ellipse: w11*x^2 + w22*y^2 = 1 => a = 1/sqrt(w11), b = 1/sqrt(w22)
        const rx = (1 / Math.sqrt(st.w11)) * scale;
        const ry = (1 / Math.sqrt(st.w22)) * scale;

        ctx.save();
        ctx.strokeStyle = "#2563eb"; // blue-600
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(37, 99, 235, 0.06)";
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(
          "单位度规椭圆 ⟨v,v⟩_W = 1",
          center.x + rx + 8,
          center.y - 8,
        );
        ctx.restore();

        const pOrigin = toCanvas(0, 0);
        const pU = toCanvas(st.uVec.x, st.uVec.y);
        const pV = toCanvas(st.vWeighted.x, st.vWeighted.y);

        // Vector u (Amber)
        drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pU.x, pU.y, "#d97706", 3);
        drawPixelPoint(ctx, pU.x, pU.y, "#d97706", 7);

        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#d97706";
        ctx.fillText(
          `u (${st.uVec.x.toFixed(1)}, ${st.uVec.y.toFixed(1)})`,
          pU.x + 8,
          pU.y - 8,
        );
        ctx.restore();

        // Vector v (Purple)
        drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pV.x, pV.y, "#9333ea", 3);
        drawPixelPoint(ctx, pV.x, pV.y, "#9333ea", 5);

        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#9333ea";
        ctx.fillText(`v (加权正交 ⟨u,v⟩_W = 0)`, pV.x + 8, pV.y - 8);
        ctx.restore();
      }

      // MODE 2: Function Space Inner Product <f, g>
      else if (st.mode === "func") {
        const steps = 200;
        const xMin = -1;
        const xMax = 1;

        // Draw integral range [-1, 1] vertical bounds
        const pLeft = toCanvas(xMin, 0);
        const pRight = toCanvas(xMax, 0);

        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pLeft.x, 0);
        ctx.lineTo(pLeft.x, height);
        ctx.moveTo(pRight.x, 0);
        ctx.lineTo(pRight.x, height);
        ctx.stroke();
        ctx.restore();

        // Draw Product Curve f(x)*g(x) with filled area (Amber)
        ctx.save();
        ctx.fillStyle = "rgba(217, 119, 6, 0.15)";
        ctx.beginPath();
        ctx.moveTo(toCanvas(xMin, 0).x, toCanvas(xMin, 0).y);
        for (let i = 0; i <= steps; i++) {
          const x = xMin + ((xMax - xMin) * i) / steps;
          const y = st.activeFunc.f(x) * st.activeFunc.g(x);
          const p = toCanvas(x, y * 0.8);
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(toCanvas(xMax, 0).x, toCanvas(xMax, 0).y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw f(x) Curve (Blue)
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + ((xMax - xMin) * i) / steps;
          const y = st.activeFunc.f(x);
          const p = toCanvas(x, y * 0.8);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(
          `f(x)`,
          pRight.x + 8,
          toCanvas(1, st.activeFunc.f(1) * 0.8).y,
        );
        ctx.restore();

        // Draw g(x) Curve (Purple)
        ctx.save();
        ctx.strokeStyle = "#9333ea";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + ((xMax - xMin) * i) / steps;
          const y = st.activeFunc.g(x);
          const p = toCanvas(x, y * 0.8);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#9333ea";
        ctx.fillText(
          `g(x)`,
          pRight.x + 8,
          toCanvas(1, st.activeFunc.g(1) * 0.8).y + 16,
        );
        ctx.restore();

        // Draw f(x)g(x) Curve (Amber)
        ctx.save();
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + ((xMax - xMin) * i) / steps;
          const y = st.activeFunc.f(x) * st.activeFunc.g(x);
          const p = toCanvas(x, y * 0.8);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // MODE 3: Cauchy-Schwarz & Parallelogram Law
      else if (st.mode === "theorems") {
        const pOrigin = toCanvas(0, 0);
        const pU = toCanvas(st.uThem.x, st.uThem.y);
        const pV = toCanvas(st.vThem.x, st.vThem.y);
        const pSum = toCanvas(st.sumUV.x, st.sumUV.y);

        // Draw Parallelogram dashed lines
        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(pU.x, pU.y);
        ctx.lineTo(pSum.x, pSum.y);
        ctx.lineTo(pV.x, pV.y);
        ctx.stroke();

        // Diagonal u - v (Diff, Red)
        drawPixelSegment(ctx, pV.x, pV.y, pU.x, pU.y, "#dc2626", 1.8, [3, 3]);
        // Diagonal u + v (Sum, Emerald)
        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pSum.x,
          pSum.y,
          "#059669",
          2,
          [4, 4],
        );
        ctx.restore();

        // Vector u (Blue)
        drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pU.x, pU.y, "#2563eb", 3);
        drawPixelPoint(ctx, pU.x, pU.y, "#2563eb", 7);

        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(
          `u (${st.uThem.x.toFixed(1)}, ${st.uThem.y.toFixed(1)})`,
          pU.x + 8,
          pU.y - 8,
        );
        ctx.restore();

        // Vector v (Purple)
        drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pV.x, pV.y, "#9333ea", 3);
        drawPixelPoint(ctx, pV.x, pV.y, "#9333ea", 7);

        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#9333ea";
        ctx.fillText(
          `v (${st.vThem.x.toFixed(1)}, ${st.vThem.y.toFixed(1)})`,
          pV.x + 8,
          pV.y - 8,
        );
        ctx.restore();
      }
    },
  });

  useEffect(() => {
    redraw();
  }, [mode, showAxes, w11, w22, uVec, funcIdx, uThem, vThem, redraw]);

  const updateVectorFromMouse = (
    px: number,
    py: number,
    width: number,
    height: number,
    target: "uVec" | "uThem" | "vThem",
  ) => {
    const scale = Math.min(width, height) / 8;
    const center = { x: width / 2, y: height / 2 };
    const wx = (px - center.x) / scale;
    const wy = (center.y - py) / scale;

    const clampedX = Math.max(-2.8, Math.min(2.8, wx));
    const clampedY = Math.max(-2.8, Math.min(2.8, wy));

    if (target === "uVec") {
      setUVec({ x: clampedX, y: clampedY });
    } else if (target === "uThem") {
      setUThem({ x: clampedX, y: clampedY });
    } else if (target === "vThem") {
      setVThem({ x: clampedX, y: clampedY });
    }
  };

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={MODES}
            value={mode}
            onChange={(val) => setMode(val as ModeType)}
          />
        </div>

        {/* Canvas Display */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>

        {/* MODE 1 Controls & Panel */}
        {mode === "weighted" && (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <ParamSlider
                label="x 方向权重 w₁₁"
                value={w11}
                min={0.2}
                max={3.0}
                step={0.1}
                onChange={setW11}
              />
              <ParamSlider
                label="y 方向权重 w₂₂"
                value={w22}
                min={0.2}
                max={3.0}
                step={0.1}
                onChange={setW22}
              />
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-foreground">
                  加权内积定义{" "}
                  <InlineMath tex="\langle u, v \rangle_W = w_{11} u_1 v_1 + w_{22} u_2 v_2" />
                </p>
                <p className="font-mono text-xs text-muted">
                  诱导范数{" "}
                  <InlineMath tex="\|u\|_W = \sqrt{\langle u, u \rangle_W} = " />
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {normUWeighted.toFixed(3)}
                  </span>
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-foreground">
                  加权正交性校验
                </p>
                <p className="font-mono text-xs text-muted">
                  计算 <InlineMath tex="\langle u, v \rangle_W = " />
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {Math.abs(innerProdWeighted) < 1e-4
                      ? "0.000 (精确正交!)"
                      : innerProdWeighted.toFixed(3)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2 Controls & Panel */}
        {mode === "func" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted font-medium">选择基函数对:</span>
              {FUNC_PRESETS.map((presetItem, idx) => (
                <button
                  key={idx}
                  onClick={() => setFuncIdx(idx)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    funcIdx === idx
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-hover text-foreground hover:bg-border"
                  }`}
                >
                  {presetItem.name}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm">
              <p className="mb-1 font-semibold text-foreground">
                连续函数空间积分内积{" "}
                <InlineMath tex="\langle f, g \rangle = \int_{-1}^{1} f(x)g(x) \, \mathrm{d}x" />
              </p>
              <div className="font-mono text-xs text-muted space-y-1">
                <p>
                  f(x) = <InlineMath tex={activeFunc.fName} />, g(x) ={" "}
                  <InlineMath tex={activeFunc.gName} />
                </p>
                <p>
                  积分内积结果 <InlineMath tex="\langle f, g \rangle = " />
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {activeFunc.exactIntegral.toFixed(3)}
                  </span>
                  {activeFunc.exactIntegral === 0 && (
                    <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 font-semibold">
                      正交函数对 ⟨f,g⟩ = 0
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3 Controls & Panel */}
        {mode === "theorems" && (
          <div className="rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold text-foreground">
                柯西-施瓦茨不等式{" "}
                <InlineMath tex="|\langle u, v \rangle| \le \|u\| \|v\|" />
              </p>
              <div className="font-mono text-xs text-muted space-y-1">
                <p>
                  LHS <InlineMath tex="|\langle u, v \rangle| = " />
                  <span className="font-bold text-purple-600">
                    {csLHS.toFixed(3)}
                  </span>
                </p>
                <p>
                  RHS <InlineMath tex="\|u\| \|v\| = " />
                  <span className="font-bold text-blue-600">
                    {csRHS.toFixed(3)}
                  </span>
                </p>
                <p className="text-emerald-600 font-semibold">
                  {csLHS <= csRHS + 1e-4 ? "✓ 不等式成立" : "✕ 校验失败"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1 font-semibold text-foreground">
                平行四边形恒等式{" "}
                <InlineMath tex="\|u+v\|^2 + \|u-v\|^2 = 2\|u\|^2 + 2\|v\|^2" />
              </p>
              <div className="font-mono text-xs text-muted space-y-1">
                <p>
                  LHS <InlineMath tex="\|u+v\|^2 + \|u-v\|^2 = " />
                  <span className="font-bold text-emerald-600">
                    {paraLHS.toFixed(2)}
                  </span>
                </p>
                <p>
                  RHS <InlineMath tex="2\|u\|^2 + 2\|v\|^2 = " />
                  <span className="font-bold text-amber-600">
                    {paraRHS.toFixed(2)}
                  </span>
                </p>
                <p className="text-emerald-600 font-semibold">
                  {Math.abs(paraLHS - paraRHS) < 1e-3
                    ? "✓ 恒等式精确相等"
                    : "✕ 校验失败"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Interaction Hint */}
        <p className="text-xs text-muted">
          提示：
          {mode === "weighted" &&
            "拖动滑动条调节 x、y 轴权重，或在画布上拖动向量 u，观察度规椭圆与加权正交向量的动态变化。"}
          {mode === "func" &&
            "点击上方快捷选项，观察蓝色的 f(x) 与紫色的 g(x) 乘积形成的阴影积分区域与其正交数值。"}
          {mode === "theorems" &&
            "在画布上拖动向量 u 或 v，实时验证柯西-施瓦茨不等式与平行四边形恒等式。"}
        </p>
      </div>
    </ExpandableDemo>
  );
};
