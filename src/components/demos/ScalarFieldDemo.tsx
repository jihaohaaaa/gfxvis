import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import {
  drawArrow,
  drawAxes,
  drawPoint,
  type Bounds2,
} from "../../visualizations/core/plot2d";
import { attachDrag3D } from "../../visualizations/core/drag3d";
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
import CapsuleTabs from "../framework/CapsuleTabs";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useViewer3D } from "../framework/useViewer3D";

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
export default function ScalarFieldDemo({ height }: { height?: string }) {
  const [fieldId, setFieldId] = useState<Field2DId>("sincos");
  const [c, setC] = useState(0);
  const [probe, setProbe] = useState({ x: 0.6, y: 0.6 });
  const showAxes = true;
  const [gradientMode, setGradientMode] =
    useState<GradientArrowMode>("horizontal");
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);
  const fieldIdRef = useRef<Field2DId>("sincos");
  const cRef = useRef(0);
  const probeRef = useRef({ x: 0.6, y: 0.6 });
  const axesRef = useRef(true);
  const heatRef = useRef<HeatData>(INITIAL_HEAT);

  const field = FIELDS2D[fieldId];

  const {
    containerRef: container2dRef,
    canvasRef,
    redraw: redraw2d,
    setBounds: setBounds2d,
  } = useCanvas2D({
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
      drawPoint(ctx, plot, px, py, {
        color: theme.accent,
        filled: true,
        radius: 5,
      });
      if (mag > 1e-4) {
        const len = Math.min(0.55, 0.38 * mag);
        drawArrow(
          ctx,
          plot.toScreenX(px),
          plot.toScreenY(py),
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
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
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
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
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

  const {
    containerRef: container3dRef,
    apiRef: sceneRef,
    viewerRef,
  } = useViewer3D(
    () => createScalarFieldSurfaceScene(FIELDS2D.sincos),
    ({ api, viewer }) => {
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

      return attachDrag3D({
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
    },
  );

  // Field change: rebuild the 2D heatmap data and the 3D surface.
  useEffect(() => {
    fieldIdRef.current = fieldId;
    const f = FIELDS2D[fieldId];
    heatRef.current = buildHeat(fieldId);
    setBounds2d(f.bounds);
    sceneRef.current?.setField(f);
    setC(f.defaultC);
    setProbe((p) => ({
      x: clamp(p.x, f.bounds.xMin, f.bounds.xMax),
      y: clamp(p.y, f.bounds.yMin, f.bounds.yMax),
    }));
  }, [fieldId, setBounds2d]);

  useEffect(() => {
    sceneRef.current?.setC(c);
    redraw2d();
  }, [c, redraw2d]);

  useEffect(() => {
    probeRef.current = probe;
    axesRef.current = showAxes;
    redraw2d();
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
  }, [probe, showAxes, gradientMode, surfaceTransparent, c, redraw2d]);

  const value = field.phi(probe.x, probe.y, c);
  const gx = field.gradX(probe.x, probe.y);
  const gy = field.gradY(probe.x, probe.y);

  return (
    <ExpandableDemo height={height}>
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
            <CapsuleTabs
              options={FIELD_OPTIONS}
              value={fieldId}
              onChange={(id: Field2DId) => setFieldId(id)}
              size="xs"
            />
            {field.hasC && (
              <ParamSlider
                label={<InlineMath tex="c" />}
                min={field.cMin}
                max={field.cMax}
                step={0.05}
                value={c}
                onChange={setC}
                widthClass="w-36"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CapsuleTabs
              options={GRADIENT_MODES}
              value={gradientMode}
              onChange={(id: GradientArrowMode) => setGradientMode(id)}
              size="xs"
              label="箭头:"
            />
            <Checkbox
              label="曲面透明"
              checked={surfaceTransparent}
              onChange={setSurfaceTransparent}
            />
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
