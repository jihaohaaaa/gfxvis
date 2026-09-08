import { useState, useEffect, useRef } from "react";
import { Vector3 } from "three";
import {
  createQuotientSpaceScene,
  type QuotientMode,
} from "../../visualizations/scenes/linear-algebra/quotient-space";
import { attachGizmo3D } from "../../visualizations/core/3d/gizmo3d";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import { useViewer3D } from "../framework/useViewer3D";

const MODE_OPTIONS = [
  {
    id: "line" as const,
    label: "模掉一维直线子空间 U (dim U = 1, dim V/U = 2)",
  },
  {
    id: "plane" as const,
    label: "模掉二维平面子空间 U (dim U = 2, dim V/U = 1)",
  },
];

const LINE_PRESETS: PresetOption[] = [
  { id: "diag", label: "体对角线 (1, 1, 1)" },
  { id: "z_axis", label: "标准 z 轴 (0, 0, 1)" },
  { id: "skew_xy", label: "横向斜线 (2, 1, 0)" },
  { id: "skew_xz", label: "切向斜线 (1, 0, 1)" },
  { id: "custom", label: "自定义方向" },
];

const PLANE_PRESETS: PresetOption[] = [
  { id: "diag_plane", label: "等权斜面 x+y+z=0" },
  { id: "xy_plane", label: "标准 xy 平面 (z=0)" },
  { id: "symm_plane", label: "垂直面对角 x-y=0" },
  { id: "tilt_plane", label: "切斜面 x+z=0" },
  { id: "custom", label: "自定义法向" },
];

const SLIDER_MIN = -2.5;
const SLIDER_MAX = 2.5;

