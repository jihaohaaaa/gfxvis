import { useEffect, useRef, useState } from "react";
import { clamp } from "../../visualizations/core/math";
import { attachDrag3D } from "../../visualizations/core/drag3d";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  createSurfaceScene,
  DOMAIN,
  SURFACE_FN,
} from "../../visualizations/demos/bivariate/surface";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

export default function TangentPlaneDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createSurfaceScene> | null>(null);
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const [point, setPoint] = useState({ x: 0.8, y: 0.6 });
  const [showAxes, setShowAxes] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createSurfaceScene();
    const viewer = createViewer3D(container, api.scene);
    sceneRef.current = api;
    viewerRef.current = viewer;

    api.setPoint(point.x, point.y);
    api.setAxesVisible(showAxes);
    viewer.render();

    const detach = attachDrag3D({
      domElement: viewer.renderer.domElement,
      camera: viewer.camera,
      controls: viewer.controls,
      targets: [api.surface],
      onDrag(hit) {
        // Invert mathToWorld: math x = world x, math y = -world z.
        const nx = clamp(hit.point.x, -DOMAIN, DOMAIN);
        const ny = clamp(-hit.point.z, -DOMAIN, DOMAIN);
        setPoint({ x: nx, y: ny });
        api.setPoint(nx, ny);
        viewer.render();
      },
    });

    return () => {
      detach();
      viewer.dispose();
      api.dispose();
    };
  }, []);

  useEffect(() => {
    const api = sceneRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setAxesVisible(showAxes);
    viewer.render();
  }, [showAxes]);

  const { x, y } = point;
  const z = SURFACE_FN.f(x, y);
  const fx = SURFACE_FN.fx(x, y);
  const fy = SURFACE_FN.fy(x, y);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            <p>
              f({x.toFixed(2)}, {y.toFixed(2)}) = {z.toFixed(3)}
            </p>
            <p>
              ∂f/∂x = {fx.toFixed(3)} · ∂f/∂y = {fy.toFixed(3)}
            </p>
            <p>
              法向量 n = ({(-fx).toFixed(2)}, {(-fy).toFixed(2)}, 1)
            </p>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;在曲面上拖拽移动切点。
        </p>
      </div>
    </ExpandableDemo>
  );
}
