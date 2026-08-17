import React, { useState, useRef, useEffect } from "react";
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

type DemoMode = "signed-area" | "jacobi-flow" | "similarity";

const MODES: Array<{ id: DemoMode; label: string }> = [
  { id: "signed-area", label: "几何网格与定向面积" },
  { id: "jacobi-flow", label: "连续流动与 Jacobi 膨胀率" },
  { id: "similarity", label: "基变换与相似不变性" },
];

interface MatrixPreset {
  name: string;
  a11: number;
  a12: number;
  a21: number;
  a22: number;
}

const PRESETS: Record<string, MatrixPreset> = {
  dilation: { name: "各向异性扩张", a11: 1.5, a12: 0.3, a21: 0.2, a22: 1.2 },
  shear: { name: "保面积剪切", a11: 1.0, a12: 1.0, a21: 0.0, a22: 1.0 },
  rotation: { name: "纯旋转变换", a11: 0.8, a12: -0.6, a21: 0.6, a22: 0.8 },
  traceFree: {
    name: "无迹流动 (tr=0)",
    a11: 0.8,
    a12: 1.2,
    a21: 0.4,
    a22: -0.8,
  },
  singular: {
    name: "退化投影 (det=0)",
    a11: 1.0,
    a12: 1.0,
    a21: 1.0,
    a22: 1.0,
  },
};

