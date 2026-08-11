import { useEffect, useRef, useState } from "react";
import {
  clamp,
  numericCurl2,
  numericDivergence2,
} from "../../visualizations/core/math";
import { rgbCss, viridis, valueToT } from "../../visualizations/core/colormap";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import {
  drawArrow,
  drawAxes,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import {
  sampleVectorGrid,
  VECTOR_PRESETS,
  type FieldPresetId,
  type VectorSample,
} from "../../visualizations/demos/vector-field/field";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const BOUNDS: Bounds2 = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const MARGIN = 24;

export default function VectorFieldDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const probeRef = useRef({ x: 1.2, y: 0.8 });
  const axesRef = useRef(true);
  const samplesRef = useRef<VectorSample[]>([]);
  const maxMagRef = useRef(0);
  const [presetId, setPresetId] = useState<FieldPresetId>("rotation");
  const [probe, setProbe] = useState({ x: 1.2, y: 0.8 });
  const [showAxes, setShowAxes] = useState(true);
  const preset =
    VECTOR_PRESETS.find((entry) => entry.id === presetId) ?? VECTOR_PRESETS[0];

  const updateSamples = () => {
    const samples = sampleVectorGrid(preset, BOUNDS, 13, 13);
    let maxMag = 0;
    for (const sample of samples) {
      if (sample.mag > maxMag) maxMag = sample.mag;
    }
    samplesRef.current = samples;
    maxMagRef.current = maxMag;
    controllerRef.current?.redraw();
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controller = createCanvas2D(container, canvas, {
      initialBounds: BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        if (axesRef.current)
          drawAxes(ctx, plot, theme, [-2, -1, 1, 2], [-2, -1, 1, 2]);

        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const worldScale = 0.24 * (BOUNDS.xMax - BOUNDS.xMin);
        const maxMag = maxMagRef.current || 1;
        for (const sample of samplesRef.current) {
          const color = rgbCss(viridis(valueToT(sample.mag, 0, maxMag)));
          drawArrow(
            ctx,
            plot.toScreenX(sample.x),
            plot.toScreenY(sample.y),
            (sample.px / maxMag) * worldScale * kx,
            -(sample.py / maxMag) * worldScale * ky,
            color,
            8,
            6,
            1.6,
          );
        }

        const sx = plot.toScreenX(probeRef.current.x);
        const sy = plot.toScreenY(probeRef.current.y);
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      },
      onHover(e, plot) {
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            BOUNDS.xMin,
            BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            BOUNDS.yMin,
            BOUNDS.yMax,
          ),
        });
      },
      onLeftDown() {
        return true;
      },
      onLeftMove(e, plot) {
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            BOUNDS.xMin,
            BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            BOUNDS.yMin,
            BOUNDS.yMax,
          ),
        });
      },
    });
    controllerRef.current = controller;
    updateSamples();
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    probeRef.current = probe;
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
  }, [probe, showAxes]);

  useEffect(() => {
    updateSamples();
  }, [preset]);

  const divNumeric = numericDivergence2(preset.p, preset.q, probe.x, probe.y);
  const curlNumeric = numericCurl2(preset.p, preset.q, probe.x, probe.y);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">场:</span>
            {VECTOR_PRESETS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setPresetId(entry.id)}
                className={
                  preset.id === entry.id
                    ? "rounded-full border border-accent px-3 py-1 text-accent"
                    : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                }
              >
                {entry.label}
              </button>
            ))}
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
          />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          <p>
            <InlineMath
              tex={`\\nabla\\cdot F \\approx ${divNumeric.toFixed(3)}`}
            />
            <span className="ml-1">(解析 {preset.div.toFixed(1)})</span>
          </p>
          <p>
            <InlineMath
              tex={`\\nabla\\times F \\approx ${curlNumeric.toFixed(3)}`}
            />
            <span className="ml-1">(解析 {preset.curl.toFixed(1)})</span>
          </p>
          <p>
            探针{" "}
            <InlineMath
              tex={`(${probe.x.toFixed(2)}, ${probe.y.toFixed(2)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖动探针查看该点邻域的散度与旋度;箭头颜色表示向量长度;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
