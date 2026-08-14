import { useEffect, useState } from "react";
import {
  PARAMETRIC_SURFACES,
  createParametricSurfaceScene,
  type SurfaceId,
} from "../../visualizations/scenes/calculus/parametric-surface3d";
import CapsuleTabs from "../framework/CapsuleTabs";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useViewer3D } from "../framework/useViewer3D";

const SURFACE_OPTIONS: { id: SurfaceId; label: string }[] = [
  { id: "sphere", label: "球面" },
  { id: "graph", label: "函数图像" },
];

/** 3D parametric surface: u/v sliders, parameter grid, highlighted curves. */
export default function ParametricSurfaceDemo({ height }: { height?: string }) {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>("sphere");
  const [u, setU] = useState(1.2);
  const [v, setV] = useState(1.5);
  const showAxes = true;
  const [tangentsVisible, setTangentsVisible] = useState(true);

  const surface = PARAMETRIC_SURFACES[surfaceId];
  const [x, y, z] = surface.point(u, v);
  const [dux, duy, duz] = surface.du(u, v);
  const [dvx, dvy, dvz] = surface.dv(u, v);

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => createParametricSurfaceScene(),
    ({ api, viewer }) => {
      api.setSurface(surfaceId);
      api.setParams(u, v);
      api.setAxesVisible(showAxes);
      api.setTangentsVisible(tangentsVisible);
      viewer.render();
    },
  );

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
    <ExpandableDemo height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CapsuleTabs
              options={SURFACE_OPTIONS}
              value={surfaceId}
              onChange={handleSurfaceChange}
            />
            <ParamSlider
              label={<InlineMath tex="u" />}
              min={surface.uMin}
              max={surface.uMax}
              step={0.02}
              value={u}
              onChange={setU}
              widthClass="w-36"
            />
            <ParamSlider
              label={<InlineMath tex="v" />}
              min={surface.vMin}
              max={surface.vMax}
              step={0.02}
              value={v}
              onChange={setV}
              widthClass="w-36"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              label="切线"
              checked={tangentsVisible}
              onChange={setTangentsVisible}
            />
          </div>
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
