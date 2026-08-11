import { useEffect, useRef, useState } from "react";
import { colormapGradient } from "../../visualizations/core/colormap";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  GRID_DEFAULT,
  GRID_MAX,
  GRID_MIN,
  createCloudScene,
} from "../../visualizations/demos/scalar-field-3d/cloud";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

/**
 * 3D scalar field shown as a discrete point cloud (color = value) with
 * gradient arrows at a subset of points (direction = nabla phi). The density
 * slider rebuilds the lattice (points per axis) on the fly.
 */
export default function ScalarField3DDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createCloudScene> | null>(null);
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const [stats, setStats] = useState({ min: -4, max: 8 });
  const [density, setDensity] = useState(GRID_DEFAULT);
  const [showAxes, setShowAxes] = useState(true);
  const [arrowsVisible, setArrowsVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createCloudScene();
    const viewer = createViewer3D(container, api.scene);
    apiRef.current = api;
    viewerRef.current = viewer;
    setStats(api.getStats());
    return () => {
      viewer.dispose();
      api.dispose();
    };
  }, []);

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
    <ExpandableDemo>
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
            <label className="flex items-center gap-2 text-muted">
              密度
              <input
                type="range"
                min={GRID_MIN}
                max={GRID_MAX}
                step={2}
                value={density}
                onChange={(event) => setDensity(Number(event.target.value))}
                className="w-32 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{density}³</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={arrowsVisible}
                onChange={(event) => setArrowsVisible(event.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              梯度箭头
            </label>
            <AxesToggle checked={showAxes} onChange={setShowAxes} />
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
