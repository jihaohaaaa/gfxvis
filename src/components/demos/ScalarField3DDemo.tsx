import { useState, useRef } from "react";
import { colormapGradient } from "../../visualizations/core/common/colormap";
import {
  CUBE_HALF,
  GRID_DEFAULT,
  GRID_MAX,
  GRID_MIN,
  createCloudScene,
  FIELD3D,
} from "../../visualizations/scenes/calculus/scalar-field-3d";
import { attachGizmo3D } from "../../visualizations/core/3d/gizmo3d";
import Checkbox from "../framework/Checkbox";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector from "../framework/PresetSelector";
import { useViewer3D } from "../framework/useViewer3D";

const PROBE_PRESETS = [
  { id: "p1", label: "点 A (1.0, 0.8, 0.5)", pos: { x: 1.0, y: 0.8, z: 0.5 } },
  {
    id: "saddle",
    label: "鞍点原点 (0, 0, 0)",
    pos: { x: 0.0, y: 0.0, z: 0.0 },
  },
  {
    id: "xy_high",
    label: "XY 平面高值 (1.5, 1.2, 0.0)",
    pos: { x: 1.5, y: 1.2, z: 0.0 },
  },
  {
    id: "z_low",
    label: "Z 轴谷底 (0.0, 0.0, 1.6)",
    pos: { x: 0.0, y: 0.0, z: 1.6 },
  },
];

/**
 * 3D scalar field shown as a discrete point cloud (color = value) with
 * gradient arrows, plus an interactive 3D Transform Translation Gizmo probe
 * (3 axis arrows + 3 plane squares + center handle) with live field readout.
 */
export default function ScalarField3DDemo({ height }: { height?: string }) {
  const [stats, setStats] = useState({ min: -4, max: 8 });
  const [density, setDensity] = useState(GRID_DEFAULT);
  const [arrowsVisible, setArrowsVisible] = useState(true);
  const [probePreset, setProbePreset] = useState<string>("p1");
  const [probe, setProbe] = useState<{ x: number; y: number; z: number }>({
    x: 1.0,
    y: 0.8,
    z: 0.5,
  });

  const probeRef = useRef(probe);
  probeRef.current = probe;

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => createCloudScene(),
    ({ api, viewer }) => {
      setStats(api.getStats());
      api.setDensity(density);
      api.setAxesVisible(true);
      api.setArrowsVisible(arrowsVisible);
      api.setProbe(probeRef.current.x, probeRef.current.y, probeRef.current.z);

      return attachGizmo3D({
        domElement: viewer.renderer.domElement,
        camera: viewer.camera,
        controls: viewer.controls,
        gizmo: api.gizmo,
        bounds: {
          xMin: -CUBE_HALF,
          xMax: CUBE_HALF,
          yMin: -CUBE_HALF,
          yMax: CUBE_HALF,
          zMin: -CUBE_HALF,
          zMax: CUBE_HALF,
        },
        getPosition: () => probeRef.current,
        onPositionChange: (pos) => {
          setProbe(pos);
          setProbePreset("custom");
          api.setProbe(pos.x, pos.y, pos.z);
        },
        render: () => viewer.render(),
      });
    },
    [density, arrowsVisible],
  );

  const handlePreset = (presetId: string) => {
    setProbePreset(presetId);
    const target = PROBE_PRESETS.find((p) => p.id === presetId);
    if (target) {
      setProbe(target.pos);
      if (apiRef.current && viewerRef.current) {
        apiRef.current.setProbe(target.pos.x, target.pos.y, target.pos.z);
        viewerRef.current.render();
      }
    }
  };

  const val = FIELD3D.f(probe.x, probe.y, probe.z);
  const gx = FIELD3D.gradX(probe.x);
  const gy = FIELD3D.gradY(probe.y);
  const gz = FIELD3D.gradZ(probe.z);
  const gradMag = Math.hypot(gx, gy, gz);

  return (
    <ExpandableDemo id="scalar-field-3d" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar />
        </div>

        {/* Preset Controls */}
        <PresetSelector
          label="空间探针预设:"
          options={PROBE_PRESETS}
          value={probePreset}
          onChange={handlePreset}
        />

        {/* Live Mathematical Analysis Cards */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">
              3D 探针位置与标量场值
            </p>
            <div className="space-y-1 text-xs text-muted">
              <p>
                坐标点 <InlineMath tex="P(x, y, z)" />:{" "}
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  ({probe.x.toFixed(2)}, {probe.y.toFixed(2)},{" "}
                  {probe.z.toFixed(2)})
                </span>
              </p>
              <p>
                场值 <InlineMath tex="\varphi = x^2 + y^2 - z^2" />:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {val.toFixed(3)}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">
              局部梯度向量与最大上升率
            </p>
            <div className="space-y-1 text-xs text-muted">
              <p>
                梯度 <InlineMath tex="\nabla \varphi = (2x, 2y, -2z)" />:{" "}
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  ({gx.toFixed(2)}, {gy.toFixed(2)}, {gz.toFixed(2)})
                </span>
              </p>
              <p>
                梯度模长 <InlineMath tex="\|\nabla \varphi\|" />:{" "}
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {gradMag.toFixed(3)}
                </span>
                <span className="ml-1 text-[11px] text-muted">
                  (空间最速上升方向)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Sliders & Toggles */}
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
              label="网格梯度场"
              checked={arrowsVisible}
              onChange={setArrowsVisible}
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          左键按住金黄色探针直接在 3D 空间拖动 · 左键/中键空白旋转 · 滚轮缩放 ·
          右键平移；金黄大箭头为探针处的梯度 <InlineMath tex="\nabla \varphi" />{" "}
          方向，橙色虚线为坐标投影辅助线。
        </p>
      </div>
    </ExpandableDemo>
  );
}
