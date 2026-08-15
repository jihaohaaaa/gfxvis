import { useState, useEffect } from "react";
import { Vector3 } from "three";
import {
  PROJECTION3D_TARGETS,
  createProjection3DScene,
  type ProjectionTargetId,
} from "../../visualizations/scenes/linear-algebra/projection3d";
import type { ProjectionModeId } from "../../visualizations/scenes/linear-algebra/projection2d";
import { mathToWorld } from "../../visualizations/core/3d/coords";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import { useViewer3D } from "../framework/useViewer3D";

const TARGET_OPTIONS: { id: ProjectionTargetId; label: string }[] = [
  { id: "xy-plane", label: "xy 平面" },
  { id: "plane-xyz", label: "x+y+z=0" },
];

const SLIDER_MIN = -2.5;
const SLIDER_MAX = 2.5;

/** 3D projection explorer: sliders set x = (x, y, z); pick target plane + mode. */
export default function Projection3DDemo({ height }: { height?: string }) {
  const [vector, setVector] = useState({ x: 2, y: 1.5, z: 1 });
  const [targetId, setTargetId] = useState<ProjectionTargetId>("xy-plane");
  const [modeId, setModeId] = useState<ProjectionModeId>("orthogonal");
  const showAxes = true;

  const [screenPos, setScreenPos] = useState<{
    xTip: { x: number; y: number; visible: boolean };
    pxTip: { x: number; y: number; visible: boolean };
    midRes: { x: number; y: number; visible: boolean };
  }>({
    xTip: { x: 0, y: 0, visible: false },
    pxTip: { x: 0, y: 0, visible: false },
    midRes: { x: 0, y: 0, visible: false },
  });

  const target = PROJECTION3D_TARGETS[targetId];
  const mode = target.modes[modeId];
  const modeOptions = Object.values(target.modes).map((m) => ({
    id: m.id,
    label: m.label,
  }));

  const { containerRef, viewerRef } = useViewer3D(
    () => createProjection3DScene(),
    ({ api }) => {
      api.setTarget(targetId);
      api.setMode(modeId);
      api.setVector(vector.x, vector.y, vector.z);
      api.setAxesVisible(showAxes);
    },
    [vector, targetId, modeId, showAxes],
  );

  const [px, py, pz] = mode.project(vector.x, vector.y, vector.z);
  const [rx, ry, rz] = mode.residual(vector.x, vector.y, vector.z);

  // Continuously update 3D -> 2D screen positions as camera moves
  useEffect(() => {
    let rafId = 0;
    const projectToScreen = () => {
      const viewer = viewerRef.current;
      const container = containerRef.current;
      if (viewer && container) {
        const camera = viewer.camera;
        const w = container.clientWidth;
        const h = container.clientHeight;

        const [currPx, currPy, currPz] = mode.project(
          vector.x,
          vector.y,
          vector.z,
        );
        const wx = mathToWorld(vector.x, vector.y, vector.z);
        const wpx = mathToWorld(currPx, currPy, currPz);
        const wmid = [
          (wx[0] + wpx[0]) / 2,
          (wx[1] + wpx[1]) / 2,
          (wx[2] + wpx[2]) / 2,
        ];

        const toScreen = (pt: number[]) => {
          const v = new Vector3(pt[0], pt[1], pt[2]);
          v.project(camera);
          return {
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible:
              v.z < 1 && v.x >= -1.1 && v.x <= 1.1 && v.y >= -1.1 && v.y <= 1.1,
          };
        };

        setScreenPos({
          xTip: toScreen(wx),
          pxTip: toScreen(wpx),
          midRes: toScreen(wmid),
        });
      }
      rafId = requestAnimationFrame(projectToScreen);
    };

    rafId = requestAnimationFrame(projectToScreen);
    return () => cancelAnimationFrame(rafId);
  }, [vector, targetId, modeId, mode, viewerRef, containerRef]);

  return (
    <ExpandableDemo id="projection-3d" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,24rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar />

          {/* 3D Floating Vector Badges */}
          {screenPos.xTip.visible && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-900/90 px-2.5 py-0.5 text-xs font-bold text-white shadow-md backdrop-blur-xs select-none"
              style={{ left: screenPos.xTip.x, top: screenPos.xTip.y - 14 }}
            >
              x = ({vector.x.toFixed(2)}, {vector.y.toFixed(2)},{" "}
              {vector.z.toFixed(2)})
            </div>
          )}

          {screenPos.pxTip.visible && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-blue-600/90 px-2.5 py-0.5 text-xs font-bold text-white shadow-md backdrop-blur-xs select-none"
              style={{ left: screenPos.pxTip.x, top: screenPos.pxTip.y + 14 }}
            >
              Px = ({px.toFixed(2)}, {py.toFixed(2)}, {pz.toFixed(2)})
            </div>
          )}

          {screenPos.midRes.visible && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-md backdrop-blur-xs select-none"
              style={{ left: screenPos.midRes.x, top: screenPos.midRes.y }}
            >
              (I - P)x = ({rx.toFixed(2)}, {ry.toFixed(2)}, {rz.toFixed(2)})
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CapsuleTabs
              options={TARGET_OPTIONS}
              value={targetId}
              onChange={(id: ProjectionTargetId) => setTargetId(id)}
              label="目标平面:"
            />
            <CapsuleTabs
              options={modeOptions}
              value={modeId}
              onChange={(id: ProjectionModeId) => setModeId(id)}
            />
            <ParamSlider
              label={<InlineMath tex="x" />}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.05}
              value={vector.x}
              onChange={(v) => setVector((s) => ({ ...s, x: v }))}
              widthClass="w-32"
            />
            <ParamSlider
              label={<InlineMath tex="y" />}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.05}
              value={vector.y}
              onChange={(v) => setVector((s) => ({ ...s, y: v }))}
              widthClass="w-32"
            />
            <ParamSlider
              label={<InlineMath tex="z" />}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.05}
              value={vector.z}
              onChange={(v) => setVector((s) => ({ ...s, z: v }))}
              widthClass="w-32"
            />
          </div>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            目标平面 <InlineMath tex={target.tex} />
          </p>
          <p>
            <InlineMath
              tex={`x = (${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath tex={`P = ${mode.tex}`} />
          </p>
          <p>
            <InlineMath
              tex={`Px = ${mode.texPx} = (${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath
              tex={`(I-P)x = ${mode.texResidual} = (${rx.toFixed(2)}, ${ry.toFixed(2)}, ${rz.toFixed(2)})`}
            />
          </p>
          <p>
            <InlineMath
              tex={`P^2x = Px = (${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)})`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          左键/中键旋转 · 滚轮缩放 · 右键平移;用滑块调整
          x=(x,y,z),切换目标平面(xy 平面或
          x+y+z=0)与投影方式(正交/斜);空心环为再投影一次的落点 P²x=Px。
        </p>
      </div>
    </ExpandableDemo>
  );
}
