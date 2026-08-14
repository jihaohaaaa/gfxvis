import { useEffect, useState } from "react";
import { clamp } from "../../visualizations/core/common/math";
import { attachDrag3D } from "../../visualizations/core/3d/drag3d";
import {
  DOMAIN,
  SURFACE_FN,
  createSurfaceScene,
} from "../../visualizations/scenes/calculus/bivariate-surface";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useViewer3D } from "../framework/useViewer3D";

export default function TangentPlaneDemo({ height }: { height?: string }) {
  const [point, setPoint] = useState({ x: 0.8, y: 0.6 });
  const showAxes = true;
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => createSurfaceScene(),
    ({ api, viewer }) => {
      api.setPoint(point.x, point.y);
      api.setAxesVisible(showAxes);
      viewer.render();
      return attachDrag3D({
        domElement: viewer.renderer.domElement,
        camera: viewer.camera,
        controls: viewer.controls,
        targets: [api.surface],
        onDrag(hit) {
          if (!hit) return;
          // Invert mathToWorld: math x = world x, math y = -world z.
          const nx = clamp(hit.point.x, -DOMAIN, DOMAIN);
          const ny = clamp(-hit.point.z, -DOMAIN, DOMAIN);
          setPoint({ x: nx, y: ny });
          api.setPoint(nx, ny);
          viewer.render();
        },
      });
    },
  );

  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setAxesVisible(showAxes);
    api.setSurfaceTransparent(surfaceTransparent);
    viewer.render();
  }, [showAxes, surfaceTransparent]);

  const { x, y } = point;
  const z = SURFACE_FN.f(x, y);
  const fx = SURFACE_FN.fx(x, y);
  const fy = SURFACE_FN.fy(x, y);

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
            <p>
              <InlineMath
                tex={`f(${x.toFixed(2)}, ${y.toFixed(2)}) = ${z.toFixed(3)}`}
              />
            </p>
            <p>
              <InlineMath
                tex={`\\frac{\\partial f}{\\partial x} = ${fx.toFixed(3)}, \\quad \\frac{\\partial f}{\\partial y} = ${fy.toFixed(3)}`}
              />
            </p>
            <p>
              法向量{" "}
              <InlineMath
                tex={`n = (${(-fx).toFixed(2)}, ${(-fy).toFixed(2)}, 1)`}
              />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              label="曲面透明"
              checked={surfaceTransparent}
              onChange={setSurfaceTransparent}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 ·
          右键平移;在曲面上拖拽移动切点;曲面默认半透明便于观察法线与切平面。
        </p>
      </div>
    </ExpandableDemo>
  );
}
