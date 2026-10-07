import { useMemo, useState } from "react";
import {
  HOMOGENEOUS_PRESETS,
  createNurbsHomogeneous3DScene,
  type HomogeneousMode,
  type HomogeneousPreset,
} from "../../visualizations/scenes/graphics/nurbs-homogeneous3d";
import { evaluateNurbsHomogeneous } from "../../visualizations/scenes/graphics/bezier-splines";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import CanvasResizer from "../framework/CanvasResizer";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import KdeCard from "../framework/KdeCard";
import KdeReadout from "../framework/KdeReadout";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import { useViewer3D } from "../framework/useViewer3D";

import "./NurbsWeightGravityDemo.css";
import "./BezierSplineWorkspace.css";

const PRESET_OPTIONS: PresetOption<HomogeneousPreset>[] = [
  {
    id: "arc90",
    label: HOMOGENEOUS_PRESETS.arc90.label,
    description: "w₁ = 1/√2，齐次空间标准多项式通过投影产生真圆",
  },
  {
    id: "parabola",
    label: HOMOGENEOUS_PRESETS.parabola.label,
    description: "经典二次样条升维演示",
  },
];

const MODE_OPTIONS: readonly KdeTabOption<HomogeneousMode>[] = [
  { id: "trace", label: "动态光束追踪 (Trace)" },
  { id: "bundle", label: "全局透视光束丛 (Bundle)" },
];

export default function NurbsHomogeneous3DDemo({
  height,
}: {
  height?: string;
}) {
  const [preset, setPreset] = useState<HomogeneousPreset>("arc90");
  const [mode, setMode] = useState<HomogeneousMode>("trace");
  const [w1, setW1] = useState(HOMOGENEOUS_PRESETS.arc90.defaultW1);
  const [uParam, setUParam] = useState(0.5);

  const { containerRef, viewerRef } = useViewer3D(
    () => createNurbsHomogeneous3DScene(),
    ({ api }) => {
      api.setPreset(preset);
      api.setWeight(w1);
      api.setU(uParam);
      api.setMode(mode);
    },
    [preset, w1, uParam, mode],
  );

  const handleSelectPreset = (key: HomogeneousPreset) => {
    setPreset(key);
    setW1(HOMOGENEOUS_PRESETS[key].defaultW1);
  };

  const handleResetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.position.set(3, 2.5, 4);
      viewerRef.current.camera.lookAt(0, 0, 0);
      viewerRef.current.controls.target.set(0, 0, 0);
      viewerRef.current.controls.update();
    }
  };

  // 实时求值齐次点与投影点数据
  const currentEval = useMemo(() => {
    const { points } = HOMOGENEOUS_PRESETS[preset];
    const weights = [1, w1, 1];
    return evaluateNurbsHomogeneous(
      points,
      weights,
      2,
      uParam,
      [0, 0, 0, 1, 1, 1],
    );
  }, [preset, w1, uParam]);

  const [wx, wy, w] = currentEval.homogeneousPoint;
  const [px, py] = currentEval.projectedPoint;

  return (
    <AutoMath>
      <ExpandableDemo id="nurbs-homogeneous-3d" height={height}>
        <KdeWindowShell
          title="NURBS · 齐次空间升维与超平面透视除法"
          eyebrow="BREEZE WORKSPACE · PROJECTIVE GEOMETRY"
          mark="H"
          modeTag="3D"
          testId="nurbs-homogeneous-3d-demo"
          className="bezier-spline-workspace"
          display={
            <div
              ref={containerRef}
              data-testid="nurbs-homogeneous-3d-canvas"
              className="relative flex-1 min-h-[var(--demo-height,26rem)] h-full w-full overflow-hidden rounded-xl border border-border"
            >
              <CanvasToolbar onReset={handleResetCamera} />
              <div className="absolute top-3 left-3 z-10 pointer-events-none rounded bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200 backdrop-blur-sm border border-slate-700/60 font-mono">
                w=1 超平面 (物理空间) ↔ 3D 齐次多项式空间
              </div>
              <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
            </div>
          }
          controls={
            <div className="nurbs-demo__stack">
              <KdeCard title="曲线场景与透视模式" variant="dense">
                <div className="space-y-2.5">
                  <PresetSelector
                    label="几何场景:"
                    options={PRESET_OPTIONS}
                    value={preset}
                    onChange={handleSelectPreset}
                    size="xs"
                    layout="vertical"
                    testId="nurbs-3d-preset-selector"
                  />
                  <div className="pt-1">
                    <span className="text-xs text-muted block mb-1.5 font-medium">
                      投射视图模式:
                    </span>
                    <KdeTabs<HomogeneousMode>
                      options={MODE_OPTIONS}
                      value={mode}
                      onChange={setMode}
                      size="xs"
                      variant="pill"
                    />
                  </div>
                </div>
              </KdeCard>

              <KdeCard title="齐次参数调节" variant="dense">
                <div className="space-y-3">
                  <ParamSlider
                    label="$w_1$"
                    min={0.1}
                    max={3.0}
                    step={0.01}
                    value={w1}
                    onChange={setW1}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={w1.toFixed(2)}
                  />
                  <ParamSlider
                    label="$u$"
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    value={uParam}
                    onChange={setUParam}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={uParam.toFixed(2)}
                  />
                  <p className="text-xs text-muted leading-relaxed">
                    左键旋转 · 滚轮缩放 · 右键平移。观察 3D 齐次控制点{" "}
                    {"$\\widetilde{\\mathbf{P}}_1$"}{" "}
                    沿原点光束滑动如何精确映射为物理平面上的有理圆弧。
                  </p>
                </div>
              </KdeCard>

              <KdeCard title="透视除法代数映射" variant="dense">
                <div className="space-y-2">
                  <div className="nurbs-demo__readout-row">
                    <span>
                      {"3D 齐次空间点 $\\widetilde{\\mathbf{C}}(u)$:"}
                    </span>
                    <span className="nurbs-demo__readout-val">
                      ({wx.toFixed(2)}, {wy.toFixed(2)}, {w.toFixed(2)})
                    </span>
                  </div>
                  <div className="nurbs-demo__readout-row">
                    <span>齐次权因子分母 $W(u)$:</span>
                    <span className="nurbs-demo__readout-val">
                      {w.toFixed(3)}
                    </span>
                  </div>
                  <div className="nurbs-demo__readout-row">
                    <span>
                      {
                        "透视投影除法 $\\frac{\\widetilde{X}}{W}, \\frac{\\widetilde{Y}}{W}$:"
                      }
                    </span>
                    <span className="nurbs-demo__readout-val">
                      ({px.toFixed(2)}, {py.toFixed(2)})
                    </span>
                  </div>
                  <KdeReadout
                    label="w=1 超平面物理点 C(u)"
                    value={`(${px.toFixed(2)}, ${py.toFixed(2)}, 1.00)`}
                  />
                </div>
              </KdeCard>
            </div>
          }
        />
      </ExpandableDemo>
    </AutoMath>
  );
}
