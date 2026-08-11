import { useEffect, useRef, useState } from "react";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  PARAMETRIC_SURFACES,
  createParametricSurfaceScene,
  type SurfaceId,
} from "../../visualizations/demos/parametric/surface3d";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const SURFACE_OPTIONS: { id: SurfaceId; label: string }[] = [
  { id: "sphere", label: "球面" },
  { id: "graph", label: "函数图像" },
];

/** 3D parametric surface: u/v sliders, parameter grid, highlighted curves. */
export default function ParametricSurfaceDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createParametricSurfaceScene> | null>(
    null,
  );
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("sphere");
  const [u, setU] = useState(1.2);
  const [v, setV] = useState(1.5);
  const [showAxes, setShowAxes] = useState(true);
  const [tangentsVisible, setTangentsVisible] = useState(true);

  const surface = PARAMETRIC_SURFACES[surfaceId];
  const [x, y, z] = surface.point(u, v);
  const [dux, duy, duz] = surface.du(u, v);
  const [dvx, dvy, dvz] = surface.dv(u, v);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createParametricSurfaceScene();
    const viewer = createViewer3D(container, api.scene);
    apiRef.current = api;
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      api.dispose();
    };
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setSurface(surfaceId);
    api.setParams(u, v);
    api.setAxesVisible(showAxes);
    api.setTangentsVisible(tangentsVisible);
    viewer.render();
  }, [surfaceId, u, v, showAxes, tangentsVisible]);

  const handleSurfaceChange = (id: SurfaceId): void => {
    setSurfaceId(id);
    const s = PARAMETRIC_SURFACES[id];
    setU(s.defaults.u);
    setV(s.defaults.v);
  };

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {SURFACE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSurfaceChange(option.id)}
                  className={
                    surfaceId === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-accent"
                      : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-muted">
              <InlineMath tex="u" />
              <input
                type="range"
                min={surface.uMin}
                max={surface.uMax}
                step={0.02}
                value={u}
                onChange={(event) => setU(Number(event.target.value))}
                className="w-36 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{u.toFixed(2)}</span>
            </label>
            <label className="flex items-center gap-2 text-muted">
              <InlineMath tex="v" />
              <input
                type="range"
                min={surface.vMin}
                max={surface.vMax}
                step={0.02}
                value={v}
                onChange={(event) => setV(Number(event.target.value))}
                className="w-36 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{v.toFixed(2)}</span>
            </label>
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={tangentsVisible}
              onChange={(event) => setTangentsVisible(event.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            切线
          </label>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`\\mathbf r(u,v) = ${surface.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`\\mathbf r(${u.toFixed(2)}, ${v.toFixed(2)}) = (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`}
            />
          </p>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath
              tex={`\\frac{\\partial \\mathbf r}{\\partial u} = ${surface.duTex}`}
            />
          </p>
          <p>
            <InlineMath
              tex={`\\frac{\\partial \\mathbf r}{\\partial u}(${u.toFixed(2)}, ${v.toFixed(2)}) = (${dux.toFixed(3)}, ${duy.toFixed(3)}, ${duz.toFixed(3)})`}
            />
          </p>
          <p>
            <InlineMath
              tex={`\\frac{\\partial \\mathbf r}{\\partial v} = ${surface.dvTex}`}
            />
          </p>
          <p>
            <InlineMath
              tex={`\\frac{\\partial \\mathbf r}{\\partial v}(${u.toFixed(2)}, ${v.toFixed(2)}) = (${dvx.toFixed(3)}, ${dvy.toFixed(3)}, ${dvz.toFixed(3)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;黄色为固定 v 的 u
          参数曲线,青色为固定 u 的 v 参数曲线,红点是 r(u,v);黄/青箭头为
          ∂r/∂u、∂r/∂v,浅蓝面为切平面。
        </p>
      </div>
    </ExpandableDemo>
  );
}
