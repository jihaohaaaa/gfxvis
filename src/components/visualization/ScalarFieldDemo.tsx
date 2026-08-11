import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  createCanvas2D,
  type Canvas2DController,
} from "../../visualizations/core/canvas2d";
import {
  drawArrow,
  drawAxes,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import { attachDrag3D } from "../../visualizations/core/drag3d";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  FIELDS2D,
  buildFieldImage,
  contourLevels,
  marchingSquares,
  sampleField,
  type Field2DId,
  type FieldSample,
  type Segment,
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

const FIELD_OPTIONS: { id: Field2DId; label: string }[] = [
  { id: "sincos", label: "sin x cos y" },
  { id: "circle", label: "圆族" },
  { id: "parabola", label: "抛物线族" },
];

const GRADIENT_MODES: { id: GradientArrowMode; label: string }[] = [
  { id: "horizontal", label: "水平梯度" },
  { id: "steepest", label: "最陡上升(曲面)" },
];

interface HeatData {
  image: HTMLCanvasElement | null;
  contourSegments: Segment[];
  bounds: Bounds2;
  sample: FieldSample | null;
}

/** Sample a field once (c = 0) and precompute heatmap + contours. */
function buildHeat(fieldId: Field2DId): HeatData {
  const f = FIELDS2D[fieldId];
  const sample = sampleField(f, f.bounds, NX, NY, 0);
  return {
    image: buildFieldImage(sample),
    contourSegments: contourLevels(sample.min, sample.max, 9).flatMap((level) =>
      marchingSquares(sample.values, sample.nx, sample.ny, f.bounds, level),
    ),
    bounds: f.bounds,
    sample,
  };
}

const INITIAL_HEAT: HeatData = {
  image: null,
  contourSegments: [],
  bounds: FIELDS2D.sincos.bounds,
  sample: null,
};

/**
 * Combined scalar-field experiment: 2D heatmap (left) + 3D surface z = phi(x,y)
 * (right) of the same function, sharing one probe. The field F can be switched
 * (sin x cos y / circle family / parabola family) and the level constant c
 * adjusts the zero level set.
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
  const fieldIdRef = useRef<Field2DId>("sincos");
  const cRef = useRef(0);
  const probeRef = useRef({ x: 0.6, y: 0.6 });
  const axesRef = useRef(true);
  const heatRef = useRef<HeatData>(INITIAL_HEAT);
  const [fieldId, setFieldId] = useState<Field2DId>("sincos");
  const [c, setC] = useState(0);
  const [probe, setProbe] = useState({ x: 0.6, y: 0.6 });
  const [showAxes, setShowAxes] = useState(true);
  const [gradientMode, setGradientMode] =
    useState<GradientArrowMode>("horizontal");
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);

  const field = FIELDS2D[fieldId];

  // Field change: rebuild the 2D heatmap data and the 3D surface.
  useEffect(() => {
    fieldIdRef.current = fieldId;
    const f = FIELDS2D[fieldId];
    heatRef.current = buildHeat(fieldId);
    controllerRef.current?.setBounds(f.bounds);
    sceneRef.current?.setField(f);
    setC(f.defaultC);
    setProbe((p) => ({
      x: clamp(p.x, f.bounds.xMin, f.bounds.xMax),
      y: clamp(p.y, f.bounds.yMin, f.bounds.yMax),
    }));
  }, [fieldId]);

  useEffect(() => {
    const container = container2dRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controller = createCanvas2D(container, canvas, {
      initialBounds: FIELDS2D.sincos.bounds,
      margin: MARGIN,
      draw(ctx, plot, theme) {
        const f = FIELDS2D[fieldIdRef.current];
        const pc = cRef.current;
        const { image, contourSegments, bounds, sample } = heatRef.current;
        if (axesRef.current) drawAxes(ctx, plot, theme, f.ticksX, f.ticksY);
        if (!image) return;

        // Heatmap anchored to its world rect (so zoom/pan keep it correct).
        const hx0 = plot.toScreenX(bounds.xMin);
        const hx1 = plot.toScreenX(bounds.xMax);
        const hy0 = plot.toScreenY(bounds.yMax);
        const hy1 = plot.toScreenY(bounds.yMin);
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

        // Highlight the current level set F = c (via marching squares).
        if (f.hasC && sample) {
          const level = clamp(pc, sample.min, sample.max);
          const segments = marchingSquares(
            sample.values,
            sample.nx,
            sample.ny,
            bounds,
            level,
          );
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (const [p0, p1] of segments) {
            ctx.moveTo(plot.toScreenX(p0[0]), plot.toScreenY(p0[1]));
            ctx.lineTo(plot.toScreenX(p1[0]), plot.toScreenY(p1[1]));
          }
          ctx.stroke();
        }

        // Sparse gradient arrows across the field bounds.
        const kx = plot.toScreenX(1) - plot.toScreenX(0);
        const ky = plot.toScreenY(0) - plot.toScreenY(1);
        const arrowScale = 0.42;
        const n = 5;
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j <= n; j++) {
            const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * i) / n;
            const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * j) / n;
            const gx = f.gradX(x, y);
            const gy = f.gradY(x, y);
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
        const gx = f.gradX(px, py);
        const gy = f.gradY(px, py);
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
        const f = FIELDS2D[fieldIdRef.current];
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            f.bounds.xMin,
            f.bounds.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            f.bounds.yMin,
            f.bounds.yMax,
          ),
        });
      },
      onLeftDown() {
        return true;
      },
      onLeftMove(e, plot) {
        const f = FIELDS2D[fieldIdRef.current];
        const rect = canvas.getBoundingClientRect();
        setProbe({
          x: clamp(
            plot.toWorldX(e.clientX - rect.left),
            f.bounds.xMin,
            f.bounds.xMax,
          ),
          y: clamp(
            plot.toWorldY(e.clientY - rect.top),
            f.bounds.yMin,
            f.bounds.yMax,
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
    const api = createScalarFieldSurfaceScene(FIELDS2D.sincos);
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
      const f = FIELDS2D[fieldIdRef.current];
      // Invert mathToWorld: math x = world x, math y = -world z.
      const nx = clamp(hit.point.x, f.bounds.xMin, f.bounds.xMax);
      const ny = clamp(-hit.point.z, f.bounds.yMin, f.bounds.yMax);
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
    sceneRef.current?.setC(c);
    controllerRef.current?.redraw();
  }, [c]);

  useEffect(() => {
    probeRef.current = probe;
    axesRef.current = showAxes;
    controllerRef.current?.redraw();
    const api = sceneRef.current;
    const viewer = viewerRef.current;
    if (api && viewer) {
      api.setPoint(probe.x, probe.y);
      api.setC(c);
      api.setAxesVisible(showAxes);
      api.setGradientMode(gradientMode);
      api.setSurfaceTransparent(surfaceTransparent);
      viewer.render();
    }
  }, [probe, showAxes, gradientMode, surfaceTransparent, c]);

  const value = field.phi(probe.x, probe.y, c);
  const gx = field.gradX(probe.x, probe.y);
  const gy = field.gradY(probe.x, probe.y);

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
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {FIELD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFieldId(option.id)}
                  className={
                    fieldId === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-xs text-accent"
                      : "rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {field.hasC && (
              <label className="flex items-center gap-2 text-muted">
                <InlineMath tex="c" />
                <input
                  type="range"
                  min={field.cMin}
                  max={field.cMax}
                  step={0.05}
                  value={c}
                  onChange={(event) => setC(Number(event.target.value))}
                  className="w-36 accent-[var(--color-accent)]"
                />
                <span className="tabular-nums">{c.toFixed(2)}</span>
              </label>
            )}
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
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`\\varphi(x,y) = ${field.texAt(c)}`} />
          </p>
          <p>
            <InlineMath
              tex={`\\varphi(${probe.x.toFixed(2)}, ${probe.y.toFixed(2)}) = ${value.toFixed(3)}`}
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
          {field.hasC && (
            <p>
              <InlineMath
                tex={`F(x,y) = ${c.toFixed(2)} \\Rightarrow ${field.levelTex(c)}`}
              />
            </p>
          )}
        </div>
        <p className="text-xs text-muted">
          切换字段,圆族/抛物线族可调 c(accent 实线为零等值线
          F=c);任一视图移动鼠标或拖动摆放探针,另一视图同步;3D
          箭头可切换水平梯度/最陡上升;2D:滚轮缩放 · 中键平移;3D:左键/中键旋转 ·
          滚轮缩放 · 右键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