export default function QuotientSpaceDemo({ height }: { height?: string }) {
  const [mode, setMode] = useState<QuotientMode>("line");
  const [presetKey, setPresetKey] = useState<string>("diag");
  const [azimuthDeg, setAzimuthDeg] = useState<number>(45);
  const [elevationDeg, setElevationDeg] = useState<number>(35.26);
  const [showAngles, setShowAngles] = useState<boolean>(false);

  const [vector, setVector] = useState({ x: 1.4, y: 1.0, z: 1.5 });
  const [collapseT, setCollapseT] = useState<number>(0);
  const [isSlidingAnim, setIsSlidingAnim] = useState<boolean>(false);
  const showAxes = true;

  const vectorRef = useRef(vector);
  vectorRef.current = vector;
  const collapseRef = useRef(collapseT);
  collapseRef.current = collapseT;
  const azimuthRef = useRef(azimuthDeg);
  azimuthRef.current = azimuthDeg;
  const elevationRef = useRef(elevationDeg);
  elevationRef.current = elevationDeg;

  // Screen-projected positions for floating 3D labels
  const [screenPos, setScreenPos] = useState<{
    point: { x: number; y: number; visible: boolean };
    quotient: { x: number; y: number; visible: boolean };
  }>({
    point: { x: 0, y: 0, visible: false },
    quotient: { x: 0, y: 0, visible: false },
  });

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => createQuotientSpaceScene(),
    ({ api, viewer }) => {
      api.setMode(mode);
      api.setDirection(azimuthRef.current, elevationRef.current);
      api.setVector(
        vectorRef.current.x,
        vectorRef.current.y,
        vectorRef.current.z,
      );
      api.setCollapse(collapseRef.current);
      api.setAxesVisible(showAxes);

      return attachGizmo3D({
        domElement: viewer.renderer.domElement,
        camera: viewer.camera,
        controls: viewer.controls,
        gizmo: api.gizmo,
        bounds: {
          xMin: SLIDER_MIN,
          xMax: SLIDER_MAX,
          yMin: SLIDER_MIN,
          yMax: SLIDER_MAX,
          zMin: SLIDER_MIN,
          zMax: SLIDER_MAX,
        },
        getPosition: () => vectorRef.current,
        onPositionChange: (pos) => {
          setVector(pos);
          api.setVector(pos.x, pos.y, pos.z);
        },
        render: () => viewer.render(),
      });
    },
    [mode, showAxes],
  );

  // Sync mode changes
  const handleModeChange = (newModeId: QuotientMode) => {
    setMode(newModeId);
    if (newModeId === "line") {
      setPresetKey("diag");
      setAzimuthDeg(45);
      setElevationDeg(35.26);
    } else {
      setPresetKey("diag_plane");
      setAzimuthDeg(45);
      setElevationDeg(35.26);
    }
  };

  // Sync presets
  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    if (key === "custom") {
      setShowAngles(true);
      return;
    }
    if (mode === "line") {
      if (key === "diag") {
        setAzimuthDeg(45);
        setElevationDeg(35.26);
      } else if (key === "z_axis") {
        setAzimuthDeg(0);
        setElevationDeg(90);
      } else if (key === "skew_xy") {
        setAzimuthDeg(26.57);
        setElevationDeg(0);
      } else if (key === "skew_xz") {
        setAzimuthDeg(0);
        setElevationDeg(45);
      }
    } else {
      if (key === "diag_plane") {
        setAzimuthDeg(45);
        setElevationDeg(35.26);
      } else if (key === "xy_plane") {
        setAzimuthDeg(0);
        setElevationDeg(90);
      } else if (key === "symm_plane") {
        setAzimuthDeg(-45);
        setElevationDeg(0);
      } else if (key === "tilt_plane") {
        setAzimuthDeg(0);
        setElevationDeg(45);
      }
    }
  };

  // Sync direction angles
  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (api && viewer) {
      api.setDirection(azimuthDeg, elevationDeg);
      viewer.render();
    }
  }, [azimuthDeg, elevationDeg, apiRef, viewerRef]);

  // Sync collapse slider to 3D scene
  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (api && viewer) {
      api.setCollapse(collapseT);
      viewer.render();
    }
  }, [collapseT, apiRef, viewerRef]);

  // Sync vector changes to 3D scene
  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (api && viewer) {
      api.setVector(vector.x, vector.y, vector.z);
      viewer.render();
    }
  }, [vector, apiRef, viewerRef]);

  // Decomposition calculation
  const thetaRad = (azimuthDeg * Math.PI) / 180;
  const phiRad = (elevationDeg * Math.PI) / 180;
  const uX = Math.cos(phiRad) * Math.cos(thetaRad);
  const uY = Math.cos(phiRad) * Math.sin(thetaRad);
  const uZ = Math.sin(phiRad);
  const uVec = new Vector3(uX, uY, uZ).normalize();
  const vVec = new Vector3(vector.x, vector.y, vector.z);

  const dotVal = vVec.dot(uVec);
  const vParallel = uVec.clone().multiplyScalar(dotVal);
  const vPerp = vVec.clone().sub(vParallel);

  const decomp = {
    u: [uVec.x, uVec.y, uVec.z] as [number, number, number],
    parallelVal: dotVal,
    parallel: [vParallel.x, vParallel.y, vParallel.z] as [
      number,
      number,
      number,
    ],
    perp: [vPerp.x, vPerp.y, vPerp.z] as [number, number, number],
  };

  // Smooth animation sliding along fiber
  useEffect(() => {
    if (!isSlidingAnim) return;
    let animId = 0;
    const startS = decomp.parallelVal;
    const startTime = performance.now();

    const frame = (tNow: number) => {
      const elapsed = (tNow - startTime) / 1000;
      const offset = 1.3 * Math.sin(elapsed * 2.5);
      const newS = startS + offset;

      // Update vector by preserving v_perp and changing parallel component
      const curU = new Vector3(...decomp.u);
      const curVPerp = new Vector3(...decomp.perp);
      const newV = curVPerp.clone().addScaledVector(curU, newS);

      const nextPos = {
        x: Number(newV.x.toFixed(2)),
        y: Number(newV.y.toFixed(2)),
        z: Number(newV.z.toFixed(2)),
      };
      setVector(nextPos);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isSlidingAnim, decomp.parallelVal, decomp.u, decomp.perp]);

  // Continuous screen projection for floating HTML badges
  useEffect(() => {
    let rafId = 0;
    const projectToScreen = () => {
      const viewer = viewerRef.current;
      const api = apiRef.current;
      const container = containerRef.current;
      if (viewer && container && api) {
        const camera = viewer.camera;
        const w = container.clientWidth;
        const h = container.clientHeight;

        const toScreen = (pos: Vector3) => {
          const p = pos.clone().project(camera);
          const x = ((p.x + 1) / 2) * w;
          const y = ((-p.y + 1) / 2) * h;
          return { x, y, visible: p.z < 1 };
        };

        const ptPos = api.getPointWorldPos();
        const qPos = api.getQuotientWorldPos();

        setScreenPos({
          point: toScreen(ptPos),
          quotient: toScreen(qPos),
        });
      }
      rafId = requestAnimationFrame(projectToScreen);
    };

    rafId = requestAnimationFrame(projectToScreen);
    return () => cancelAnimationFrame(rafId);
  }, [
    vector,
    mode,
    collapseT,
    azimuthDeg,
    elevationDeg,
    viewerRef,
    containerRef,
    apiRef,
  ]);

  // Dedicated slider handlers: moving strictly along U
  const handleParallelChange = (newS: number) => {
    const newV = vPerp.clone().addScaledVector(uVec, newS);
    setVector({
      x: Number(newV.x.toFixed(2)),
      y: Number(newV.y.toFixed(2)),
      z: Number(newV.z.toFixed(2)),
    });
  };

  const xStr = vector.x.toFixed(1);
  const yStr = vector.y.toFixed(1);
  const zStr = vector.z.toFixed(1);

  const qxStr = (mode === "line" ? vPerp.x : vParallel.x).toFixed(1);
  const qyStr = (mode === "line" ? vPerp.y : vParallel.y).toFixed(1);
  const qzStr = (mode === "line" ? vPerp.z : vParallel.z).toFixed(1);

  const currentPresets = mode === "line" ? LINE_PRESETS : PLANE_PRESETS;

  return (
    <ExpandableDemo id="quotient-space" height={height}>
      <div className="space-y-3">
        {/* Mode Selector */}
        <div className="flex flex-col gap-2">
          <CapsuleTabs
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleModeChange}
          />
        </div>

        {/* Preset Selector & Direction Angle Controls */}
        <div className="bg-card/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-2.5">
          <PresetSelector
            label={
              mode === "line" ? (
                <span>
                  子空间 <InlineMath tex="U" /> 方向预设:
                </span>
              ) : (
                <span>
                  子空间 <InlineMath tex="U" /> 法向预设:
                </span>
              )
            }
            options={currentPresets}
            value={presetKey}
            onChange={handlePresetChange}
          />

          <button
            type="button"
            onClick={() => setShowAngles(!showAngles)}
            className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium transition"
          >
            {showAngles ? (
              <span>收起角度微调 ▲</span>
            ) : (
              <span>
                微调方向角（方位角 <InlineMath tex="\theta" /> / 仰角{" "}
                <InlineMath tex="\phi" />
                ）▼
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Angle Fine-Tuning */}
        {showAngles && (
          <div className="bg-card/30 grid grid-cols-1 gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-2">
            <ParamSlider
              label={
                <span>
                  方位角 <InlineMath tex="\theta" />
                </span>
              }
              value={azimuthDeg}
              min={0}
              max={360}
              step={1}
              onChange={(val) => {
                setAzimuthDeg(val);
                setPresetKey("custom");
              }}
              display={`${azimuthDeg.toFixed(0)}°`}
            />
            <ParamSlider
              label={
                <span>
                  仰角 <InlineMath tex="\phi" />
                </span>
              }
              value={elevationDeg}
              min={-85}
              max={85}
              step={1}
              onChange={(val) => {
                setElevationDeg(val);
                setPresetKey("custom");
              }}
              display={`${elevationDeg.toFixed(0)}°`}
            />
          </div>
        )}

        {/* 3D Canvas Container */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border bg-slate-950"
        >
          {/* Direct child CanvasToolbar */}
          <CanvasToolbar
            onReset={() => {
              const viewer = viewerRef.current;
              if (viewer) {
                viewer.camera.position.set(4.5, 3.8, 5.2);
                viewer.camera.lookAt(0, 0, 0);
                viewer.controls.target.set(0, 0, 0);
                viewer.controls.update();
                viewer.render();
              }
            }}
          />

          {/* Floating Screen Badges */}
          {screenPos.point.visible && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-amber-500/60 bg-amber-950/80 px-2 py-0.5 text-xs font-medium text-amber-300 shadow-md backdrop-blur-sm"
              style={{
                left: `${screenPos.point.x}px`,
                top: `${screenPos.point.y - 12}px`,
              }}
            >
              <span className="font-mono">
                {collapseT < 0.05 ? (
                  <InlineMath
                    tex={`\\mathbf{v} = (${xStr}, ${yStr}, ${zStr})`}
                  />
                ) : (
                  <span>
                    <InlineMath tex="\mathbf{v}(t)" /> 坍缩中
                  </span>
                )}
              </span>
            </div>
          )}

          {screenPos.quotient.visible && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-indigo-500/60 bg-indigo-950/80 px-2 py-0.5 text-xs font-medium text-indigo-200 shadow-md backdrop-blur-sm"
              style={{
                left: `${screenPos.quotient.x}px`,
                top: `${screenPos.quotient.y - 14}px`,
              }}
            >
              <span className="font-mono">
                <InlineMath
                  tex={`[\\mathbf{v}] \\in V/U \\; (${qxStr}, ${qyStr}, ${qzStr})`}
                />
              </span>
            </div>
          )}

          {/* Legend Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded-lg border border-border/50 bg-slate-900/80 p-2 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-muted">
                子空间 <InlineMath tex="U" />（
                {mode === "line" ? "倾斜直线" : "倾斜平面"}）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="text-muted">
                商空间 <InlineMath tex="V/U \cong U^\perp" />（
                {mode === "line" ? "正交商平面" : "正交商法线"}）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-muted">
                当前点 <InlineMath tex="\mathbf{v}" /> 与陪集纤维{" "}
                <InlineMath tex="\mathbf{v} + U" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="text-muted">垂直投影虚线（坍缩轨迹）</span>
            </div>
          </div>
        </div>

        {/* Collapse Slider */}
        <div className="bg-card/40 space-y-1.5 rounded-lg border border-border p-3">
          <ParamSlider
            label={
              <span>
                商空间坍缩进度 <InlineMath tex="t" />
              </span>
            }
            value={collapseT}
            min={0}
            max={1}
            step={0.01}
            onChange={(val) => setCollapseT(val)}
            display={
              collapseT === 0
                ? "t = 0 (3D 原始空间)"
                : collapseT === 1
                  ? "t = 1 (完全压入商空间)"
                  : `t = ${collapseT.toFixed(2)}`
            }
          />
          <p className="text-xs text-muted-foreground">
            当 <InlineMath tex="t" /> 从 0 增至 1 时，所有平行于{" "}
            <InlineMath tex="U" /> 的几何纤维沿 <InlineMath tex="U" />{" "}
            方向等比缩短，最终彻底坍缩为商空间载体 <InlineMath tex="U^\perp" />{" "}
            上的唯一点。
          </p>
        </div>

        {/* Vector Adjustment & Dedicated U-Direction Controls */}
        <div className="bg-card/30 space-y-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
            <span className="text-xs font-semibold text-foreground">
              向量 <InlineMath tex="\mathbf{v}" /> 坐标调节与沿子空间滑动验证
            </span>
            <button
              type="button"
              onClick={() => setIsSlidingAnim(!isSlidingAnim)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                isSlidingAnim
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {isSlidingAnim ? (
                "⏸ 暂停沿纤维滑动"
              ) : (
                <span>
                  ▶ 沿纤维滑动演示（验证 <InlineMath tex="[\mathbf{v}]" />{" "}
                  不变）
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <ParamSlider
              label={<InlineMath tex="v_x" />}
              value={vector.x}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.1}
              onChange={(val) => setVector((prev) => ({ ...prev, x: val }))}
              display={vector.x.toFixed(1)}
            />
            <ParamSlider
              label={<InlineMath tex="v_y" />}
              value={vector.y}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.1}
              onChange={(val) => setVector((prev) => ({ ...prev, y: val }))}
              display={vector.y.toFixed(1)}
            />
            <ParamSlider
              label={<InlineMath tex="v_z" />}
              value={vector.z}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.1}
              onChange={(val) => setVector((prev) => ({ ...prev, z: val }))}
              display={vector.z.toFixed(1)}
            />
          </div>

          {/* Dedicated Along-U Slider */}
          <div className="rounded-md border border-primary/25 bg-primary/5 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                沿子空间 <InlineMath tex="U" /> 移动分量（改变{" "}
                <InlineMath tex="\mathbf{v}_\parallel" />
                ，验证商类 <InlineMath tex="[\mathbf{v}]" /> 绝对静止）
              </span>
              <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-mono text-primary">
                <InlineMath tex="[\mathbf{v}] = \mathbf{v}_\perp" /> 恒定不变
              </span>
            </div>
            <ParamSlider
              label={
                <InlineMath
                  tex={
                    mode === "line"
                      ? "s = \\mathbf{v} \\cdot \\mathbf{u}"
                      : "h = \\mathbf{v} \\cdot \\mathbf{n}"
                  }
                />
              }
              value={decomp.parallelVal}
              min={-3}
              max={3}
              step={0.05}
              onChange={handleParallelChange}
              display={decomp.parallelVal.toFixed(2)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              拖动此滑块，点 <InlineMath tex="\mathbf{v}" />{" "}
              严格在当前陪集纤维内位移；而商空间中的点{" "}
              <InlineMath tex="[\mathbf{v}]" /> 纹丝不动！
            </p>
          </div>
        </div>

        {/* Real-time Math Card */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold text-foreground">
              实时代数分解与商空间等价类
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <InlineMath tex="V = U \oplus U^\perp" />
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <div className="space-y-1">
              <div>
                <strong>子空间基底 / 法向量:</strong>{" "}
                <InlineMath
                  tex={
                    mode === "line"
                      ? `\\mathbf{u} = (${uVec.x.toFixed(2)}, ${uVec.y.toFixed(2)}, ${uVec.z.toFixed(2)})`
                      : `\\mathbf{n} = (${uVec.x.toFixed(2)}, ${uVec.y.toFixed(2)}, ${uVec.z.toFixed(2)})`
                  }
                />
              </div>
              <div>
                <strong>当前点坐标:</strong>{" "}
                <InlineMath tex={`\\mathbf{v} = (${xStr}, ${yStr}, ${zStr})`} />
              </div>
              <div>
                <strong>属于子空间的分量:</strong>{" "}
                <InlineMath
                  tex={`\\mathbf{v}_{\\parallel} = (${decomp.parallel[0].toFixed(2)}, ${decomp.parallel[1].toFixed(2)}, ${decomp.parallel[2].toFixed(2)}) \\in U`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div>
                <strong>商空间代表元 (正交补截面):</strong>{" "}
                <InlineMath
                  tex={`[\\mathbf{v}] = \\mathbf{v}_{\\perp} = (${decomp.perp[0].toFixed(2)}, ${decomp.perp[1].toFixed(2)}, ${decomp.perp[2].toFixed(2)}) \\in U^\\perp`}
                />
              </div>
              <div>
                <strong>陪集等价类形式:</strong>{" "}
                <InlineMath
                  tex={`[\\mathbf{v}] = \\mathbf{v} + U = \\mathbf{v}_{\\perp} + U`}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-border/80 bg-background/60 p-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              💡 商空间核心直觉：
            </span>
            沿任意方向的子空间 <InlineMath tex="U" /> 移动，仅改变{" "}
            <InlineMath tex="\mathbf{v}_\parallel" />
            ，而在商空间中由于{" "}
            <InlineMath tex="\mathbf{v}_\parallel \sim \mathbf{0}" />
            ，商类 <InlineMath tex="[\mathbf{v}]" /> 保持唯一且恒定！
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
