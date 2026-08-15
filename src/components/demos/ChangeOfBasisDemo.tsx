import React, { useState, useRef, useEffect } from "react";
import {
  Scene,
  Group,
  ArrowHelper,
  Vector3,
  MeshStandardMaterial,
  Mesh,
  LineSegments,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
} from "three";
import ExpandableDemo from "../framework/ExpandableDemo";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ParamSlider from "../framework/ParamSlider";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useViewer3D } from "../framework/useViewer3D";
import {
  drawAdaptiveAxes,
  getVisibleBounds,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import {
  addStandardLights,
  addGroundGrid,
  disposeObject,
} from "../../visualizations/core/3d/three-utils";
import { mathToWorld } from "../../visualizations/core/3d/coords";

type DemoMode = "2d" | "3d";
type Preset2D = "standard" | "rot45" | "shear" | "general";
type Preset3D = "identity" | "yaw45" | "pitch30" | "roll45" | "fps";

const DEMO_MODES: Array<{ id: DemoMode; label: string }> = [
  { id: "2d", label: "2D 基变换与坐标换算" },
  { id: "3d", label: "3D 图形学矩阵与局部坐标系 [r, f, u]" },
];

const BOUNDS_2D: Bounds2 = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };

interface BasisPreset2D {
  name: string;
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  desc: string;
}

const PRESETS_2D: Record<Preset2D, BasisPreset2D> = {
  standard: {
    name: "标准基 I",
    c1: { x: 1.0, y: 0.0 },
    c2: { x: 0.0, y: 1.0 },
    desc: "新基与标准基重合，过渡矩阵为单位矩阵，两套坐标数值完全一致。",
  },
  rot45: {
    name: "45° 旋转基",
    c1: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    c2: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    desc: "将坐标轴逆时针旋转 45°，基向量保持正交且保持单位长度。",
  },
  shear: {
    name: "水平剪切基",
    c1: { x: 1.0, y: 0.0 },
    c2: { x: 1.0, y: 1.0 },
    desc: "保持 x 轴基底不变，将 y 轴基底斜向右上方倾斜 45°。",
  },
  general: {
    name: "一般非正交基",
    c1: { x: 1.4, y: 0.4 },
    c2: { x: -0.6, y: 1.2 },
    desc: "非正交且不同模长的两组基底，网格呈现任意仿射平行四边形形态。",
  },
};

interface PresetConfig3D {
  name: string;
  yaw: number;
  pitch: number;
  roll: number;
  desc: string;
}

const PRESETS_3D: Record<Preset3D, PresetConfig3D> = {
  identity: {
    name: "原点姿态 I",
    yaw: 0,
    pitch: 0,
    roll: 0,
    desc: "局部坐标系与世界标准基完全重合，旋转矩阵 R = I。",
  },
  yaw45: {
    name: "纯偏航 (Yaw 45°)",
    yaw: 45,
    pitch: 0,
    roll: 0,
    desc: "绕垂直 Z 轴（Up）逆时针旋转 45°，垂直 Up 轴保持不变，水平面基底旋转。",
  },
  pitch30: {
    name: "俯仰抬头 (Pitch 30°)",
    yaw: 0,
    pitch: 30,
    roll: 0,
    desc: "绕横向 X 轴（Right）旋转 30°，Right 轴保持不变，前向与上向基底倾斜。",
  },
  roll45: {
    name: "翻滚倾斜 (Roll 45°)",
    yaw: 0,
    pitch: 0,
    roll: 45,
    desc: "绕前向 Y 轴（Forward）旋转 45°，Forward 轴保持不变，左右与上下基底倾斜。",
  },
  fps: {
    name: "第一人称视角 (FPS Look)",
    yaw: 60,
    pitch: -20,
    roll: 0,
    desc: "典型的第一人称相机姿态：水平偏转 60° 并俯视 20°，Forward 轴指向视线方向。",
  },
};

function fmt(v: number): string {
  const s = v.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function multiply3x3(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      result[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
    }
  }
  return result;
}

function drawPixelSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 2,
  dash: number[] = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawPixelPoint(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  radius = 6,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// 2D View Sub-component
function View2D({ showAxes }: { showAxes: boolean }) {
  const [presetKey, setPresetKey] = useState<Preset2D>("rot45");
  const [vVec, setVVec] = useState<{ x: number; y: number }>({
    x: 1.5,
    y: 1.2,
  });

  const activePreset = PRESETS_2D[presetKey];
  const { c1, c2 } = activePreset;

  // Basis Matrix P_C = [c1, c2] = [c1.x, c2.x; c1.y, c2.y]
  const detP = c1.x * c2.y - c2.x * c1.y;
  const invP = {
    a11: c2.y / detP,
    a12: -c2.x / detP,
    a21: -c1.y / detP,
    a22: c1.x / detP,
  };

  // [v]_C = P_C^-1 * [v]_B
  const vC = {
    x: invP.a11 * vVec.x + invP.a12 * vVec.y,
    y: invP.a21 * vVec.x + invP.a22 * vVec.y,
  };

  const stateRef = useRef({
    showAxes,
    c1,
    c2,
    vVec,
    vC,
  });
  stateRef.current = { showAxes, c1, c2, vVec, vC };

  const isDraggingRef = useRef(false);

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: BOUNDS_2D,
      onLeftDown(e, plot) {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        isDraggingRef.current = true;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const wx = plot.toWorldX(px);
        const wy = plot.toWorldY(py);
        setVVec({ x: wx, y: wy });
        return true;
      },
      onLeftMove(e, plot) {
        if (!isDraggingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const wx = plot.toWorldX(px);
        const wy = plot.toWorldY(py);
        setVVec({ x: wx, y: wy });
      },
      onLeftUp() {
        isDraggingRef.current = false;
      },
      draw(ctx, plot, theme) {
        const { width, height } = plot;
        ctx.clearRect(0, 0, width, height);
        const st = stateRef.current;

        const toCanvas = (wx: number, wy: number) => ({
          x: plot.toScreenX(wx),
          y: plot.toScreenY(wy),
        });

        // 1. Standard Reference Axes & Grid
        if (st.showAxes) {
          drawAdaptiveAxes(ctx, plot, theme);
        }

        // 2. Deformed Grid of Basis C (dynamically scaled to viewport)
        const visible = getVisibleBounds(plot);
        const maxExtent =
          Math.max(
            Math.abs(visible.xMin),
            Math.abs(visible.xMax),
            Math.abs(visible.yMin),
            Math.abs(visible.yMax),
          ) + 2;
        const gridLines = Math.min(18, Math.ceil(maxExtent));

        ctx.save();
        ctx.strokeStyle = "rgba(59, 130, 246, 0.25)"; // blue-500
        ctx.lineWidth = 1;
        for (let i = -gridLines; i <= gridLines; i++) {
          const span = gridLines * 1.5;
          const start1 = toCanvas(
            i * st.c1.x - span * st.c2.x,
            i * st.c1.y - span * st.c2.y,
          );
          const end1 = toCanvas(
            i * st.c1.x + span * st.c2.x,
            i * st.c1.y + span * st.c2.y,
          );
          ctx.beginPath();
          ctx.moveTo(start1.x, start1.y);
          ctx.lineTo(end1.x, end1.y);
          ctx.stroke();

          const start2 = toCanvas(
            -span * st.c1.x + i * st.c2.x,
            -span * st.c1.y + i * st.c2.y,
          );
          const end2 = toCanvas(
            span * st.c1.x + i * st.c2.x,
            span * st.c1.y + i * st.c2.y,
          );
          ctx.beginPath();
          ctx.moveTo(start2.x, start2.y);
          ctx.lineTo(end2.x, end2.y);
          ctx.stroke();
        }
        ctx.restore();

        const pOrigin = toCanvas(0, 0);
        const pC1 = toCanvas(st.c1.x, st.c1.y);
        const pC2 = toCanvas(st.c2.x, st.c2.y);
        const pV = toCanvas(st.vVec.x, st.vVec.y);

        // 3. Basis vectors c1, c2
        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pC1.x,
          pC1.y,
          "#2563eb",
          2.5,
        );
        drawPixelPoint(ctx, pC1.x, pC1.y, "#2563eb", 5);
        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#2563eb";
        ctx.fillText(
          `c₁ (${st.c1.x.toFixed(2)}, ${st.c1.y.toFixed(2)})`,
          pC1.x + 8,
          pC1.y - 6,
        );
        ctx.restore();

        drawPixelSegment(
          ctx,
          pOrigin.x,
          pOrigin.y,
          pC2.x,
          pC2.y,
          "#06b6d4",
          2.5,
        );
        drawPixelPoint(ctx, pC2.x, pC2.y, "#06b6d4", 5);
        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillStyle = "#06b6d4";
        ctx.fillText(
          `c₂ (${st.c2.x.toFixed(2)}, ${st.c2.y.toFixed(2)})`,
          pC2.x + 8,
          pC2.y - 6,
        );
        ctx.restore();

        // 4. Interactive Vector v (Amber)
        drawPixelSegment(ctx, pOrigin.x, pOrigin.y, pV.x, pV.y, "#d97706", 3.5);
        drawPixelPoint(ctx, pV.x, pV.y, "#d97706", 7);
        ctx.save();
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillStyle = "#d97706";
        ctx.fillText(`向量 v`, pV.x + 10, pV.y - 8);
        ctx.restore();
      },
    },
    [presetKey, showAxes, vVec],
  );

  return (
    <div className="space-y-4">
      {/* 2D Presets */}
      <PresetSelector
        label={
          <>
            新基 <InlineMath tex="\mathcal{C}" /> 预设:
          </>
        }
        options={PRESETS_2D}
        value={presetKey}
        onChange={setPresetKey}
      />

      {/* 2D Canvas Container */}
      <div
        ref={containerRef}
        className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
      >
        <CanvasToolbar onReset={resetBounds} />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
      </div>

      {/* 2D Coordinate & Matrix Panel */}
      <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            同一向量在两组基下的坐标快照
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">标准基坐标：</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                <InlineMath
                  tex={`[v]_{\\mathcal{B}} = (${vVec.x.toFixed(2)},\\, ${vVec.y.toFixed(2)})^\\top`}
                />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">新基坐标：</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                <InlineMath
                  tex={`[v]_{\\mathcal{C}} = P_{\\mathcal{C}}^{-1} [v]_{\\mathcal{B}} = (${vC.x.toFixed(2)},\\, ${vC.y.toFixed(2)})^\\top`}
                />
              </span>
            </div>
            <div className="text-muted text-[11px] pt-1 border-t border-border/50">
              <span className="mr-1">几何恒等验证：</span>
              <InlineMath
                tex={`${vC.x.toFixed(2)} c_1 + ${vC.y.toFixed(2)} c_2 = (${vVec.x.toFixed(2)},\\, ${vVec.y.toFixed(2)})^\\top`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground">基矩阵与过渡矩阵</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">基矩阵：</span>
              <InlineMath
                tex={`P_{\\mathcal{C}} = \\begin{pmatrix} ${c1.x.toFixed(2)} & ${c2.x.toFixed(2)} \\\\ ${c1.y.toFixed(2)} & ${c2.y.toFixed(2)} \\end{pmatrix}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">过渡矩阵：</span>
              <InlineMath
                tex={`P_{\\mathcal{C} \\leftarrow \\mathcal{B}} = P_{\\mathcal{C}}^{-1} = \\begin{pmatrix} ${invP.a11.toFixed(2)} & ${invP.a12.toFixed(2)} \\\\ ${invP.a21.toFixed(2)} & ${invP.a22.toFixed(2)} \\end{pmatrix}`}
              />
            </div>
            <p className="text-[11px] text-muted leading-normal pt-1 border-t border-border/50">
              {activePreset.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3D View Sub-component (Z-up Right-Handed System)
interface Viewer3DApi {
  scene: Scene;
  setTransformation: (
    r: { x: number; y: number; z: number },
    f: { x: number; y: number; z: number },
    u: { x: number; y: number; z: number },
    showFrustum: boolean,
  ) => void;
  setAxesVisible: (visible: boolean) => void;
  dispose: () => void;
}

function create3DScene(): Viewer3DApi {
  const scene = new Scene();
  addStandardLights(scene);
  addGroundGrid(scene, 6, 12);

  const axesWorldGroup = new Group();
  // Math Z-up World Axes: X (Red, Right), Y (Green, Forward), Z (Blue, Up)
  const dirX = new Vector3(...mathToWorld(1, 0, 0));
  const dirY = new Vector3(...mathToWorld(0, 1, 0));
  const dirZ = new Vector3(...mathToWorld(0, 0, 1));
  const origin = new Vector3(0, 0, 0);

  axesWorldGroup.add(new ArrowHelper(dirX, origin, 2.2, 0xef4444, 0.2, 0.1));
  axesWorldGroup.add(new ArrowHelper(dirY, origin, 2.2, 0x10b981, 0.2, 0.1));
  axesWorldGroup.add(new ArrowHelper(dirZ, origin, 2.2, 0x3b82f6, 0.2, 0.1));
  scene.add(axesWorldGroup);

  // Rotating Frame Group
  const frameGroup = new Group();

  // Local Transformed Axes: Right r (Red), Forward f (Green), Up u (Blue)
  const arrowR = new ArrowHelper(dirX, origin, 2.0, 0xef4444, 0.3, 0.15);
  const arrowF = new ArrowHelper(dirY, origin, 2.0, 0x10b981, 0.3, 0.15);
  const arrowU = new ArrowHelper(dirZ, origin, 2.0, 0x3b82f6, 0.3, 0.15);
  frameGroup.add(arrowR);
  frameGroup.add(arrowF);
  frameGroup.add(arrowU);

  // Dynamically constructed Parallelepiped Mesh & Wireframe pinned at origin (0,0,0)
  const cubeMeshGeom = new BufferGeometry();
  const cubeLineGeom = new BufferGeometry();

  const cubeMeshMat = new MeshStandardMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.25,
    side: DoubleSide,
  });
  const cubeLineMat = new LineBasicMaterial({
    color: 0x2563eb,
    linewidth: 1.5,
  });

  const cubeMesh = new Mesh(cubeMeshGeom, cubeMeshMat);
  const cubeLines = new LineSegments(cubeLineGeom, cubeLineMat);
  frameGroup.add(cubeMesh);
  frameGroup.add(cubeLines);

  // Camera Frustum Pyramidal Model (Apex strictly at origin 0,0,0)
  const frustumGeom = new BufferGeometry();
  const frustumLines = new LineSegments(
    frustumGeom,
    new LineBasicMaterial({ color: 0x10b981, linewidth: 2 }),
  );
  frameGroup.add(frustumLines);

  scene.add(frameGroup);

  return {
    scene,
    setTransformation(r, f, u, showFrustum) {
      const worldR = new Vector3(...mathToWorld(r.x, r.y, r.z)).normalize();
      const worldF = new Vector3(...mathToWorld(f.x, f.y, f.z)).normalize();
      const worldU = new Vector3(...mathToWorld(u.x, u.y, u.z)).normalize();

      arrowR.setDirection(worldR);
      arrowF.setDirection(worldF);
      arrowU.setDirection(worldU);

      // 8 vertices of parallelepiped anchored with V0 at (0, 0, 0)
      const v0 = mathToWorld(0, 0, 0);
      const v1 = mathToWorld(r.x, r.y, r.z);
      const v2 = mathToWorld(r.x + f.x, r.y + f.y, r.z + f.z);
      const v3 = mathToWorld(f.x, f.y, f.z);
      const v4 = mathToWorld(u.x, u.y, u.z);
      const v5 = mathToWorld(r.x + u.x, r.y + u.y, r.z + u.z);
      const v6 = mathToWorld(r.x + f.x + u.x, r.y + f.y + u.y, r.z + f.z + u.z);
      const v7 = mathToWorld(f.x + u.x, f.y + u.y, f.z + u.z);

      // 12 edges for parallelepiped wireframe
      const linePositions: number[] = [
        ...v0,
        ...v1,
        ...v1,
        ...v2,
        ...v2,
        ...v3,
        ...v3,
        ...v0, // Bottom face
        ...v4,
        ...v5,
        ...v5,
        ...v6,
        ...v6,
        ...v7,
        ...v7,
        ...v4, // Top face
        ...v0,
        ...v4,
        ...v1,
        ...v5,
        ...v2,
        ...v6,
        ...v3,
        ...v7, // Vertical edges
      ];
      cubeLineGeom.setAttribute(
        "position",
        new Float32BufferAttribute(linePositions, 3),
      );

      // 12 triangles (6 faces) for translucent solid mesh
      const facePositions: number[] = [
        // Bottom (v0-v1-v2-v3)
        ...v0,
        ...v2,
        ...v1,
        ...v0,
        ...v3,
        ...v2,
        // Top (v4-v5-v6-v7)
        ...v4,
        ...v5,
        ...v6,
        ...v4,
        ...v6,
        ...v7,
        // Front (v3-v2-v6-v7)
        ...v3,
        ...v2,
        ...v6,
        ...v3,
        ...v6,
        ...v7,
        // Back (v0-v1-v5-v4)
        ...v0,
        ...v5,
        ...v1,
        ...v0,
        ...v4,
        ...v5,
        // Right (v1-v2-v6-v5)
        ...v1,
        ...v6,
        ...v5,
        ...v1,
        ...v2,
        ...v6,
        // Left (v0-v3-v7-v4)
        ...v0,
        ...v7,
        ...v3,
        ...v0,
        ...v4,
        ...v7,
      ];
      cubeMeshGeom.setAttribute(
        "position",
        new Float32BufferAttribute(facePositions, 3),
      );
      cubeMeshGeom.computeVertexNormals();

      // Camera Frustum 4 corner rays from (0,0,0) forward along f
      const fTL = mathToWorld(
        1.6 * f.x - 0.6 * r.x + 0.45 * u.x,
        1.6 * f.y - 0.6 * r.y + 0.45 * u.y,
        1.6 * f.z - 0.6 * r.z + 0.45 * u.z,
      );
      const fTR = mathToWorld(
        1.6 * f.x + 0.6 * r.x + 0.45 * u.x,
        1.6 * f.y + 0.6 * r.y + 0.45 * u.y,
        1.6 * f.z + 0.6 * r.z + 0.45 * u.z,
      );
      const fBR = mathToWorld(
        1.6 * f.x + 0.6 * r.x - 0.45 * u.x,
        1.6 * f.y + 0.6 * r.y - 0.45 * u.y,
        1.6 * f.z + 0.6 * r.z - 0.45 * u.z,
      );
      const fBL = mathToWorld(
        1.6 * f.x - 0.6 * r.x - 0.45 * u.x,
        1.6 * f.y - 0.6 * r.y - 0.45 * u.y,
        1.6 * f.z - 0.6 * r.z - 0.45 * u.z,
      );

      const frustumPositions: number[] = [
        // 4 rays from origin
        ...v0,
        ...fTL,
        ...v0,
        ...fTR,
        ...v0,
        ...fBR,
        ...v0,
        ...fBL,
        // View frame rectangle
        ...fTL,
        ...fTR,
        ...fTR,
        ...fBR,
        ...fBR,
        ...fBL,
        ...fBL,
        ...fTL,
      ];
      frustumGeom.setAttribute(
        "position",
        new Float32BufferAttribute(frustumPositions, 3),
      );

      // Visibility toggles
      frustumLines.visible = showFrustum;
      cubeMesh.visible = !showFrustum;
      cubeLines.visible = !showFrustum;
    },
    setAxesVisible(visible) {
      axesWorldGroup.visible = visible;
    },
    dispose() {
      disposeObject(scene);
    },
  };
}

function View3D({ showAxes }: { showAxes: boolean }) {
  const [presetKey, setPresetKey] = useState<Preset3D | "custom">("fps");
  const [yaw, setYaw] = useState<number>(60);
  const [pitch, setPitch] = useState<number>(-20);
  const [roll, setRoll] = useState<number>(0);
  const [showFrustum, setShowFrustum] = useState<boolean>(false);

  const applyPreset = (key: Preset3D) => {
    setPresetKey(key);
    const cfg = PRESETS_3D[key];
    setYaw(cfg.yaw);
    setPitch(cfg.pitch);
    setRoll(cfg.roll);
  };

  // Pure Math Coordinates Rotation (Z-up Right-Handed System)
  const radYaw = (yaw * Math.PI) / 180;
  const cosY = Math.cos(radYaw);
  const sinY = Math.sin(radYaw);

  const radPitch = (pitch * Math.PI) / 180;
  const cosP = Math.cos(radPitch);
  const sinP = Math.sin(radPitch);

  const radRoll = (roll * Math.PI) / 180;
  const cosR = Math.cos(radRoll);
  const sinR = Math.sin(radRoll);

  // Exact 3x3 Matrix Multiplication: R = R_z(yaw) * R_x(pitch) * R_y(roll)
  const matRz = [
    [cosY, -sinY, 0],
    [sinY, cosY, 0],
    [0, 0, 1],
  ];
  const matRx = [
    [1, 0, 0],
    [0, cosP, -sinP],
    [0, sinP, cosP],
  ];
  const matRy = [
    [cosR, 0, sinR],
    [0, 1, 0],
    [-sinR, 0, cosR],
  ];

  const matRzRx = multiply3x3(matRz, matRx);
  const matR = multiply3x3(matRzRx, matRy);

  // Column 1: r = R * (1, 0, 0)^T (Right)
  const rVec = {
    x: matR[0][0],
    y: matR[1][0],
    z: matR[2][0],
  };

  // Column 2: f = R * (0, 1, 0)^T (Forward)
  const fVec = {
    x: matR[0][1],
    y: matR[1][1],
    z: matR[2][1],
  };

  // Column 3: u = R * (0, 0, 1)^T (Up)
  const uVec = {
    x: matR[0][2],
    y: matR[1][2],
    z: matR[2][2],
  };

  // Determinant = r . (f x u)
  const detR =
    rVec.x * (fVec.y * uVec.z - fVec.z * uVec.y) -
    rVec.y * (fVec.x * uVec.z - fVec.z * uVec.x) +
    rVec.z * (fVec.x * uVec.y - fVec.y * uVec.x);

  const lenR = Math.hypot(rVec.x, rVec.y, rVec.z);
  const lenF = Math.hypot(fVec.x, fVec.y, fVec.z);
  const lenU = Math.hypot(uVec.x, uVec.y, uVec.z);

  const dotRF = rVec.x * fVec.x + rVec.y * fVec.y + rVec.z * fVec.z;
  const dotRU = rVec.x * uVec.x + rVec.y * uVec.y + rVec.z * uVec.z;
  const dotFU = fVec.x * uVec.x + fVec.y * uVec.y + fVec.z * uVec.z;

  const { containerRef, apiRef, viewerRef } = useViewer3D(
    () => create3DScene(),
    ({ api, viewer }) => {
      api.setTransformation(rVec, fVec, uVec, showFrustum);
      api.setAxesVisible(showAxes);
      viewer.render();
    },
  );

  useEffect(() => {
    const api = apiRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setTransformation(rVec, fVec, uVec, showFrustum);
    api.setAxesVisible(showAxes);
    viewer.render();
  }, [rVec, fVec, uVec, showFrustum, showAxes, apiRef, viewerRef]);

  // KaTeX Matrix Line 1: Symbolic Trigonometric Product
  const matrixFormulaTex = `R = R_z(${yaw}^\\circ) R_x(${pitch}^\\circ) R_y(${roll}^\\circ) = \\begin{pmatrix} \\cos(${yaw}^\\circ) & -\\sin(${yaw}^\\circ) & 0 \\\\ \\sin(${yaw}^\\circ) & \\cos(${yaw}^\\circ) & 0 \\\\ 0 & 0 & 1 \\end{pmatrix} \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & \\cos(${pitch}^\\circ) & -\\sin(${pitch}^\\circ) \\\\ 0 & \\sin(${pitch}^\\circ) & \\cos(${pitch}^\\circ) \\end{pmatrix} \\begin{pmatrix} \\cos(${roll}^\\circ) & 0 & \\sin(${roll}^\\circ) \\\\ 0 & 1 & 0 \\\\ -\\sin(${roll}^\\circ) & 0 & \\cos(${roll}^\\circ) \\end{pmatrix}`;

  // KaTeX Matrix Line 2: Concrete Numerical Evaluation Product -> Final R
  const matrixValueTex = `R = \\begin{pmatrix} ${fmt(cosY)} & ${fmt(-sinY)} & 0.00 \\\\ ${fmt(sinY)} & ${fmt(cosY)} & 0.00 \\\\ 0.00 & 0.00 & 1.00 \\end{pmatrix} \\begin{pmatrix} 1.00 & 0.00 & 0.00 \\\\ 0.00 & ${fmt(cosP)} & ${fmt(-sinP)} \\\\ 0.00 & ${fmt(sinP)} & ${fmt(cosP)} \\end{pmatrix} \\begin{pmatrix} ${fmt(cosR)} & 0.00 & ${fmt(sinR)} \\\\ 0.00 & 1.00 & 0.00 \\\\ ${fmt(-sinR)} & 0.00 & ${fmt(cosR)} \\end{pmatrix} = \\begin{pmatrix} \\color{#ef4444}{${fmt(rVec.x)}} & \\color{#10b981}{${fmt(fVec.x)}} & \\color{#3b82f6}{${fmt(uVec.x)}} \\\\ \\color{#ef4444}{${fmt(rVec.y)}} & \\color{#10b981}{${fmt(fVec.y)}} & \\color{#3b82f6}{${fmt(uVec.y)}} \\\\ \\color{#ef4444}{${fmt(rVec.z)}} & \\color{#10b981}{${fmt(fVec.z)}} & \\color{#3b82f6}{${fmt(uVec.z)}} \\end{pmatrix}`;

  return (
    <div className="space-y-4">
      {/* 3D Presets & Model Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <PresetSelector<string>
          label="典型姿态预设:"
          options={PRESETS_3D}
          value={presetKey}
          onChange={(key) => applyPreset(key as Preset3D)}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFrustum(!showFrustum)}
            className="rounded border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface-hover transition-colors"
          >
            {showFrustum ? "切换为基向量立方体" : "切换为相机视锥台"}
          </button>
        </div>
      </div>

      {/* 3D Sliders (Z-up System) */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ParamSlider
          label="偏航角 Yaw (Z轴 / 垂直向上)"
          value={yaw}
          min={-180}
          max={180}
          step={5}
          onChange={(v) => {
            setYaw(v);
            setPresetKey("custom");
          }}
        />
        <ParamSlider
          label="俯仰角 Pitch (X轴 / 横向右向)"
          value={pitch}
          min={-90}
          max={90}
          step={5}
          onChange={(v) => {
            setPitch(v);
            setPresetKey("custom");
          }}
        />
        <ParamSlider
          label="翻滚角 Roll (Y轴 / 纵向深度)"
          value={roll}
          min={-180}
          max={180}
          step={5}
          onChange={(v) => {
            setRoll(v);
            setPresetKey("custom");
          }}
        />
      </div>

      {/* 3D Canvas View */}
      <div
        ref={containerRef}
        className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border"
      >
        <CanvasToolbar />
      </div>

      {/* Full-width 2-Line Matrix Breakdown */}
      <div className="rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
          <p className="font-semibold text-foreground">
            3×3 旋转矩阵复合公式与实时数值分解
          </p>
          <span className="text-xs text-muted font-mono">
            R = R_z({yaw}°) R_x({pitch}°) R_y({roll}°)
          </span>
        </div>

        {/* Row 1: Trigonometric Formula */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted">
            第一行（三角符号公式）：
          </div>
          <div className="p-2.5 rounded border border-border bg-surface overflow-x-auto text-xs flex items-center justify-start min-h-[3.5rem]">
            <InlineMath tex={matrixFormulaTex} />
          </div>
        </div>

        {/* Row 2: Numerical Matrix Multiplication -> Final R */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted">
            第二行（各轴具体矩阵连乘 = 最终复合旋转矩阵）：
          </div>
          <div className="p-2.5 rounded border border-border bg-surface overflow-x-auto text-xs flex items-center justify-start min-h-[3.5rem]">
            <InlineMath tex={matrixValueTex} />
          </div>
        </div>
      </div>

      {/* 3D Columns Breakdown & Metric Analysis */}
      <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            三列对应局部基向量（右手系 Z-up）
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="text-red-600 dark:text-red-400 font-medium">
              第 1 列 (Right 右轴)：
              <InlineMath
                tex={`\\mathbf{r} = R e_x = (${fmt(rVec.x)},\\, ${fmt(rVec.y)},\\, ${fmt(rVec.z)})^\\top`}
              />
            </div>
            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
              第 2 列 (Forward 前轴)：
              <InlineMath
                tex={`\\mathbf{f} = R e_y = (${fmt(fVec.x)},\\, ${fmt(fVec.y)},\\, ${fmt(fVec.z)})^\\top`}
              />
            </div>
            <div className="text-blue-600 dark:text-blue-400 font-medium">
              第 3 列 (Up 上轴)：
              <InlineMath
                tex={`\\mathbf{u} = R e_z = (${fmt(uVec.x)},\\, ${fmt(uVec.y)},\\, ${fmt(uVec.z)})^\\top`}
              />
            </div>
            <p className="text-[11px] text-muted pt-1 border-t border-border/50">
              {presetKey === "custom"
                ? "自定义姿态：根据上方滑块实时调整偏航角 Yaw、俯仰角 Pitch 与翻滚角 Roll。"
                : PRESETS_3D[presetKey].desc}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground">代数与几何性质验证</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">正交行列式（体积不变）：</span>
              <span className="font-mono font-semibold text-foreground">
                <InlineMath tex={`\\det(R) = ${detR.toFixed(2)}`} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">基向量模长（单位长度）：</span>
              <span className="font-mono text-foreground">
                ‖r‖={lenR.toFixed(2)}, ‖f‖={lenF.toFixed(2)}, ‖u‖=
                {lenU.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">两两正交点积（垂直）：</span>
              <span className="font-mono text-foreground">
                r·f={dotRF.toFixed(2)}, r·u={dotRU.toFixed(2)}, f·u=
                {dotFU.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-muted pt-1 border-t border-border/50 leading-normal">
              图形学金句：“矩阵的列就是变换后的基向量。” 在 3D
              视图中拖动鼠标旋转视角观察。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangeOfBasisDemo({ height }: { height?: string }) {
  const [demoMode, setDemoMode] = useState<DemoMode>("2d");
  const showAxes = true;

  return (
    <ExpandableDemo id="change-of-basis" height={height}>
      <div className="space-y-4">
        {/* Header Mode Switch & Axes Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={DEMO_MODES}
            value={demoMode}
            onChange={(val) => setDemoMode(val as DemoMode)}
          />
        </div>

        {/* View content based on mode */}
        {demoMode === "2d" ? (
          <View2D showAxes={showAxes} />
        ) : (
          <View3D showAxes={showAxes} />
        )}

        {/* Interaction Hint */}
        <p className="text-xs text-muted">
          {demoMode === "2d"
            ? "提示：拖动画布上的橙色向量 v，观察其在标准基 [v]_B 与变形新基 [v]_C 下的坐标转换。"
            : "提示：切换上方预设姿态、调节偏航/俯仰/翻滚滑块，按住鼠标左键在 3D 画布中旋转视角，观察相机视锥台与三列基向量的实时联动。"}
        </p>
      </div>
    </ExpandableDemo>
  );
}
