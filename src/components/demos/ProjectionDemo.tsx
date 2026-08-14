import { useState } from "react";
import {
  drawArrow,
  drawAxes,
  drawPoint,
  drawSegment,
} from "../../visualizations/core/plot2d";
import {
  DEFAULT_X,
  PROBE_CLAMP,
  PROJECTION_BOUNDS,
  PROJECTION_TARGETS,
  type ProjectionModeId,
  type ProjectionTargetId,
} from "../../visualizations/demos/projection/projection2d";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { clamp } from "../../visualizations/core/math";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

const MARGIN = 24;

const TARGET_OPTIONS: { id: ProjectionTargetId; label: string }[] = [
  { id: "x-axis", label: "x 轴" },
  { id: "line-yx", label: "y = x" },
];

const MODE_OPTIONS: { id: ProjectionModeId; label: string }[] = [
  { id: "orthogonal", label: "正交投影" },
  { id: "oblique", label: "斜投影" },
];

/** 2D projection explorer: x/y sliders set the vector; pick target line and mode. */
export default function ProjectionDemo({ height }: { height?: string }) {
  const [targetId, setTargetId] = useState<ProjectionTargetId>("x-axis");
  const [modeId, setModeId] = useState<ProjectionModeId>("orthogonal");
  const [probe, setProbe] = useState(DEFAULT_X);

  const mode = PROJECTION_TARGETS[targetId].modes[modeId];

  const dragHandlers = useVectorDrag<"probe">({
    targets: [
      { id: "probe", x: probe.x, y: probe.y, bounds: PROJECTION_BOUNDS },
    ],
    onDrag(_, pos) {
      setProbe({
        x: clamp(pos.x, PROBE_CLAMP.xMin, PROBE_CLAMP.xMax),
        y: clamp(pos.y, PROBE_CLAMP.yMin, PROBE_CLAMP.yMax),
      });
    },
  });

  const { containerRef, canvasRef } = useCanvas2D(
    {
      initialBounds: PROJECTION_BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const target = PROJECTION_TARGETS[targetId];
        const m = target.modes[modeId];
        drawAxes(ctx, plot, theme, [-4, -2, 2, 4], [-2, 2]);

        const { x, y } = probe;
        const [px, py] = m.project(x, y);

        // Target subspace: emphasize the target line.
        if (target.id === "x-axis") {
          drawSegment(
            ctx,
            plot,
            PROJECTION_BOUNDS.xMin,
            0,
            PROJECTION_BOUNDS.xMax,
            0,
            {
              color: theme.border,
              width: 3,
            },
          );
        } else {
          drawSegment(ctx, plot, -4, -4, 4, 4, {
            color: theme.border,
            width: 3,
          });
        }

        const ox = plot.toScreenX(0);
        const oy = plot.toScreenY(0);
        const xTipX = plot.toScreenX(x);
        const xTipY = plot.toScreenY(y);
        const pxTipX = plot.toScreenX(px);
        const pxTipY = plot.toScreenY(py);

        // Residual (I - P)x: dashed segment from Px to x.
        drawSegment(ctx, plot, px, py, x, y, {
          color: theme.muted,
          width: 1.5,
          dash: [5, 4],
        });

        // x arrow (ink) and Px arrow (accent).
        drawArrow(ctx, ox, oy, xTipX - ox, xTipY - oy, theme.ink, 10, 7, 2);
        drawArrow(
          ctx,
          ox,
          oy,
          pxTipX - ox,
          pxTipY - oy,
          theme.accent,
          10,
          7,
          2,
        );

        // Hollow ring at Px: projecting again lands on the same point (P^2 x = Px).
        drawPoint(ctx, plot, px, py, {
          color: theme.accent,
          filled: false,
          radius: 7,
          width: 2,
        });
      },
      ...dragHandlers,
    },
    [targetId, modeId, probe],
  );

  const [px, py] = mode.project(probe.x, probe.y);
  const rx = probe.x - px;
  const ry = probe.y - py;

  return (
    <ExpandableDemo height={height}>
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
            <CapsuleTabs
              options={TARGET_OPTIONS}
              value={targetId}
              onChange={(id: ProjectionTargetId) => setTargetId(id)}
              label="投到:"
            />
            <CapsuleTabs
              options={MODE_OPTIONS}
              value={modeId}
              onChange={(id: ProjectionModeId) => setModeId(id)}
            />
            <ParamSlider
              label={<InlineMath tex="x" />}
              min={PROBE_CLAMP.xMin}
              max={PROBE_CLAMP.xMax}
              step={0.05}
              value={probe.x}
              onChange={(v: number) => setProbe((s) => ({ ...s, x: v }))}
              widthClass="w-32"
            />
            <ParamSlider
              label={<InlineMath tex="y" />}
              min={PROBE_CLAMP.yMin}
              max={PROBE_CLAMP.yMax}
              step={0.05}
              value={probe.y}
              onChange={(v: number) => setProbe((s) => ({ ...s, y: v }))}
              widthClass="w-32"
            />
          </div>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath
              tex={`x = (${probe.x.toFixed(2)}, ${probe.y.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath tex={`P = ${mode.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`Px = ${mode.texPx} = (${px.toFixed(2)}, ${py.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath
              tex={`(I-P)x = ${mode.texResidual} = (${rx.toFixed(2)}, ${ry.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath
              tex={`P^2x = Px = (${px.toFixed(2)}, ${py.toFixed(2)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          用 x/y 滑块调整向量,选择目标直线(x 轴或
          y=x)与投影方式(正交/斜);空心圈表示再投影一次仍是同一落点;滚轮缩放,中键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
