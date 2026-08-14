import { useEffect, useState } from "react";
import { colormapGradient } from "../../visualizations/core/colormap";
import {
  GRID_DEFAULT,
  GRID_MAX,
  GRID_MIN,
  createCloudScene,
} from "../../visualizations/demos/scalar-field-3d/cloud";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import ParamSlider from "../framework/ParamSlider";
import { useViewer3D } from "../framework/useViewer3D";

/**
 * 3D scalar field shown as a discrete point cloud (color = value) with
 * gradient arrows at a subset of points (direction = nabla phi). The density
 * slider rebuilds the lattice (points per axis) on the fly.
 */
export default function ScalarField3DDemo({ height }: { height?: string }) {
  const [stats, setStats] = useState({ min: -4, max: 8 });
  const [density, setDensity] = useState(GRID_DEFAULT);
  const showAxes = true;
  const [arrowsVisible, setArrowsVisible] = useState(true);

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => createCloudScene(),
    ({ api, viewer }) => {
      setStats(api.getStats());
      viewer.render();
    },
  );

  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setDensity(density);
    api.setAxesVisible(showAxes);
    api.setArrowsVisible(arrowsVisible);
    viewer.render();
  }, [density, showAxes, arrowsVisible]);

  return (
    <ExpandableDemo height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{stats.min.toFixed(1)}</span>
              <div
                className="h-3 w-32 rounded-full border border-border"
                style={{ background: colormapGradient("coolwarm") }}
              />
              <span>{stats.max.toFixed(1)}</span>
            </div>
            <ParamSlider
              label="密度"
              min={GRID_MIN}
              max={GRID_MAX}
              step={2}
              value={density}
              onChange={setDensity}
              widthClass="w-32"
              display={`${density}³`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              label="梯度箭头"
              checked={arrowsVisible}
              onChange={setArrowsVisible}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;颜色为场值,箭头为 ∇φ
          方向;拖动"密度"滑块调整采样点多少。
        </p>
      </div>
    </ExpandableDemo>
  );
}
