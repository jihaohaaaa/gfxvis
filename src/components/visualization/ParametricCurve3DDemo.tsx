import { useEffect, useRef, useState } from "react";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  SPACE_CURVES,
  createCurve3DScene,
  type SpaceCurveId,
} from "../../visualizations/demos/parametric/curve3d";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

const CURVE_OPTIONS: { id: SpaceCurveId; label: string }[] = [
  { id: "circle", label: "圆" },
  { id: "helix", label: "螺旋线" },
  { id: "trefoil", label: "三叶结" },
];

/** 3D space-curve explorer: circle / helix / trefoil knot with a t slider. */
export default function ParametricCurve3DDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ReturnType<typeof createCurve3DScene> | null>(null);
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const [curveId, setCurveId] = useState<SpaceCurveId>("circle");
  const [t, setT] = useState(1.0);
  const [showAxes, setShowAxes] = useState(true);

  const curve = SPACE_CURVES[curveId];
  const [x, y, z] = curve.point(t);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createCurve3DScene();
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
    api.setCurve(curveId);
    api.setT(t);
    api.setAxesVisible(showAxes);
    viewer.render();
  }, [curveId, t, showAxes]);

  const handleCurveChange = (id: SpaceCurveId): void => {
    setCurveId(id);
    setT(SPACE_CURVES[id].defaultT);
  };

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,24rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {CURVE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCurveChange(option.id)}
                  className={
                    curveId === option.id
                      ? "rounded-full border border-accent px-3 py-1 text-accent"
                      : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-muted">
              <InlineMath tex="t" />
              <input
                type="range"
                min={curve.tMin}
                max={curve.tMax}
                step={0.01}
                value={t}
                onChange={(event) => setT(Number(event.target.value))}
                className="w-44 accent-[var(--color-accent)]"
              />
              <span className="tabular-nums">{t.toFixed(2)}</span>
            </label>
          </div>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            <InlineMath tex={`\\mathbf r(t) = ${curve.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`\\mathbf r(${t.toFixed(2)}) = (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;拖动 t
          观察点沿空间曲线运动,蓝色箭头为速度方向。
        </p>
      </div>
    </ExpandableDemo>
  );
}
