import { useState } from "react";
import {
  rgbCss,
  viridis,
  valueToT,
} from "../../visualizations/core/common/colormap";
import {
  numericCurl2,
  numericDivergence2,
} from "../../visualizations/core/common/math";
import {
  drawAdaptiveAxes,
  drawArrow,
  drawPoint,
  getVisibleBounds,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import {
  VECTOR_PRESETS,
  sampleVectorGrid,
  type FieldPresetId,
} from "../../visualizations/scenes/calculus/vector-field-2d";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

const INITIAL_BOUNDS: Bounds2 = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const MARGIN = 24;

export default function VectorFieldDemo({ height }: { height?: string }) {
  const [presetId, setPresetId] = useState<FieldPresetId>("rotation");
  const [probe, setProbe] = useState({ x: 1.2, y: 0.8 });

  const preset =
    VECTOR_PRESETS.find((entry) => entry.id === presetId) ?? VECTOR_PRESETS[0];

  const dragHandlers = useVectorDrag<"probe">({
    targets: [{ id: "probe", x: probe.x, y: probe.y, hitRadius: 30 }],
    onDrag(_id, pos) {
      setProbe(pos);
    },
  });

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: INITIAL_BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        const visible = getVisibleBounds(plot);
        const dynamicSamples = sampleVectorGrid(preset, visible, 14, 14);
        let maxMag = 0;
        for (const sample of dynamicSamples) {
          if (sample.mag > maxMag) maxMag = sample.mag;
        }
        const safeMaxMag = maxMag || 1;

        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const worldScale = 0.24 * (visible.xMax - visible.xMin);

        for (const sample of dynamicSamples) {
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

        // Draw probe point + local field vector in accent color
        const probePx = preset.p(probe.x, probe.y);
        const probePy = preset.q(probe.x, probe.y);
        const probeMag = Math.hypot(probePx, probePy);
        if (probeMag > 1e-4) {
          drawArrow(
            ctx,
            plot.toScreenX(probe.x),
            plot.toScreenY(probe.y),
            (probePx / safeMaxMag) * worldScale * kx * 1.3,
            -(probePy / safeMaxMag) * worldScale * ky * 1.3,
            theme.accent,
            10,
            7,
            2.5,
          );
        }

        drawPoint(ctx, plot, probe.x, probe.y, {
          color: theme.accent,
          filled: true,
          radius: 5,
        });
        drawPoint(ctx, plot, probe.x, probe.y, {
          color: theme.accent,
          filled: false,
          radius: 9,
          width: 1.8,
        });
      },
      onHover(e, plot) {
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return;
        setProbe({
          x: plot.toWorldX(e.clientX - rect.left),
          y: plot.toWorldY(e.clientY - rect.top),
        });
      },
      onLeftDown(e, plot) {
        const handled = dragHandlers.onLeftDown(e, plot);
        if (handled) return true;
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return false;
        setProbe({
          x: plot.toWorldX(e.clientX - rect.left),
          y: plot.toWorldY(e.clientY - rect.top),
        });
        return true;
      },
      onLeftMove(e, plot) {
        dragHandlers.onLeftMove(e, plot);
        const el =
          (e.currentTarget as HTMLElement | null) ??
          (e.target as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        if (!rect) return;
        setProbe({
          x: plot.toWorldX(e.clientX - rect.left),
          y: plot.toWorldY(e.clientY - rect.top),
        });
      },
      onLeftUp() {
        dragHandlers.onLeftUp();
      },
    },
    [presetId, probe],
  );

  const divNumeric = numericDivergence2(preset.p, preset.q, probe.x, probe.y);
  const curlNumeric = numericCurl2(preset.p, preset.q, probe.x, probe.y);
  const probePx = preset.p(probe.x, probe.y);
  const probePy = preset.q(probe.x, probe.y);

  return (
    <ExpandableDemo id="vector-field" height={height}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CapsuleTabs
            options={VECTOR_PRESETS}
            value={presetId}
            onChange={(id: FieldPresetId) => setPresetId(id)}
            label="场:"
          />
        </div>
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
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          <p>
            <InlineMath
              tex={`\\nabla\\cdot \\mathbf{F} \\approx ${divNumeric.toFixed(3)}`}
            />
            <span className="ml-1">(解析 {preset.div.toFixed(1)})</span>
          </p>
          <p>
            <InlineMath
              tex={`\\nabla\\times \\mathbf{F} \\approx ${curlNumeric.toFixed(3)}`}
            />
            <span className="ml-1">(解析 {preset.curl.toFixed(1)})</span>
          </p>
          <p>
            探针{" "}
            <InlineMath
              tex={`\\mathbf{F}(${probe.x.toFixed(2)}, ${probe.y.toFixed(2)}) = (${probePx.toFixed(2)}, ${probePy.toFixed(2)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          移动鼠标或拖动探针查看该点邻域的散度与旋度；粗蓝箭头为探针处的向量；网格箭头颜色代表模长；滚轮缩放，中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
