import { useState } from "react";
import {
  SPACE_CURVES,
  createCurve3DScene,
  type SpaceCurveId,
} from "../../visualizations/scenes/calculus/parametric-curve3d";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useViewer3D } from "../framework/useViewer3D";

const CURVE_OPTIONS: { id: SpaceCurveId; label: string }[] = [
  { id: "circle", label: "圆" },
  { id: "helix", label: "螺旋线" },
  { id: "trefoil", label: "三叶结" },
];

/** 3D space-curve explorer: circle / helix / trefoil knot with a t slider. */
export default function ParametricCurve3DDemo({ height }: { height?: string }) {
  const [curveId, setCurveId] = useState<SpaceCurveId>("circle");
  const [t, setT] = useState(1.0);
  const showAxes = true;

  const curve = SPACE_CURVES[curveId];
  const [x, y, z] = curve.point(t);

  const { containerRef } = useViewer3D(
    () => createCurve3DScene(),
    ({ api }) => {
      api.setCurve(curveId);
      api.setT(t);
      api.setAxesVisible(showAxes);
    },
    [curveId, t, showAxes],
  );

  const handleCurveChange = (id: SpaceCurveId): void => {
    setCurveId(id);
    setT(SPACE_CURVES[id].defaultT);
  };

  return (
    <ExpandableDemo id="parametric-curve-3d" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,24rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CapsuleTabs
              options={CURVE_OPTIONS}
              value={curveId}
              onChange={handleCurveChange}
            />
            <ParamSlider
              label={<InlineMath tex="t" />}
              min={curve.tMin}
              max={curve.tMax}
              step={0.01}
              value={t}
              onChange={setT}
              widthClass="w-44"
            />
          </div>
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
