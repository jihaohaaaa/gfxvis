import { useEffect, useRef, useState } from "react";
import { colormapGradient } from "../../visualizations/core/colormap";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  createSliceScene,
  CUBE_HALF,
  type SliceAxis,
} from "../../visualizations/demos/scalar-field-3d/slices";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const AXIS_OPTIONS: { id: SliceAxis; label: string }[] = [
  { id: "x", label: "x" },
  { id: "y", label: "y" },
  { id: "z", label: "z" },
];

export default function ScalarField3DDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createSliceScene> | null>(null);
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const [axis, setAxis] = useState<SliceAxis>("z");
  const [position, setPosition] = useState(0.5);
  const [stats, setStats] = useState({ min: -4, max: 8 });
  const [showAxes, setShowAxes] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createSliceScene();
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
    api.setSlice(axis, position);
    api.setAxesVisible(showAxes);
    viewer.render();
  }, [axis, position, showAxes]);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted">切片轴:</span>
            {AXIS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAxis(option.id)}
                className={
                  axis === option.id
                    ? "rounded-full border border-accent px-3 py-1 text-accent"
                    : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-muted">
            {axis} = {position.toFixed(2)}
            <input
              type="range"
              min={-CUBE_HALF}
              max={CUBE_HALF}
              step={0.05}
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              className="w-48 accent-[var(--color-accent)]"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{stats.min.toFixed(1)}</span>
            <div
              className="h-3 w-32 rounded-full border border-border"
              style={{ background: colormapGradient("coolwarm") }}
            />
            <span>{stats.max.toFixed(1)}</span>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;切换切片轴并用滑块移动切片平面。
        </p>
      </div>
    </ExpandableDemo>
  );
}
