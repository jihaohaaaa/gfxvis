import { useState } from "react";
import { rgbCss, viridis, valueToT } from "../../visualizations/core/colormap";
import {
  clamp,
  numericCurl2,
  numericDivergence2,
} from "../../visualizations/core/math";
import {
  drawArrow,
  drawAxes,
  drawPoint,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import {
  VECTOR_PRESETS,
  sampleVectorGrid,
  type FieldPresetId,
} from "../../visualizations/demos/vector-field/field";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useCanvas2D } from "../framework/useCanvas2D";

const BOUNDS: Bounds2 = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const MARGIN = 24;

export default function VectorFieldDemo({ height }: { height?: string }) {
  const [presetId, setPresetId] = useState<FieldPresetId>("rotation");
  const [probe, setProbe] = useState({ x: 1.2, y: 0.8 });

  const preset =
    VECTOR_PRESETS.find((entry) => entry.id === presetId) ?? VECTOR_PRESETS[0];

  const samples = sampleVectorGrid(preset, BOUNDS, 13, 13);
  let maxMag = 0;
  for (const sample of samples) {
    if (sample.mag > maxMag) maxMag = sample.mag;
  }
  const safeMaxMag = maxMag || 1;

  const { containerRef, canvasRef } = useCanvas2D(
    {
      initialBounds: BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        drawAxes(ctx, plot, theme, [-2, -1, 1, 2], [-2, -1, 1, 2]);

        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const worldScale = 0.24 * (BOUNDS.xMax - BOUNDS.xMin);

        for (const sample of samples) {
          const color = rgbCss(viridis(valueToT(sample.mag, 0, safeMaxMag)));
          drawArrow(
            ctx,
            plot.toScreenX(sample.x),
            plot.toScreenY(sample.y),
            (sample.px / safeMaxMag) * worldScale * kx,
            -(sample.py / safeMaxMag) * worldScale * ky,
            color,
            8,
            6,
            1.6,
          );
        }

        drawPoint(ctx, plot, probe.x, probe.y, {
          color: theme.accent,
          filled: false,
          radius: 6,
          width: 2.5,
        });
      },
      onHover(e, plot) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
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
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
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
    },
    [presetId, probe],
  );

  const divNumeric = numericDivergence2(preset.p, preset.q, probe.x, probe.y);
  const curlNumeric = numericCurl2(preset.p, preset.q, probe.x, probe.y);

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CapsuleTabs
              options={VECTOR_PRESETS}
              value={presetId}
              onChange={(id: FieldPresetId) => setPresetId(id)}
              label="场:"
            />
          </div>
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
