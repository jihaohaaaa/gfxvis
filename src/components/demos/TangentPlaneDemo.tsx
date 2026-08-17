import { useState, useRef } from "react";
import {
  DOMAIN,
  SURFACE_FN,
  createSurfaceScene,
} from "../../visualizations/scenes/calculus/bivariate-surface";
import { attachGizmo3D } from "../../visualizations/core/3d/gizmo3d";
import CanvasToolbar from "../framework/CanvasToolbar";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useViewer3D } from "../framework/useViewer3D";

export default function TangentPlaneDemo({ height }: { height?: string }) {
  const [point, setPoint] = useState({ x: 0.8, y: 0.6 });
  const showAxes = true;
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);

  const pointRef = useRef(point);
  pointRef.current = point;

  const { containerRef } = useViewer3D(
    () => createSurfaceScene(),
    ({ api, viewer }) => {
      api.setPoint(pointRef.current.x, pointRef.current.y);
      api.setAxesVisible(showAxes);
      api.setSurfaceTransparent(surfaceTransparent);

      return attachGizmo3D({
        domElement: viewer.renderer.domElement,
        camera: viewer.camera,
        controls: viewer.controls,
        gizmo: api.gizmo,
        bounds: {
          xMin: -DOMAIN,
          xMax: DOMAIN,
          yMin: -DOMAIN,
          yMax: DOMAIN,
        },
        surfaceFunc: (x, y) => SURFACE_FN.f(x, y),
        getPosition: () => ({
          x: pointRef.current.x,
          y: pointRef.current.y,
          z: SURFACE_FN.f(pointRef.current.x, pointRef.current.y),
        }),
        onPositionChange: (pos) => {
          setPoint({ x: pos.x, y: pos.y });
          api.setPoint(pos.x, pos.y);
        },
        render: () => viewer.render(),
      });
    },
    [showAxes, surfaceTransparent],
  );

  const { x, y } = point;
  const z = SURFACE_FN.f(x, y);
  const fx = SURFACE_FN.fx(x, y);
  const fy = SURFACE_FN.fy(x, y);

  return (
    <ExpandableDemo id="tangent-plane" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar />
        </div>
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
