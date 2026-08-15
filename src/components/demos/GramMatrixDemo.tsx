import { useState } from "react";
import {
  drawAdaptiveAxes,
  drawPoint,
  drawSegment,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

const INITIAL_BOUNDS: Bounds2 = {
  xMin: -3.5,
  xMax: 3.5,
  yMin: -3.5,
  yMax: 3.5,
};
const MARGIN = 30;

const PRESETS = [
  { id: "ortho", label: "正交 (90°)" },
  { id: "collinear", label: "共线 (退化 0°)" },
  { id: "general", label: "一般独立" },
];

export default function GramMatrixDemo({ height }: { height?: string }) {
  const [u, setU] = useState<{ x: number; y: number }>({ x: 2.2, y: 0.8 });
  const [v, setV] = useState<{ x: number; y: number }>({ x: 0.6, y: 2.2 });
  const [presetKey, setPresetKey] = useState("general");

  const dragHandlers = useVectorDrag<"u" | "v">({
    targets: [
      { id: "u", x: u.x, y: u.y },
      { id: "v", x: v.x, y: v.y },
    ],
    onDrag(id, pos) {
      if (id === "u") setU(pos);
      else setV(pos);
    },
  });

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: INITIAL_BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        const originX = plot.toScreenX(0);
        const originY = plot.toScreenY(0);
        const ux = plot.toScreenX(u.x);
        const uy = plot.toScreenY(u.y);
        const vx = plot.toScreenX(v.x);
        const vy = plot.toScreenY(v.y);
        const sumx = plot.toScreenX(u.x + v.x);
        const sumy = plot.toScreenY(u.y + v.y);

        // Draw filled parallelogram
        ctx.fillStyle = theme.accent + "22";
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(ux, uy);
        ctx.lineTo(sumx, sumy);
        ctx.lineTo(vx, vy);
        ctx.closePath();
        ctx.fill();

        // Draw dashed boundary edges
        drawSegment(ctx, plot, u.x, u.y, u.x + v.x, u.y + v.y, {
          color: theme.muted,
          width: 1.5,
          dash: [4, 4],
        });
        drawSegment(ctx, plot, v.x, v.y, u.x + v.x, u.y + v.y, {
          color: theme.muted,
          width: 1.5,
          dash: [4, 4],
        });

        // Draw vector u (blue accent)
        drawSegment(ctx, plot, 0, 0, u.x, u.y, {
          color: "#2563eb",
          width: 2.5,
        });
        drawPoint(ctx, plot, u.x, u.y, { color: "#2563eb", radius: 6 });

        // Draw vector v (emerald green)
        drawSegment(ctx, plot, 0, 0, v.x, v.y, {
          color: "#059669",
          width: 2.5,
        });
        drawPoint(ctx, plot, v.x, v.y, { color: "#059669", radius: 6 });

        // Labels on vector tips
        ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText("u", ux + 10, uy - 6);

        ctx.fillStyle = "#059669";
        ctx.fillText("v", vx + 10, vy - 6);
      },
      ...dragHandlers,
    },
    [u, v],
  );

  const handlePreset = (key: string) => {
    setPresetKey(key);
    if (key === "ortho") {
      setU({ x: 2.5, y: 0.0 });
      setV({ x: 0.0, y: 2.0 });
    } else if (key === "collinear") {
      setU({ x: 2.0, y: 1.5 });
      setV({ x: -1.2, y: -0.9 });
    } else {
      setU({ x: 2.2, y: 0.8 });
      setV({ x: 0.6, y: 2.2 });
    }
  };

  const g11 = u.x * u.x + u.y * u.y;
  const g12 = u.x * v.x + u.y * v.y;
  const g22 = v.x * v.x + v.y * v.y;
  const detG = Math.max(0, g11 * g22 - g12 * g12);
  const area = Math.sqrt(detG);
  const isDegenerate = detG < 1e-4;

  return (
    <ExpandableDemo id="gram-matrix" height={height}>
      <div className="space-y-4">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>

        {/* Preset Controls */}
        <PresetSelector
          options={PRESETS}
          value={presetKey}
          onChange={handlePreset}
        />

        {/* Gram Matrix & Determinant Panel */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-foreground">
              Gram 矩阵 <InlineMath tex="G = A^T A" />
            </p>
            <div className="font-mono text-xs text-muted leading-relaxed">
              <p>
                g₁₁ = ⟨u, u⟩ ={" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {g11.toFixed(3)}
                </span>
              </p>
              <p>
                g₁₂ = g₂₁ = ⟨u, v⟩ ={" "}
                <span className="text-purple-600 dark:text-purple-400">
                  {g12.toFixed(3)}
                </span>
              </p>
              <p>
                g₂₂ = ⟨v, v⟩ ={" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {g22.toFixed(3)}
                </span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 font-semibold text-foreground">
              Gram 行列式与面积
            </p>
            <p className="text-xs text-muted">
              <InlineMath tex={`\\det(G) = ${detG.toFixed(3)}`} />
            </p>
            <p className="mt-1 text-xs font-medium text-accent">
              <InlineMath
                tex={`\\text{Area} = \\sqrt{\\det(G)} = ${area.toFixed(3)}`}
              />
            </p>

            {isDegenerate && (
              <p className="mt-1.5 text-xs text-red-500 font-semibold">
                ⚠️ 向量线性相关：平行四边形退化为线段，det(G) = 0，Gram
                矩阵不可逆。
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          提示：拖动 <span className="text-blue-600 font-medium">u</span> 或{" "}
          <span className="text-emerald-600 font-medium">v</span>{" "}
          向量端点更改向量位置；滚轮缩放，中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