export default function TraceDeterminantDemo({ height }: { height?: string }) {
  const [mode, setMode] = useState<DemoMode>("signed-area");
  const [preset, setPreset] = useState<string>("dilation");

  // Matrix A components
  const [a11, setA11] = useState(1.5);
  const [a12, setA12] = useState(0.3);
  const [a21, setA21] = useState(0.2);
  const [a22, setA22] = useState(1.2);

  // Flow time t
  const [flowT, setFlowT] = useState(0.8);

  // Basis rotation angle for similarity mode
  const [basisAngle, setBasisAngle] = useState(0.6);

  // Active dragging vector handle ("a1" | "a2" | null)
  const draggingRef = useRef<"a1" | "a2" | null>(null);

  // Keep state refs for canvas draw callback
  const stateRef = useRef({
    mode,
    a11,
    a12,
    a21,
    a22,
    flowT,
    basisAngle,
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      a11,
      a12,
      a21,
      a22,
      flowT,
      basisAngle,
    };
  }, [mode, a11, a12, a21, a22, flowT, basisAngle]);

  const handlePresetChange = (key: string) => {
    setPreset(key);
    const p = PRESETS[key];
    if (p) {
      setA11(p.a11);
      setA12(p.a12);
      setA21(p.a21);
      setA22(p.a22);
    }
  };

  const initialBounds: Bounds2 = {
    xMin: -2.8,
    xMax: 3.5,
    yMin: -2.5,
    yMax: 3.0,
  };

  const { containerRef, canvasRef, redraw, resetBounds } = useCanvas2D({
    initialBounds,
    equalScale: true,
    draw: (ctx, plot, theme) => {
      const { mode, a11, a12, a21, a22, flowT, basisAngle } = stateRef.current;

      // 1. Draw coordinate axes & grid
      drawAdaptiveAxes(ctx, plot, theme);

      // Helper function to draw transformed vectors & shapes
      const drawArrow = (
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        color: string,
        label: string,
        lineWidth = 2.5,
      ) => {
        const p0x = plot.toScreenX(fromX);
        const p0y = plot.toScreenY(fromY);
        const p1x = plot.toScreenX(toX);
        const p1y = plot.toScreenY(toY);
        const angle = Math.atan2(p1y - p0y, p1x - p0x);
        const headLen = 10;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(
          p1x - headLen * Math.cos(angle - Math.PI / 6),
          p1y - headLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          p1x - headLen * Math.cos(angle + Math.PI / 6),
          p1y - headLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();

        if (label) {
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = color;
          const textX = p1x + 16 * Math.cos(angle + Math.PI / 4);
          const textY = p1y + 16 * Math.sin(angle + Math.PI / 4);
          ctx.fillText(label, textX, textY);
        }
      };

      // Draw original unit square
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const o0x = plot.toScreenX(0);
      const o0y = plot.toScreenY(0);
      const o1x = plot.toScreenX(1);
      const o1y = plot.toScreenY(0);
      const o2x = plot.toScreenX(1);
      const o2y = plot.toScreenY(1);
      const o3x = plot.toScreenX(0);
      const o3y = plot.toScreenY(1);
      ctx.beginPath();
      ctx.moveTo(o0x, o0y);
      ctx.lineTo(o1x, o1y);
      ctx.lineTo(o2x, o2y);
      ctx.lineTo(o3x, o3y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Label original unit square
      ctx.fillStyle = theme.muted;
      ctx.font = "11px sans-serif";
      const sqCenterX = plot.toScreenX(0.5);
      const sqCenterY = plot.toScreenY(0.5);
      ctx.fillText("单位方格 (面积 1)", sqCenterX - 36, sqCenterY);

      if (mode === "signed-area") {
        // MODE 1: Static matrix transformation
        const v1x = a11;
        const v1y = a21;
        const v2x = a12;
        const v2y = a22;
        const vSumX = v1x + v2x;
        const vSumY = v1y + v2y;

        const det = a11 * a22 - a12 * a21;
        const fillCol =
          det >= 0 ? "rgba(39, 174, 96, 0.2)" : "rgba(231, 76, 60, 0.2)";
        const strokeCol =
          det >= 0 ? "rgba(39, 174, 96, 0.85)" : "rgba(231, 76, 60, 0.85)";

        // Draw deformed parallelogram
        const pt0x = plot.toScreenX(0);
        const pt0y = plot.toScreenY(0);
        const pt1x = plot.toScreenX(v1x);
        const pt1y = plot.toScreenY(v1y);
        const pt2x = plot.toScreenX(vSumX);
        const pt2y = plot.toScreenY(vSumY);
        const pt3x = plot.toScreenX(v2x);
        const pt3y = plot.toScreenY(v2y);

        ctx.fillStyle = fillCol;
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt0x, pt0y);
        ctx.lineTo(pt1x, pt1y);
        ctx.lineTo(pt2x, pt2y);
        ctx.lineTo(pt3x, pt3y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw column vectors
        drawArrow(0, 0, v1x, v1y, "#3b82f6", "a₁ (第1列)", 3);
        drawArrow(0, 0, v2x, v2y, "#f59e0b", "a₂ (第2列)", 3);

        // Draw interactive grab handles
        const handleRadius = 6;
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(pt1x, pt1y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(pt3x, pt3y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (mode === "jacobi-flow") {
        // MODE 2: Continuous flow I + t*A
        const t = flowT;
        const m11 = 1 + t * a11;
        const m12 = t * a12;
        const m21 = t * a21;
        const m22 = 1 + t * a22;

        const v1x = m11;
        const v1y = m21;
        const v2x = m12;
        const v2y = m22;
        const vSumX = v1x + v2x;
        const vSumY = v1y + v2y;

        const pt0x = plot.toScreenX(0);
        const pt0y = plot.toScreenY(0);
        const pt1x = plot.toScreenX(v1x);
        const pt1y = plot.toScreenY(v1y);
        const pt2x = plot.toScreenX(vSumX);
        const pt2y = plot.toScreenY(vSumY);
        const pt3x = plot.toScreenX(v2x);
        const pt3y = plot.toScreenY(v2y);

        ctx.fillStyle = "rgba(99, 102, 241, 0.22)";
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(pt0x, pt0y);
        ctx.lineTo(pt1x, pt1y);
        ctx.lineTo(pt2x, pt2y);
        ctx.lineTo(pt3x, pt3y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Velocity flow vectors at the corners
        drawArrow(1, 0, 1 + a11 * 0.5, a21 * 0.5, "#3b82f6", "v(e₁)", 2);
        drawArrow(0, 1, a12 * 0.5, 1 + a22 * 0.5, "#f59e0b", "v(e₂)", 2);
      } else if (mode === "similarity") {
        // MODE 3: Basis rotation P and similarity transform P^-1 * A * P
        const cosB = Math.cos(basisAngle);
        const sinB = Math.sin(basisAngle);

        const ap11 = a11 * cosB + a12 * sinB;
        const ap12 = -a11 * sinB + a12 * cosB;
        const ap21 = a21 * cosB + a22 * sinB;
        const ap22 = -a21 * sinB + a22 * cosB;

        // Draw standard basis (e1, e2) transformed
        drawArrow(0, 0, a11, a21, "rgba(59, 130, 246, 0.4)", "A e₁", 1.5);
        drawArrow(0, 0, a12, a22, "rgba(245, 158, 11, 0.4)", "A e₂", 1.5);

        // Draw rotated new coordinate axes p1, p2
        drawArrow(0, 0, cosB, sinB, "#10b981", "p₁ (新基)", 2.5);
        drawArrow(0, 0, -sinB, cosB, "#8b5cf6", "p₂ (新基)", 2.5);

        // Draw transformed new basis vectors A*p1, A*p2
        drawArrow(0, 0, ap11, ap21, "#10b981", "A p₁", 2.5);
        drawArrow(0, 0, ap12, ap22, "#8b5cf6", "A p₂", 2.5);
      }
    },
  });

  // Handle pointer dragging for column vectors
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "signed-area") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert mouse to math coordinates
    // We can probe handle hits:
    const { a11, a12, a21, a22 } = stateRef.current;
    const margin = 20;
    const width = canvas.width;
    const height = canvas.height;

    // Direct distance check in math coords
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    const xSpan = initialBounds.xMax - initialBounds.xMin;
    const ySpan = initialBounds.yMax - initialBounds.yMin;

    const mathX = initialBounds.xMin + ((clientX - margin) / plotWidth) * xSpan;
    const mathY =
      initialBounds.yMax - ((clientY - margin) / plotHeight) * ySpan;

    const distA1 = Math.hypot(mathX - a11, mathY - a21);
    const distA2 = Math.hypot(mathX - a12, mathY - a22);

    if (distA1 < 0.4) {
      draggingRef.current = "a1";
      canvas.setPointerCapture(e.pointerId);
    } else if (distA2 < 0.4) {
      draggingRef.current = "a2";
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || mode !== "signed-area") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const margin = 20;
    const width = canvas.width;
    const height = canvas.height;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    const xSpan = initialBounds.xMax - initialBounds.xMin;
    const ySpan = initialBounds.yMax - initialBounds.yMin;

    const mathX = initialBounds.xMin + ((clientX - margin) / plotWidth) * xSpan;
    const mathY =
      initialBounds.yMax - ((clientY - margin) / plotHeight) * ySpan;

    const clampedX = Math.round(Math.max(-2.5, Math.min(2.8, mathX)) * 10) / 10;
    const clampedY = Math.round(Math.max(-2.5, Math.min(2.8, mathY)) * 10) / 10;

    if (draggingRef.current === "a1") {
      setA11(clampedX);
      setA21(clampedY);
    } else if (draggingRef.current === "a2") {
      setA12(clampedX);
      setA22(clampedY);
    }
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingRef.current) {
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* fallback */
      }
      draggingRef.current = null;
    }
  };

  // Mathematical metrics calculation
  const tr = a11 + a22;
  const det = a11 * a22 - a12 * a21;

  // Jacobi expansion values
  const jacobiArea =
    (1 + flowT * a11) * (1 + flowT * a22) - flowT * a12 * (flowT * a21);
  const linearApproximation = 1 + flowT * tr;

  // Similarity rotated matrix values
  const cosB = Math.cos(basisAngle);
  const sinB = Math.sin(basisAngle);
  const ap11 = a11 * cosB + a12 * sinB;
  const ap12 = -a11 * sinB + a12 * cosB;
  const ap21 = a21 * cosB + a22 * sinB;
  const ap22 = -a21 * sinB + a22 * cosB;

  const simA11 = cosB * ap11 + sinB * ap21;
  const simA12 = cosB * ap12 + sinB * ap22;
  const simA21 = -sinB * ap11 + cosB * ap21;
  const simA22 = -sinB * ap12 + cosB * ap22;
  const simTr = simA11 + simA22;
  const simDet = simA11 * simA22 - simA12 * simA21;

  return (
    <ExpandableDemo id="trace-and-determinant" height={height}>
      <div className="space-y-4">
        {/* Mode Switch Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={MODES}
            value={mode}
            onChange={(val) => {
              setMode(val as DemoMode);
              redraw();
            }}
          />
        </div>

        {/* 2D Canvas Viewport */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>

        {/* Presets & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PresetSelector
            label="矩阵预设:"
            options={PRESETS}
            value={preset}
            onChange={(p) => {
              handlePresetChange(p);
              redraw();
            }}
          />

          {mode === "jacobi-flow" && (
            <ParamSlider
              label={<InlineMath tex="t" />}
              min={0}
              max={1.5}
              step={0.05}
              value={flowT}
              onChange={(val) => {
                setFlowT(val);
                redraw();
              }}
              widthClass="w-36"
              display={`t = ${flowT.toFixed(2)}`}
            />
          )}

          {mode === "similarity" && (
            <ParamSlider
              label="基底旋转 θ"
              min={0}
              max={Math.PI}
              step={0.05}
              value={basisAngle}
              onChange={(val) => {
                setBasisAngle(val);
                redraw();
              }}
              widthClass="w-36"
              display={`${((basisAngle * 180) / Math.PI).toFixed(0)}°`}
            />
          )}
        </div>

        {/* Real-time Math Invariants Information Panel */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-3">
          {/* Column 1: Matrix A */}
          <div>
            <p className="mb-1 font-semibold text-foreground">
              当前矩阵 <InlineMath tex="A" />
            </p>
            <div className="text-xs text-muted leading-relaxed">
              <div className="my-1.5 text-ink">
                <InlineMath
                  tex={`A = \\begin{pmatrix} ${a11.toFixed(1)} & ${a12.toFixed(1)} \\\\ ${a21.toFixed(1)} & ${a22.toFixed(1)} \\end{pmatrix}`}
                />
              </div>
              <p className="mt-1 text-ink">
                列向量{" "}
                <InlineMath
                  tex={`a_1=(${a11.toFixed(1)}, ${a21.toFixed(1)})`}
                />
              </p>
              <p className="text-ink">
                列向量{" "}
                <InlineMath
                  tex={`a_2=(${a12.toFixed(1)}, ${a22.toFixed(1)})`}
                />
              </p>
            </div>
          </div>

          {/* Column 2: Invariants (Trace & Determinant) */}
          <div>
            <p className="mb-1 font-semibold text-foreground">核心固有不变量</p>
            <div className="space-y-1 text-xs">
              <p className="text-foreground">
                <span className="font-semibold text-accent">迹 (Trace)：</span>
                <InlineMath
                  tex={`\\operatorname{tr}(A) = ${a11.toFixed(1)} + ${a22.toFixed(1)} = ${tr.toFixed(2)}`}
                />
              </p>
              <p className="text-foreground">
                <span className="font-semibold text-emerald-500">
                  行列式 (Det)：
                </span>
                <InlineMath tex={`\\det(A) = ${det.toFixed(2)}`} />
              </p>
              <p className="text-muted">
                {det > 0
                  ? "定向保持 (逆时针)"
                  : det < 0
                    ? "定向翻转 (顺时针镜面)"
                    : "退化奇异 (降维至线)"}
              </p>
            </div>
          </div>

          {/* Column 3: Mode-Specific Insight */}
          <div>
            {mode === "signed-area" && (
              <>
                <p className="mb-1 font-semibold text-foreground">
                  几何面积解读
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  单位方格变换后平行四边形面积为{" "}
                  <span className="font-mono font-bold text-foreground">
                    |det(A)| = {Math.abs(det).toFixed(2)}
                  </span>
                  。拖动蓝色/橙色端点可实时修改列基。
                </p>
              </>
            )}

            {mode === "jacobi-flow" && (
              <>
                <p className="mb-1 font-semibold text-foreground">
                  Jacobi 体积展开
                </p>
                <div className="font-mono text-xs text-muted leading-relaxed">
                  <p>实际面积 Area(t) = {jacobiArea.toFixed(3)}</p>
                  <p>一阶线性近似 ≈ {linearApproximation.toFixed(3)}</p>
                  <p className="mt-1 text-ink text-[11px]">
                    t=0 时膨胀率 d(Area)/dt ≡ tr(A) = {tr.toFixed(2)}
                  </p>
                </div>
              </>
            )}

            {mode === "similarity" && (
              <>
                <p className="mb-1 font-semibold text-foreground">
                  新基底下的 <InlineMath tex="A' = P^{-1}AP" />
                </p>
                <div className="text-xs text-muted leading-relaxed">
                  <div className="my-1.5 text-ink">
                    <InlineMath
                      tex={`A' = \\begin{pmatrix} ${simA11.toFixed(2)} & ${simA12.toFixed(2)} \\\\ ${simA21.toFixed(2)} & ${simA22.toFixed(2)} \\end{pmatrix}`}
                    />
                  </div>
                  <p className="mt-1 font-semibold text-foreground">
                    <InlineMath
                      tex={`\\operatorname{tr}(A') = ${simTr.toFixed(2)} \\equiv ${tr.toFixed(2)}`}
                    />
                  </p>
                  <p className="font-semibold text-foreground">
                    <InlineMath
                      tex={`\\det(A') = ${simDet.toFixed(2)} \\equiv ${det.toFixed(2)}`}
                    />
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          提示：在“几何网格与定向面积”模式下可直接在画布中拖拽蓝/橙向量端点；切换至“连续流动”观察微元体积增长；切换至“相似不变性”旋转基底验证迹与行列式的守恒不变性。
        </p>
      </div>
    </ExpandableDemo>
  );
}
