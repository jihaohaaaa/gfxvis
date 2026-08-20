import { useState, useMemo } from "react";
import {
  drawAdaptiveAxes,
  drawArrow,
  drawDragGizmo,
  drawDragGuideTrack,
  drawPoint,
  drawSegment,
  getVisibleBounds,
} from "../../visualizations/core/2d/plot2d";
import {
  DEFAULT_X,
  PROBE_CLAMP,
  PROJECTION_BOUNDS,
  PROJECTION_TARGETS,
  type ProjectionModeId,
  type ProjectionTargetId,
} from "../../visualizations/scenes/linear-algebra/projection2d";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { clamp } from "@math";
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

function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  textColor: string,
  borderColor?: string,
) {
  ctx.save();
  ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const paddingX = 8;
  const h = 20;
  const w = textWidth + paddingX * 2;
  const rx = x - w / 2;
  const ry = y - h / 2;
  const radius = h / 2;

  ctx.beginPath();
  ctx.roundRect(rx, ry, w, h, radius);
  ctx.fillStyle = bgColor;
  ctx.fill();
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 2D projection explorer: x/y sliders set the vector; pick target line and mode. */
export default function ProjectionDemo({ height }: { height?: string }) {
  const [targetId, setTargetId] = useState<ProjectionTargetId>("x-axis");
  const [modeId, setModeId] = useState<ProjectionModeId>("orthogonal");
  const [probe, setProbe] = useState(DEFAULT_X);

  const mode = PROJECTION_TARGETS[targetId].modes[modeId];

  const gizmoArrows = useMemo(() => {
    const dirSubspace = targetId === "x-axis" ? { x: 1, y: 0 } : { x: 1, y: 1 };
    let dirResidual = { x: 0, y: 1 };
    if (targetId === "line-yx") {
      dirResidual = modeId === "orthogonal" ? { x: -1, y: 1 } : { x: 0, y: 1 };
    }
    return [
      {
        id: "subspace",
        direction: dirSubspace,
        color: "#2563eb",
        label: "L",
        lengthPx: 34,
      },
      {
        id: "residual",
        direction: dirResidual,
        color: "#64748b",
        label: "L^⊥",
        lengthPx: 34,
      },
    ];
  }, [targetId, modeId]);

  const dragHandlers = useVectorDrag<"probe">({
    targets: [
      {
        id: "probe",
        x: probe.x,
        y: probe.y,
        bounds: PROBE_CLAMP,
        arrows: gizmoArrows,
      },
    ],
    onDrag(_, pos) {
      setProbe({
        x: clamp(pos.x, PROBE_CLAMP.xMin, PROBE_CLAMP.xMax),
        y: clamp(pos.y, PROBE_CLAMP.yMin, PROBE_CLAMP.yMax),
      });
    },
  });

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: PROJECTION_BOUNDS,
      margin: MARGIN,
      onLeftDown: dragHandlers.onLeftDown,
      onLeftMove: dragHandlers.onLeftMove,
      onLeftUp: dragHandlers.onLeftUp,
      onHover: dragHandlers.onHover,
      onPointerLeave: dragHandlers.onPointerLeave,
      draw(ctx, plot, theme) {
        const target = PROJECTION_TARGETS[targetId];
        const m = target.modes[modeId];
        drawAdaptiveAxes(ctx, plot, theme);

        const activeTrack = dragHandlers.getActiveTrack();
        if (activeTrack) {
          drawDragGuideTrack(ctx, plot, activeTrack);
        }

        const { x, y } = probe;
        const [px, py] = m.project(x, y);
        const rx = x - px;
        const ry = y - py;

        // Target subspace: emphasize the target line across the visible viewport
        const visible = getVisibleBounds(plot);
        if (target.id === "x-axis") {
          drawSegment(ctx, plot, visible.xMin, 0, visible.xMax, 0, {
            color: theme.border,
            width: 3,
          });
        } else {
          const minVal = Math.min(visible.xMin, visible.yMin);
          const maxVal = Math.max(visible.xMax, visible.yMax);
          drawSegment(ctx, plot, minVal, minVal, maxVal, maxVal, {
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
          width: 1.8,
          dash: [5, 4],
        });

        // Right-angle marker for orthogonal projection
        if (modeId === "orthogonal" && Math.hypot(rx, ry) > 0.3) {
          // Line direction in screen space
          const lineDirX = targetId === "x-axis" ? 1 : 1 / Math.SQRT2;
          const lineDirY = targetId === "x-axis" ? 0 : -1 / Math.SQRT2; // y inverted in screen space
          // Dot with residual to face the corner toward x
          const resDx = xTipX - pxTipX;
          const resDy = xTipY - pxTipY;
          const resLen = Math.hypot(resDx, resDy) || 1;
          const resNormX = resDx / resLen;
          const resNormY = resDy / resLen;

          // Line orientation facing toward origin or away depending on dot
          const lineSign =
            (pxTipX - ox) * lineDirX + (pxTipY - oy) * lineDirY >= 0 ? 1 : -1;
          const uX = lineDirX * lineSign;
          const uY = lineDirY * lineSign;

          const cornerSize = 10;
          ctx.save();
          ctx.strokeStyle = theme.muted;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(pxTipX + uX * cornerSize, pxTipY + uY * cornerSize);
          ctx.lineTo(
            pxTipX + uX * cornerSize + resNormX * cornerSize,
            pxTipY + uY * cornerSize + resNormY * cornerSize,
          );
          ctx.lineTo(
            pxTipX + resNormX * cornerSize,
            pxTipY + resNormY * cornerSize,
          );
          ctx.stroke();
          ctx.restore();
        }

        // x arrow (ink) and Px arrow (accent).
        drawArrow(ctx, ox, oy, xTipX - ox, xTipY - oy, theme.ink, 10, 7, 2.4);
        drawArrow(
          ctx,
          ox,
          oy,
          pxTipX - ox,
          pxTipY - oy,
          theme.accent,
          10,
          7,
          2.6,
        );

        // Hollow ring at Px: projecting again lands on the same point (P^2 x = Px).
        drawPoint(ctx, plot, px, py, {
          color: theme.accent,
          filled: false,
          radius: 6,
          width: 2,
        });

        // Interactive Transform Gizmo at tip x
        drawDragGizmo(ctx, plot, x, y, {
          color: theme.ink,
          isHoveredCenter: dragHandlers.isCenterHovered("probe"),
          isDraggingCenter: dragHandlers.isCenterDragging("probe"),
          hoveredArrowId: dragHandlers.getHoveredArrowId("probe"),
          draggingArrowId: dragHandlers.getDraggingArrowId("probe"),
          arrows: gizmoArrows,
          opacity: dragHandlers.getOpacity("probe"),
        });

        // 1. Badge for input vector x: x = (x, y)
        const angleX = Math.atan2(xTipY - oy, xTipX - ox);
        const xBadgeDist = 20;
        drawPillBadge(
          ctx,
          xTipX + Math.cos(angleX) * xBadgeDist,
          xTipY + Math.sin(angleX) * xBadgeDist,
          `x = (${x.toFixed(2)}, ${y.toFixed(2)})`,
          "rgba(15, 23, 42, 0.9)",
          "#ffffff",
          "rgba(255, 255, 255, 0.2)",
        );

        // 2. Badge for projected vector Px: Px = (px, py)
        const anglePx = Math.atan2(pxTipY - oy, pxTipX - ox);
        const pxBadgeDist = 22;
        drawPillBadge(
          ctx,
          pxTipX + Math.cos(anglePx + Math.PI / 4) * pxBadgeDist,
          pxTipY + Math.sin(anglePx + Math.PI / 4) * pxBadgeDist,
          `Px = (${px.toFixed(2)}, ${py.toFixed(2)})`,
          "rgba(37, 99, 235, 0.92)",
          "#ffffff",
          "rgba(255, 255, 255, 0.25)",
        );

        // 3. Badge for residual vector (I - P)x: (I - P)x = (rx, ry)
        const midResX = (xTipX + pxTipX) / 2;
        const midResY = (xTipY + pxTipY) / 2;
        const resDx = xTipX - pxTipX;
        const resDy = xTipY - pxTipY;
        const resLen = Math.hypot(resDx, resDy) || 1;
        const perpX = -resDy / resLen;
        const perpY = resDx / resLen;
        const resBadgeDist = 16;

        drawPillBadge(
          ctx,
          midResX + perpX * resBadgeDist,
          midResY + perpY * resBadgeDist,
          `e = (${rx.toFixed(2)}, ${ry.toFixed(2)})`,
          "rgba(100, 116, 139, 0.9)",
          "#ffffff",
          "rgba(255, 255, 255, 0.2)",
        );
      },
    },
    [probe, targetId, modeId],
  );

  const [px, py] = mode.project(probe.x, probe.y);
  const rx = probe.x - px;
  const ry = probe.y - py;

  return (
    <ExpandableDemo id="projection-2d" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>
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
          提示：拖动端点黑心圆点进行 2D 自由移动；拖动蓝色箭头沿子空间{" "}
          <InlineMath tex="L" /> 滑动；拖动灰色箭头沿残差法向{" "}
          <InlineMath tex="L^\perp" /> 滑动（落点 <InlineMath tex="Px" />{" "}
          保持恒定不变！）。支持滚轮缩放与中键/右键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
