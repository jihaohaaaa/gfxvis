import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import { drawArrow, drawAxes } from "../../visualizations/core/plot2d";
import { attachDrag3D } from "../../visualizations/core/drag3d";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  FIELD_BOUNDS,
  SCALAR_FN,
  buildFieldImage,
  contourLevels,
  marchingSquares,
  sampleField,
} from "../../visualizations/demos/scalar-field/field";
import {
  createScalarFieldSurfaceScene,
  type GradientArrowMode,
} from "../../visualizations/demos/scalar-field/surface";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const NX = 180;
const NY = 140;
const MARGIN = 24;

const GRADIENT_MODES: { id: GradientArrowMode; label: string }[] = [
  { id: "horizontal", label: "水平梯度" },
  { id: "steepest", label: "最陡上升(曲面)" },
];

/**
 * Combined scalar-field experiment: 2D heatmap (left) + 3D surface z = phi(x,y)
 * (right) of the same function, sharing one probe. Dragging in either view
 * moves the other synchronously.
 */
export default function ScalarFieldDemo() {
  const container2dRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Canvas2DController | null>(null);
  const container3dRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<
    typeof createScalarFieldSurfaceScene
  > | null>(null);
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const probeRef = useRef({ x: 0.6, y: 0.6 });
  const axesRef = useRef(true);
  const [probe, setProbe] = useState({ x: 0.6, y: 0.6 });
  const [showAxes, setShowAxes] = useState(true);
  const [gradientMode, setGradientMode] =
    useState<GradientArrowMode>("horizontal");
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);

  useEffect(() => {
    const container = container2dRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const field = sampleField(FIELD_BOUNDS, NX, NY);
    const image = buildFieldImage(field);
    const levels = contourLevels(field.min, field.max, 9);
    const contourSegments = levels.flatMap((level) =>
      marchingSquares(field.values, field.nx, field.ny, FIELD_BOUNDS, level),
    );

    const controller = createCanvas2D(container, canvas, {
      initialBounds: FIELD_BOUNDS,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        if (axesRef.current) {
          drawAxes(
            ctx,
            plot,
            theme,
            [-3, -2, -1, 1, 2, 3],
            [-3, -2, -1, 1, 2, 3],
          );
        }

        // Heatmap anchored to its world rect (so zoom/pan keep it correct).
        const hx0 = plot.toScreenX(FIELD_BOUNDS.xMin);
        const hx1 = plot.toScreenX(FIELD_BOUNDS.xMax);
        const hy0 = plot.toScreenY(FIELD_BOUNDS.yMax);
        const hy1 = plot.toScreenY(FIELD_BOUNDS.yMin);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, hx0, hy1, hx1 - hx0, hy0 - hy1);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(hx0, hy0, hx1 - hx0, hy1 - hy0);

        // Level curves (world-space segments).
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [p0, p1] of contourSegments) {
          ctx.moveTo(plot.toScreenX(p0[0]), plot.toScreenY(p0[1]));
          ctx.lineTo(plot.toScreenX(p1[0]), plot.toScreenY(p1[1]));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Sparse gradient arrows.
        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const arrowScale = 0.42;
        for (let x = -2.4; x <= 2.4; x += 1.2) {
          for (let y = -2.4; y <= 2.4; y += 1.2) {
            const gx = SCALAR_FN.gradX(x, y);
            const gy = SCALAR_FN.gradY(x, y);
            const mag = Math.hypot(gx, gy);
            if (mag < 1e-4) continue;
            const len = Math.min(arrowScale, 0.3 * mag);
            drawArrow(
              ctx,
              plot.toScreenX(x),
              plot.toScreenY(y),
              (gx / mag) * len * kx,
              -(gy / mag) * len * ky,
              theme.ink,
              7,
              5,
              1.3,
            );
          }
        }

        // Probe point + gradient arrow.
        const px = probeRef.current.x;
        const py = probeRef.current.y;
        const gx = SCALAR_FN.gradX(px, py);
        const gy = SCALAR_FN.gradY(px, py);
        const mag = Math.hypot(gx, gy);
        const sx = plot.toScreenX(px);
        const sy = plot.toScreenY(py);
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.fill();
        if (mag > 1e-4) {
          const len = Math.min(0.55, 0.38 * mag);
          drawArrow(
            ctx,
            sx,
            sy,
            (gx / mag) * len * kx,
            -(gy / mag) * len * ky,
            theme.accent,
            10,
            7,
            2,
          );
        }
      },
      onHover(e, plot) {
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            FIELD_BOUNDS.xMin,
            FIELD_BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            FIELD_BOUNDS.yMin,
            FIELD_BOUNDS.yMax,
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
            FIELD_BOUNDS.xMin,
            FIELD_BOUNDS.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            FIELD_BOUNDS.yMin,
            FIELD_BOUNDS.yMax,
          ),
        });
      },
    });
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    const container = container3dRef.current;
    if (!container) return;
    const api = createScalarFieldSurfaceScene();
    const viewer = createViewer3D(container, api.scene);
    sceneRef.current = api;
    viewerRef.current = viewer;
    api.setPoint(probeRef.current.x, probeRef.current.y);
    api.setAxesVisible(axesRef.current);
    viewer.render();

    // Place the shared probe from a 3D raycast hit (hover and drag).
    const hitToProbe = (
      hit: { point: { x: number; z: number } } | null,
    ): void => {
      if (!hit) return;
      // Invert mathToWorld: math x = world x, math y = -world z.
      const nx = clamp(hit.point.x, FIELD_BOUNDS.xMin, FIELD_BOUNDS.xMax);
      const ny = clamp(-hit.point.z, FIELD_BOUNDS.yMin, FIELD_BOUNDS.yMax);
      probeRef.current = { x: nx, y: ny };
      setProbe({ x: nx, y: ny });
      api.setPoint(nx, ny);
      viewer.render();
    };

    const detach = attachDrag3D({
      domElement: viewer.renderer.domElement,
      camera: viewer.camera,
      controls: viewer.controls,
      targets: [api.surface],
      onHover(hit) {
        hitToProbe(hit);
      },
      onDrag(hit) {
        hitToProbe(hit);
      },
    });

    return () => {
      detach();
      viewer.dispose();
      api.dispose();
    };
  }, []);

  useEffect(() => {
    probeRef.current = probe;
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
    const api = sceneRef.current;
    const viewer = viewerRef.current;
    if (api && viewer) {
      api.setPoint(probe.x, probe.y);
      api.setAxesVisible(showAxes);
      api.setGradientMode(gradientMode);
      api.setSurfaceTransparent(surfaceTransparent);
      viewer.render();
    }
  }, [probe, showAxes, gradientMode, surfaceTransparent]);

  const phi = SCALAR_FN.phi(probe.x, probe.y);
  const gx = SCALAR_FN.gradX(probe.x, probe.y);
  const gy = SCALAR_FN.gradY(probe.x, probe.y);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div className="grid gap-3 sm:h-[var(--demo-height,24rem)] sm:grid-cols-2">
          <div
            ref={container2dRef}
            className="relative h-64 overflow-hidden rounded-xl border border-border sm:h-full"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-crosshair"
            />
          </div>
          <div
            ref={container3dRef}
            className="h-64 overflow-hidden rounded-xl border border-border sm:h-full"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            <p>
              <InlineMath
                tex={`\\varphi(${probe.x.toFixed(2)}, ${probe.y.toFixed(2)}) = ${phi.toFixed(3)}`}
              />
            </p>
            <p>
              <InlineMath
                tex={`\\nabla\\varphi = (${gx.toFixed(3)}, ${gy.toFixed(3)})`}
              />
            </p>
            <p>
              <InlineMath
                tex={`\\lVert\\nabla\\varphi\\rVert = ${Math.hypot(gx, gy).toFixed(3)}`}
              />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted">箭头:</span>
              {GRADIENT_MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setGradientMode(option.id)}
                  className={
                    gradientMode === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-xs text-accent"
                      : "rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={surfaceTransparent}
                onChange={(event) =>
                  setSurfaceTransparent(event.target.checked)
                }
                className="accent-[var(--color-accent)]"
              />
              曲面透明
            </label>
            <AxesToggle checked={showAxes} onChange={setShowAxes} />
          </div>
        </div>
        <p className="text-xs text-muted">
          任一视图移动鼠标或拖动即可摆放探针,另一视图同步;3D
          箭头可切换:水平梯度或沿曲面最陡上升(曲面默认半透明便于观察);2D:滚轮缩放
          · 中键平移;3D:左键/中键旋转 · 滚轮缩放 · 右键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
