import React, { useState, useRef, useEffect } from "react";
import { useCanvas2D } from "../framework/useCanvas2D";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import Checkbox from "../framework/Checkbox";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import {
  drawDragHandle,
  drawAdaptiveAxes,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";

const BOUNDS: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };

const PRESETS: PresetOption[] = [
  {
    value: "standard",
    label: "标准倾斜测量",
    description: "泛函 f(x,y) = x + 0.5y，测量向量 v = (2.0, 1.0)",
  },
  {
    value: "nullspace",
    label: "零核正交测量 (f(v) = 0)",
    description: "向量位于 ker(f) 上，穿透层数为 0",
  },
  {
    value: "dense",
    label: "高密刻度探针 (大幅值泛函)",
    description: "系数较大，等高线密集，相同向量穿透更多层",
  },
  {
    value: "coord_extract",
    label: "坐标提取对偶基 e*¹",
    description: "f(x,y) = x，等值线垂直于 x 轴，严格提取 x 坐标",
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

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  headLen = 10,
  headAngle = Math.PI / 6,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - headAngle),
    toY - headLen * Math.sin(angle - headAngle),
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + headAngle),
    toY - headLen * Math.sin(angle + headAngle),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function DualFunctionalHyperplanesDemo({
  height,
}: {
  height?: string;
}) {
  const [presetKey, setPresetKey] = useState("standard");
  const [a, setA] = useState<number>(1.0);
  const [b, setB] = useState<number>(0.5);
  const [v, setV] = useState<{ x: number; y: number }>({ x: 2.0, y: 1.0 });
  const [showRiesz, setShowRiesz] = useState<boolean>(true);
  const [showIntersections, setShowIntersections] = useState<boolean>(true);

  const fVal = a * v.x + b * v.y;
  const gradLen = Math.hypot(a, b);
  const lineSpacing = gradLen > 1e-4 ? 1 / gradLen : 0;

  const stateRef = useRef({
    a,
    b,
    v,
    showRiesz,
    showIntersections,
  });

  useEffect(() => {
    stateRef.current = { a, b, v, showRiesz, showIntersections };
  }, [a, b, v, showRiesz, showIntersections]);

  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);

  const handlePreset = (val: string) => {
    setPresetKey(val);
    if (val === "standard") {
      setA(1.0);
      setB(0.5);
      setV({ x: 2.0, y: 1.0 });
    } else if (val === "nullspace") {
      setA(1.0);
      setB(1.0);
      setV({ x: -1.5, y: 1.5 });
    } else if (val === "dense") {
      setA(1.8);
      setB(1.2);
      setV({ x: 1.2, y: 0.8 });
    } else if (val === "coord_extract") {
      setA(1.0);
      setB(0.0);
      setV({ x: 2.4, y: 1.6 });
    }
  };

  const { containerRef, canvasRef, redraw, resetBounds } = useCanvas2D({
    initialBounds: BOUNDS,
    onHover(e, plot) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const sx = plot.toScreenX(stateRef.current.v.x);
      const sy = plot.toScreenY(stateRef.current.v.y);
      const dist = Math.hypot(px - sx, py - sy);

      if (dist <= 24) {
        isHoveredRef.current = true;
        canvas.style.cursor = isDraggingRef.current ? "grabbing" : "grab";
      } else {
        isHoveredRef.current = false;
        if (!isDraggingRef.current) canvas.style.cursor = "";
      }
    },
    onLeftDown(e, plot) {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const sx = plot.toScreenX(stateRef.current.v.x);
      const sy = plot.toScreenY(stateRef.current.v.y);
      const dist = Math.hypot(px - sx, py - sy);

      if (dist <= 24) {
        isDraggingRef.current = true;
        isHoveredRef.current = true;
        canvas.style.cursor = "grabbing";
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

      const wx = plot.toWorldX(px);
      const wy = plot.toWorldY(py);

      const clampedX = Math.max(-3.0, Math.min(3.0, wx));
      const clampedY = Math.max(-3.0, Math.min(3.0, wy));

      setV({
        x: Math.round(clampedX * 10) / 10,
        y: Math.round(clampedY * 10) / 10,
      });
      setPresetKey("custom");
    },
    onLeftUp() {
      isDraggingRef.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = isHoveredRef.current ? "grab" : "";
      }
    },
    draw(ctx, plot, theme) {
      const { width, height } = plot;
      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;
      drawAdaptiveAxes(ctx, plot, theme, "x", "y");

      // 1. Draw Hyperplanes (Equispaced parallel lines ax + by = c)
      const gradSq = st.a * st.a + st.b * st.b;
      if (gradSq > 1e-5) {
        // Range of c to cover the canvas
        const corners = [
          { x: plot.toWorldX(0), y: plot.toWorldY(0) },
          { x: plot.toWorldX(width), y: plot.toWorldY(0) },
          { x: plot.toWorldX(0), y: plot.toWorldY(height) },
          { x: plot.toWorldX(width), y: plot.toWorldY(height) },
        ];
        const cVals = corners.map((p) => st.a * p.x + st.b * p.y);
        const minC = Math.floor(Math.min(...cVals)) - 1;
        const maxC = Math.ceil(Math.max(...cVals)) + 1;

        // Line direction orthogonal to normal (a, b) -> (-b, a)
        const dx = -st.b;
        const dy = st.a;
        const span = 15;

        for (let cInt = minC; cInt <= maxC; cInt++) {
          // A point on line ax + by = cInt: p0 = (cInt * a / gradSq, cInt * b / gradSq)
          const p0x = (cInt * st.a) / gradSq;
          const p0y = (cInt * st.b) / gradSq;

          const pStart = { x: p0x - dx * span, y: p0y - dy * span };
          const pEnd = { x: p0x + dx * span, y: p0y + dy * span };

          const s0x = plot.toScreenX(pStart.x);
          const s0y = plot.toScreenY(pStart.y);
          const s1x = plot.toScreenX(pEnd.x);
          const s1y = plot.toScreenY(pEnd.y);

          const isKernel = cInt === 0;
          ctx.save();
          if (isKernel) {
            ctx.strokeStyle = "#059669"; // Emerald for ker(f)
            ctx.lineWidth = 2.4;
            ctx.setLineDash([]);
          } else {
            ctx.strokeStyle =
              cInt % 2 === 0
                ? "rgba(59, 130, 246, 0.45)"
                : "rgba(59, 130, 246, 0.25)";
            ctx.lineWidth = cInt % 2 === 0 ? 1.4 : 1.0;
            ctx.setLineDash(cInt % 2 === 0 ? [5, 4] : [3, 3]);
          }

          ctx.beginPath();
          ctx.moveTo(s0x, s0y);
          ctx.lineTo(s1x, s1y);
          ctx.stroke();

          // Label level value c
          const labelSx = plot.toScreenX(p0x);
          const labelSy = plot.toScreenY(p0y);
          if (
            labelSx >= 10 &&
            labelSx <= width - 10 &&
            labelSy >= 10 &&
            labelSy <= height - 10
          ) {
            ctx.font = isKernel
              ? "bold 11px system-ui, sans-serif"
              : "10px system-ui, sans-serif";
            ctx.fillStyle = isKernel ? "#059669" : "#3b82f6";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              isKernel ? "f=0 (ker f)" : `f=${cInt}`,
              labelSx + (Math.abs(st.b) > Math.abs(st.a) ? 18 : 0),
              labelSy - (Math.abs(st.a) >= Math.abs(st.b) ? 14 : 6),
            );
          }
          ctx.restore();
        }
      }

      const pOrigin = { x: plot.toScreenX(0), y: plot.toScreenY(0) };
      const pV = { x: plot.toScreenX(st.v.x), y: plot.toScreenY(st.v.y) };

      // 2. Draw Piercing Intersection Points
      if (st.showIntersections && gradSq > 1e-5) {
        const val = st.a * st.v.x + st.b * st.v.y;
        const startK = val >= 0 ? 1 : -1;
        const endK = val >= 0 ? Math.floor(val) : Math.ceil(val);

        if (Math.abs(val) >= 1) {
          const stepK = val >= 0 ? 1 : -1;
          for (let k = startK; val >= 0 ? k <= endK : k >= endK; k += stepK) {
            const t = k / val;
            const ix = t * st.v.x;
            const iy = t * st.v.y;
            const isx = plot.toScreenX(ix);
            const isy = plot.toScreenY(iy);

            ctx.save();
            ctx.beginPath();
            ctx.arc(isx, isy, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ef4444";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = "bold 10px system-ui, sans-serif";
            ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(`#${Math.abs(k)}`, isx, isy - 6);
            ctx.restore();
          }
        }
      }

      // 3. Optional: Draw Riesz Representation Normal Vector v_f = (a, b)
      if (st.showRiesz && gradSq > 1e-5) {
        const rLen = Math.hypot(st.a, st.b);
        const normScale = 1.4;
        const rx = (st.a / rLen) * normScale;
        const ry = (st.b / rLen) * normScale;
        const pRiesz = {
          x: plot.toScreenX(rx),
          y: plot.toScreenY(ry),
        };

        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pRiesz.x,
          pRiesz.y,
          "#8b5cf6", // purple-500
          2.2,
          [4, 3],
        );
        drawArrowHead(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pRiesz.x,
          pRiesz.y,
          "#8b5cf6",
          8,
        );

        ctx.save();
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = "#8b5cf6";
        ctx.fillText("v_f (Riesz 对偶箭头 ⊥ ker)", pRiesz.x + 8, pRiesz.y - 6);
        ctx.restore();
      }

      // 4. Draw Vector v (Amber / Orange) with Arrowhead and Drag Handle
      drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pV.x, pV.y, "#f59e0b", 3.2);
      drawArrowHead(ctx, pOrigin.x, pOrigin.y, pV.x, pV.y, "#f59e0b", 12);

      drawDragHandle(ctx, pV.x, pV.y, {
        color: "#f59e0b",
        isHovered: isHoveredRef.current,
        isDragging: isDraggingRef.current,
        radius: 7,
      });

      ctx.save();
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(
        `v = (${st.v.x.toFixed(1)}, ${st.v.y.toFixed(1)})`,
        pV.x + 10,
        pV.y - 10,
      );
      ctx.restore();
    },
  });

  useEffect(() => {
    redraw();
  }, [a, b, v, showRiesz, showIntersections, redraw]);

  return (
    <ExpandableDemo id="dual-functional-hyperplanes" height={height}>
      <div className="space-y-4">
        {/* Preset Selector */}
        <PresetSelector
          label="预设测量场景:"
          options={PRESETS}
          value={presetKey}
          onChange={handlePreset}
        />

        {/* 2D Canvas Viewport */}
        <div className="relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/80 bg-surface-hover/80 px-3 py-2 text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
              线性泛函等高线穿透模型交互视图
            </span>
            <span className="text-[11px] text-muted font-normal">
              左键拖拽向量箭头顶点 / 滚轮缩放画布
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden"
          >
            <CanvasToolbar onReset={resetBounds} />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-crosshair"
            />

            {/* In-canvas Legend */}
            <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-col gap-1 rounded bg-surface/90 p-2 text-[11px] text-muted backdrop-blur-xs border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-bold">● 向量 v</span>
                <span className="text-emerald-500 font-bold">
                  ― ker(f) 零核超平面
                </span>
                <span className="text-blue-500 font-bold">
                  ┄ f(x)=c 等值线族
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 border-t border-border/40 text-[10px]">
                <span className="text-red-500 font-medium">● 穿透计数点</span>
                {showRiesz && (
                  <span className="text-purple-500 font-medium">
                    ┄ v_f (Riesz 表现向量)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Math Calculation & Sliders */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Controls Sliders */}
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-xs">
            <p className="font-semibold text-foreground">
              线性泛函系数探针 <InlineMath tex="f(\mathbf{x}) = a x + b y" />
            </p>
            <ParamSlider
              label="系数 a (x 分量)"
              value={a}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(val) => {
                setA(val);
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="系数 b (y 分量)"
              value={b}
              min={-2.5}
              max={2.5}
              step={0.1}
              onChange={(val) => {
                setB(val);
                setPresetKey("custom");
              }}
            />

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
              <Checkbox
                label="显示穿透交点"
                checked={showIntersections}
                onChange={setShowIntersections}
              />
              <Checkbox
                label="显示 Riesz 对偶向量 v_f"
                checked={showRiesz}
                onChange={setShowRiesz}
              />
            </div>
          </div>

          {/* Real-time Evaluation Math Card */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 text-xs space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-2">
                泛函测量与穿透数实时计算
              </p>
              <div className="space-y-2 font-mono text-[11px]">
                {/* Functional Value */}
                <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-blue-500 font-bold">
                    <span>泛函代数求值 f(v)</span>
                    <span className="text-sm">{fVal.toFixed(2)}</span>
                  </div>
                  <InlineMath
                    tex={`f(\\mathbf{v}) = (${a.toFixed(1)})(${v.x.toFixed(1)}) + (${b.toFixed(1)})(${v.y.toFixed(1)}) = ${fVal.toFixed(2)}`}
                  />
                </div>

                {/* Piercing Analysis */}
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-amber-500 font-bold">
                    <span>几何穿透层数（Hyperplane Piercing）</span>
                    <span>
                      {Math.abs(fVal) < 1e-4
                        ? "0 层 (向量位于零核上)"
                        : `穿透 ${Math.abs(fVal).toFixed(2)} 层等高线`}
                    </span>
                  </div>
                  <p className="text-muted text-[10px]">
                    等高线间距 $d = 1/\|\nabla f\| =$ {lineSpacing.toFixed(2)}
                    。间距越密，泛函对同一向量测出的数值越大。
                  </p>
                </div>
              </div>
            </div>

            {/* Zero-Kernel Status */}
            <div className="pt-2 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
              <span>零核状态：</span>
              <span
                className={`font-semibold ${
                  Math.abs(fVal) < 1e-3
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {Math.abs(fVal) < 1e-3
                  ? "✓ 向量 v 恰好落在 ker(f) 零核超平面上 (f(v)=0)"
                  : `向量 v 偏离零核超平面，测量值不为零`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
