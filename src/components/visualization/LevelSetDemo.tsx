import { useEffect, useRef, useState } from "react";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import { drawAxes, type Plot2D } from "../../visualizations/core/plot2d";
import {
  LEVEL_FIELDS,
  type LevelFieldId,
} from "../../visualizations/demos/levelset/field";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const MARGIN = 30;
const REF_COUNT = 6;
const FIELD_OPTIONS: { id: LevelFieldId; label: string }[] = [
  { id: "circle", label: "圆族" },
  { id: "parabola", label: "抛物线族" },
];

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  pts: Array<[number, number]>,
  color: string,
  width: number,
  dash: number[],
  alpha: number,
): void {
  if (pts.length === 0) return;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const sx = plot.toScreenX(x);
    const sy = plot.toScreenY(y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** 2D level-set explorer: sweep the level curve F(x, y) = c with a slider. */
export default function LevelSetDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const stateRef = useRef({ field: "circle" as LevelFieldId, c: 1.5 });
  const axesRef = useRef(true);
  const [fieldId, setFieldId] = useState<LevelFieldId>("circle");
  const [c, setC] = useState(1.5);
  const [showAxes, setShowAxes] = useState(true);

  const field = LEVEL_FIELDS[fieldId];

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controller = createCanvas2D(container, canvas, {
      initialBounds: LEVEL_FIELDS.circle.bounds,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const { field: id, c: pc } = stateRef.current;
        const f = LEVEL_FIELDS[id];
        if (axesRef.current) drawAxes(ctx, plot, theme, f.ticksX, f.ticksY);

        // A few reference level curves of the family (dashed).
        for (let k = 1; k <= REF_COUNT; k++) {
          const ck = f.cMin + ((f.cMax - f.cMin) * k) / (REF_COUNT + 1);
          drawPolyline(
            ctx,
            plot,
            f.levelCurve(ck, 120),
            theme.border,
            1.2,
            [4, 4],
            0.9,
          );
        }

        // The current level curve F = c (solid accent).
        drawPolyline(
          ctx,
          plot,
          f.levelCurve(pc, 160),
          theme.accent,
          2.2,
          [],
          1,
        );
      },
    });
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    stateRef.current = { field: fieldId, c };
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
  }, [fieldId, c, showAxes]);

  const handleFieldChange = (id: LevelFieldId): void => {
    setFieldId(id);
    const f = LEVEL_FIELDS[id];
    setC(f.defaultC);
    controllerRef.current?.setBounds(f.bounds);
  };

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {FIELD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleFieldChange(option.id)}
                  className={
                    fieldId === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-accent"
                      : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-muted">
              <InlineMath tex="c" />
              <input
                type="range"
                min={field.cMin}
                max={field.cMax}
                step={0.01}
                value={c}
                onChange={(event) => setC(Number(event.target.value))}
                className="w-44 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{c.toFixed(2)}</span>
            </label>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`F(x,y) = ${field.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`F(x,y) = ${c.toFixed(2)} \\Rightarrow ${field.levelTex(c)}`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖动 c 滑块扫描一族等值线:实线为当前
          F(x,y)=c,虚线为参考等值线;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
