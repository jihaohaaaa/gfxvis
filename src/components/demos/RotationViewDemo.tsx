import React, { useState, useRef, useEffect } from "react";
import {
  Scene,
  Group,
  PerspectiveCamera,
  WebGLRenderer,
  Vector3,
  ArrowHelper,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  LineSegments,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import ParamSlider from "../framework/ParamSlider";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";
import { createControls } from "../../visualizations/core/3d/controls";
import {
  addStandardLights,
  addGroundGrid,
  disposeObject,
} from "../../visualizations/core/3d/three-utils";
import { mathToWorld } from "../../visualizations/core/3d/coords";
import { type Vec3, normalize, dot, cross } from "@math";

export type { Vec3 };

type PresetKey = "front" | "topdown" | "closeup" | "orbit" | "dutch";

interface CameraPreset {
  name: string;
  eye: Vec3;
  target: Vec3;
  up: Vec3;
  desc: string;
}

const PRESETS: Record<PresetKey, CameraPreset> = {
  front: {
    name: "正面平视 (Eye: 0, -4, 1.2)",
    eye: { x: 0, y: -4.0, z: 1.2 },
    target: { x: 0, y: 0, z: 0.5 },
    up: { x: 0, y: 0, z: 1 },
    desc: "标准视平线观察，视线水平略微上仰，相机 Up 轴垂直对齐世界 Z 轴。",
  },
  topdown: {
    name: "鸟瞰俯视 (Eye: 3.5, -3.5, 4.0)",
    eye: { x: 3.5, y: -3.5, z: 4.0 },
    target: { x: 0, y: 0, z: 0.2 },
    up: { x: 0, y: 0, z: 1 },
    desc: "高空 45° 斜向下俯瞰场景中心，具有强烈的立体纵深感与透视收缩。",
  },
  closeup: {
    name: "低角仰望特写 (Eye: 1.6, -1.8, 0.3)",
    eye: { x: 1.6, y: -1.8, z: 0.3 },
    target: { x: 0, y: 0.6, z: 0.9 },
    up: { x: 0, y: 0, z: 1 },
    desc: "极低相机高度仰拍几何体群，展示透视变形与向上汇聚的透视效果。",
  },
  orbit: {
    name: "侧翼绕行 (Eye: -4.0, 0.5, 1.5)",
    eye: { x: -4.0, y: 0.5, z: 1.5 },
    target: { x: 0, y: 0, z: 0.5 },
    up: { x: 0, y: 0, z: 1 },
    desc: "从场景侧方横向观察，直观体现相机 Right/Forward 基向量随方位的旋转。",
  },
  dutch: {
    name: "荷兰倾斜角 (Dutch Angle)",
    eye: { x: 0.5, y: -3.8, z: 1.4 },
    target: { x: 0, y: 0, z: 0.5 },
    up: { x: 0.7, y: 0, z: 0.7 },
    desc: "相机 Up 轴斜向倾斜 45°，第一人称画面发生戏剧性的旋转翻滚（Roll 旋转）。",
  },
};

/** Builds common static geometric target objects in a scene */
function populateSceneObjects(scene: Scene) {
  addStandardLights(scene);
  addGroundGrid(scene, 8, 16);

  // Red Cube at (0.8, 0.8, 0.4)
  const cubeGeom = new BoxGeometry(0.8, 0.8, 0.8);
  const cubeMat = new MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.2,
  });
  const cube = new Mesh(cubeGeom, cubeMat);
  const [cx, cy, cz] = mathToWorld(0.8, 0.8, 0.4);
  cube.position.set(cx, cy, cz);
  scene.add(cube);

  // Emerald Cylinder at (-1.0, 0.9, 0.6)
  const cylGeom = new CylinderGeometry(0.4, 0.4, 1.2, 24);
  const cylMat = new MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.3,
    metalness: 0.2,
  });
  const cyl = new Mesh(cylGeom, cylMat);
  const [yx, yy, yz] = mathToWorld(-1.0, 0.9, 0.6);
  cyl.position.set(yx, yy, yz);
  scene.add(cyl);

  // Blue / Amber Sphere at (0, 0, 0.5)
  const sphGeom = new SphereGeometry(0.5, 32, 24);
  const sphMat = new MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.4,
  });
  const sph = new Mesh(sphGeom, sphMat);
  const [sx, sy, sz] = mathToWorld(0, 0, 0.5);
  sph.position.set(sx, sy, sz);
  scene.add(sph);

  // World Origin Tripod Marker
  const arrowLen = 1.2;
  const origin = new Vector3(...mathToWorld(0, 0, 0));
  scene.add(
    new ArrowHelper(
      new Vector3(...mathToWorld(1, 0, 0)).normalize(),
      origin,
      arrowLen,
      0xef4444,
      0.15,
      0.08,
    ),
  );
  scene.add(
    new ArrowHelper(
      new Vector3(...mathToWorld(0, 1, 0)).normalize(),
      origin,
      arrowLen,
      0x10b981,
      0.15,
      0.08,
    ),
  );
  scene.add(
    new ArrowHelper(
      new Vector3(...mathToWorld(0, 0, 1)).normalize(),
      origin,
      arrowLen,
      0x3b82f6,
      0.15,
      0.08,
    ),
  );
}

export default function RotationViewDemo({ height }: { height?: string }) {
  const [presetKey, setPresetKey] = useState<PresetKey | "custom">("front");
  const [eye, setEye] = useState<Vec3>({ x: 0, y: -4.0, z: 1.2 });
  const [target, setTarget] = useState<Vec3>({ x: 0, y: 0, z: 0.5 });
  const [upRaw, setUpRaw] = useState<Vec3>({ x: 0, y: 0, z: 1 });

  // DOM Container references for dual viewports
  const worldContainerRef = useRef<HTMLDivElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);

  // Three.js instances refs
  const worldViewerRef = useRef<{
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    controls: ReturnType<typeof createControls>;
    camMarkerGroup: Group;
    frustumLines: LineSegments;
    frustumGeom: BufferGeometry;
    sightLine: LineSegments;
    arrowR: ArrowHelper;
    arrowU: ArrowHelper;
    arrowF: ArrowHelper;
  } | null>(null);

  const virtualCameraViewerRef = useRef<{
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
  } | null>(null);

  // Handle Preset Switching
  const handlePreset = (key: string) => {
    setPresetKey(key as PresetKey);
    const p = PRESETS[key as PresetKey];
    if (p) {
      setEye(p.eye);
      setTarget(p.target);
      setUpRaw(p.up);
    }
  };

  // Math: Calculate Orthonormal Basis (r, u, f) in right-handed Z-up system
  // Forward vector: eye -> target
  const rawF = {
    x: target.x - eye.x,
    y: target.y - eye.y,
    z: target.z - eye.z,
  };
  const f = normalize(rawF);

  // Right vector: cross(f, upRaw)
  const rawR = cross(f, upRaw);
  const r = normalize(rawR);

  // True Orthogonal Up vector: cross(r, f)
  const u = cross(r, f);

  // In graphics LookAt View matrix, camera looks along -Z (OpenGL convention) or +Y/+Z
  // Dot products for translation row in View matrix
  const tx = -dot(r, eye);
  const ty = -dot(u, eye);
  const tz = dot(f, eye); // or -dot(-f, eye)

  // Determinant of rotation part R_view: det(R) should be exactly 1.0 (SO(3))
  const detR =
    r.x * (u.y * -f.z - u.z * -f.y) -
    r.y * (u.x * -f.z - u.z * -f.x) +
    r.z * (u.x * -f.y - u.y * -f.x);

  // Initialize Dual 3D Viewports
  useEffect(() => {
    const worldContainer = worldContainerRef.current;
    const cameraContainer = cameraContainerRef.current;
    if (!worldContainer || !cameraContainer) return;

    // 1. Setup World Scene (Observer View)
    const worldScene = new Scene();
    populateSceneObjects(worldScene);

    const worldRenderer = new WebGLRenderer({ antialias: true });
    worldRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    worldRenderer.setSize(
      worldContainer.clientWidth,
      worldContainer.clientHeight,
    );
    worldContainer.appendChild(worldRenderer.domElement);

    const worldCamera = new PerspectiveCamera(
      45,
      worldContainer.clientWidth / worldContainer.clientHeight,
      0.1,
      100,
    );
    const [initWx, initWy, initWz] = mathToWorld(6.5, -6.5, 5.0);
    worldCamera.position.set(initWx, initWy, initWz);

    const worldControls = createControls(worldCamera, worldRenderer.domElement);
    const [tWx, tWy, tWz] = mathToWorld(0, 0, 0.5);
    worldControls.target.set(tWx, tWy, tWz);
    worldControls.update();

    // Camera Visual Representation inside World Scene
    const camMarkerGroup = new Group();
    const camBodyGeom = new BoxGeometry(0.35, 0.25, 0.25);
    const camBodyMat = new MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8,
    });
    const camBody = new Mesh(camBodyGeom, camBodyMat);
    camMarkerGroup.add(camBody);

    // Camera Lens Cylinder
    const lensGeom = new CylinderGeometry(0.1, 0.12, 0.2, 16);
    const lensMat = new MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.2,
      metalness: 0.5,
    });
    const lens = new Mesh(lensGeom, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.18;
    camMarkerGroup.add(lens);

    worldScene.add(camMarkerGroup);

    // Camera Frustum Wireframe
    const frustumGeom = new BufferGeometry();
    const frustumLines = new LineSegments(
      frustumGeom,
      new LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.7,
        linewidth: 2,
      }),
    );
    worldScene.add(frustumLines);

    // Sightline Ray
    const sightGeom = new BufferGeometry();
    const sightLine = new LineSegments(
      sightGeom,
      new LineBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.8,
        linewidth: 1.5,
      }),
    );
    worldScene.add(sightLine);

    // Local Basis Arrows on the camera body
    const zeroOrigin = new Vector3(0, 0, 0);
    const arrowR = new ArrowHelper(
      new Vector3(1, 0, 0),
      zeroOrigin,
      1.2,
      0xef4444,
      0.2,
      0.1,
    );
    const arrowU = new ArrowHelper(
      new Vector3(0, 1, 0),
      zeroOrigin,
      1.2,
      0x10b981,
      0.2,
      0.1,
    );
    const arrowF = new ArrowHelper(
      new Vector3(0, 0, 1),
      zeroOrigin,
      1.4,
      0x3b82f6,
      0.22,
      0.1,
    );
    camMarkerGroup.add(arrowR);
    camMarkerGroup.add(arrowU);
    camMarkerGroup.add(arrowF);

    worldViewerRef.current = {
      renderer: worldRenderer,
      scene: worldScene,
      camera: worldCamera,
      controls: worldControls,
      camMarkerGroup,
      frustumLines,
      frustumGeom,
      sightLine,
      arrowR,
      arrowU,
      arrowF,
    };

    // 2. Setup Virtual Camera Scene (First-Person Camera Viewport)
    const virtualScene = new Scene();
    populateSceneObjects(virtualScene);

    const virtualRenderer = new WebGLRenderer({ antialias: true });
    virtualRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    virtualRenderer.setSize(
      cameraContainer.clientWidth,
      cameraContainer.clientHeight,
    );
    cameraContainer.appendChild(virtualRenderer.domElement);

    const virtualCamera = new PerspectiveCamera(
      50,
      cameraContainer.clientWidth / cameraContainer.clientHeight,
      0.1,
      50,
    );

    virtualCameraViewerRef.current = {
      renderer: virtualRenderer,
      scene: virtualScene,
      camera: virtualCamera,
    };

    // Theme & Clear Colors
    const applyClearColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const bgColor = isDark ? 0x0b0f14 : 0xf8fafc;
      worldRenderer.setClearColor(bgColor, 1);
      virtualRenderer.setClearColor(isDark ? 0x070a0e : 0xf1f5f9, 1);
    };
    applyClearColors();

    // Render Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      worldControls.update();
      worldRenderer.render(worldScene, worldCamera);
      virtualRenderer.render(virtualScene, virtualCamera);
    };
    animate();

    // Resize Observers
    const onResize = () => {
      if (worldContainer) {
        worldCamera.aspect =
          worldContainer.clientWidth / worldContainer.clientHeight;
        worldCamera.updateProjectionMatrix();
        worldRenderer.setSize(
          worldContainer.clientWidth,
          worldContainer.clientHeight,
        );
      }
      if (cameraContainer) {
        virtualCamera.aspect =
          cameraContainer.clientWidth / cameraContainer.clientHeight;
        virtualCamera.updateProjectionMatrix();
        virtualRenderer.setSize(
          cameraContainer.clientWidth,
          cameraContainer.clientHeight,
        );
      }
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(worldContainer);
    resizeObserver.observe(cameraContainer);

    const themeObserver = new MutationObserver(applyClearColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      worldControls.dispose();
      worldRenderer.dispose();
      virtualRenderer.dispose();
      disposeObject(worldScene);
      disposeObject(virtualScene);

      if (worldRenderer.domElement.parentElement === worldContainer) {
        worldContainer.removeChild(worldRenderer.domElement);
      }
      if (virtualRenderer.domElement.parentElement === cameraContainer) {
        cameraContainer.removeChild(virtualRenderer.domElement);
      }
      worldViewerRef.current = null;
      virtualCameraViewerRef.current = null;
    };
  }, []);

  // Update Camera Transforms upon state changes (eye, target, up)
  useEffect(() => {
    const wv = worldViewerRef.current;
    const vv = virtualCameraViewerRef.current;
    if (!wv || !vv) return;

    // Math coords to Three World coords
    const [wEyeX, wEyeY, wEyeZ] = mathToWorld(eye.x, eye.y, eye.z);
    const [wTgtX, wTgtY, wTgtZ] = mathToWorld(target.x, target.y, target.z);
    const [wUpX, wUpY, wUpZ] = mathToWorld(u.x, u.y, u.z);
    const [wRightX, wRightY, wRightZ] = mathToWorld(r.x, r.y, r.z);
    const [wFwdX, wFwdY, wFwdZ] = mathToWorld(f.x, f.y, f.z);

    // 1. Update Virtual Camera (First Person View)
    vv.camera.position.set(wEyeX, wEyeY, wEyeZ);
    vv.camera.up.set(wUpX, wUpY, wUpZ).normalize();
    vv.camera.lookAt(wTgtX, wTgtY, wTgtZ);
    vv.camera.updateMatrixWorld(true);

    // 2. Update Camera Entity in Observer World Scene
    wv.camMarkerGroup.position.set(wEyeX, wEyeY, wEyeZ);

    // Align camera body orientation with (r, u, -f)
    wv.arrowR.setDirection(
      new Vector3(wRightX, wRightY, wRightZ - wEyeZ).normalize(),
    );
    wv.arrowU.setDirection(new Vector3(wUpX, wUpY, wUpZ - wEyeZ).normalize());
    wv.arrowF.setDirection(
      new Vector3(wFwdX, wFwdY, wFwdZ - wEyeZ).normalize(),
    );

    // Sightline from eye to target
    const sightPositions = [wEyeX, wEyeY, wEyeZ, wTgtX, wTgtY, wTgtZ];
    wv.sightLine.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(sightPositions, 3),
    );

    // Frustum Visual Pyramid
    const fovLen = 2.4;
    const halfH = fovLen * Math.tan((25 * Math.PI) / 180);
    const halfW = halfH * (4 / 3);

    const pTL = mathToWorld(
      eye.x + f.x * fovLen - r.x * halfW + u.x * halfH,
      eye.y + f.y * fovLen - r.y * halfW + u.y * halfH,
      eye.z + f.z * fovLen - r.z * halfW + u.z * halfH,
    );
    const pTR = mathToWorld(
      eye.x + f.x * fovLen + r.x * halfW + u.x * halfH,
      eye.y + f.y * fovLen + r.y * halfW + u.y * halfH,
      eye.z + f.z * fovLen + r.z * halfW + u.z * halfH,
    );
    const pBR = mathToWorld(
      eye.x + f.x * fovLen + r.x * halfW - u.x * halfH,
      eye.y + f.y * fovLen + r.y * halfW - u.y * halfH,
      eye.z + f.z * fovLen + r.z * halfW - u.z * halfH,
    );
    const pBL = mathToWorld(
      eye.x + f.x * fovLen - r.x * halfW - u.x * halfH,
      eye.y + f.y * fovLen - r.y * halfW - u.y * halfH,
      eye.z + f.z * fovLen - r.z * halfW - u.z * halfH,
    );

    const frustumPositions = [
      // 4 Edge Rays from apex
      wEyeX,
      wEyeY,
      wEyeZ,
      ...pTL,
      wEyeX,
      wEyeY,
      wEyeZ,
      ...pTR,
      wEyeX,
      wEyeY,
      wEyeZ,
      ...pBR,
      wEyeX,
      wEyeY,
      wEyeZ,
      ...pBL,
      // Rect Frame
      ...pTL,
      ...pTR,
      ...pTR,
      ...pBR,
      ...pBR,
      ...pBL,
      ...pBL,
      ...pTL,
    ];
    wv.frustumLines.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(frustumPositions, 3),
    );
  }, [eye, target, u, r, f]);

  const fmt = (num: number) => num.toFixed(2);

  // Formatting View Matrix TeX
  const viewMatrixTex = `V = \\begin{pmatrix}
\\mathbf{r}_x & \\mathbf{r}_y & \\mathbf{r}_z & -\\mathbf{r}\\cdot\\mathbf{eye} \\\\
\\mathbf{u}_x & \\mathbf{u}_y & \\mathbf{u}_z & -\\mathbf{u}\\cdot\\mathbf{eye} \\\\
-\\mathbf{f}_x & -\\mathbf{f}_y & -\\mathbf{f}_z & \\mathbf{f}\\cdot\\mathbf{eye} \\\\
0 & 0 & 0 & 1
\\end{pmatrix} = \\begin{pmatrix}
${fmt(r.x)} & ${fmt(r.y)} & ${fmt(r.z)} & ${fmt(tx)} \\\\
${fmt(u.x)} & ${fmt(u.y)} & ${fmt(u.z)} & ${fmt(ty)} \\\\
${fmt(-f.x)} & ${fmt(-f.y)} & ${fmt(-f.z)} & ${fmt(tz)} \\\\
0 & 0 & 0 & 1
\\end{pmatrix}`;

  return (
    <ExpandableDemo id="rotation-so3-view-demo" height={height}>
      <div className="space-y-4">
        {/* Preset Selector */}
        <PresetSelector
          label="相机观察姿态预设:"
          options={PRESETS}
          value={presetKey}
          onChange={handlePreset}
        />

        {/* Dual Viewports (Grid 2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left Viewport: Observer View */}
          <div className="relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/80 bg-surface-hover/80 px-3 py-2 text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                第三人称观察视口（世界坐标系）
              </span>
              <span className="text-[11px] text-muted font-normal">
                左键旋转视角 / 滚轮缩放
              </span>
            </div>
            <div
              ref={worldContainerRef}
              className="relative h-[18rem] md:h-[22rem] w-full"
            >
              <CanvasToolbar />
              <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-col gap-1 rounded bg-surface/90 p-1.5 text-[11px] text-muted backdrop-blur-xs border border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-bold">● r (Right)</span>
                  <span className="text-emerald-500 font-bold">● u (Up)</span>
                  <span className="text-blue-500 font-bold">● f (Forward)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Viewport: Camera View */}
          <div className="relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/80 bg-surface-hover/80 px-3 py-2 text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                第一人称相机视野（View 变换结果）
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                FOV: 50° | LookAt
              </span>
            </div>
            <div
              ref={cameraContainerRef}
              className="relative h-[18rem] md:h-[22rem] w-full"
            >
              {/* Center Viewfinder Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-6 w-6">
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/40 shadow-xs" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 shadow-xs" />
                  <div className="absolute inset-0 rounded-full border border-white/30" />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-surface/90 px-2 py-1 text-[11px] text-muted backdrop-blur-xs border border-border/60">
                实际光栅化相机输出
              </div>
            </div>
          </div>
        </div>

        {/* Camera Parameter Sliders */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-xs sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">
              相机位置 <InlineMath tex="\mathbf{eye} = (x,y,z)" />
            </p>
            <ParamSlider
              label="Eye X (横向位移)"
              value={eye.x}
              min={-6}
              max={6}
              step={0.1}
              onChange={(v) => {
                setEye({ ...eye, x: v });
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="Eye Y (纵向深度)"
              value={eye.y}
              min={-6}
              max={6}
              step={0.1}
              onChange={(v) => {
                setEye({ ...eye, y: v });
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="Eye Z (垂直高度)"
              value={eye.z}
              min={-2}
              max={6}
              step={0.1}
              onChange={(v) => {
                setEye({ ...eye, z: v });
                setPresetKey("custom");
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-foreground">
              注视目标点 <InlineMath tex="\mathbf{target} = (x,y,z)" />
            </p>
            <ParamSlider
              label="Target X"
              value={target.x}
              min={-4}
              max={4}
              step={0.1}
              onChange={(v) => {
                setTarget({ ...target, x: v });
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="Target Y"
              value={target.y}
              min={-4}
              max={4}
              step={0.1}
              onChange={(v) => {
                setTarget({ ...target, y: v });
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="Target Z"
              value={target.z}
              min={-1}
              max={4}
              step={0.1}
              onChange={(v) => {
                setTarget({ ...target, z: v });
                setPresetKey("custom");
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-foreground">
              上向倾斜/翻滚 (Roll Up)
            </p>
            <ParamSlider
              label="Up X 倾斜分量"
              value={upRaw.x}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => {
                setUpRaw({ ...upRaw, x: v });
                setPresetKey("custom");
              }}
            />
            <ParamSlider
              label="Up Z 垂直分量"
              value={upRaw.z}
              min={0.1}
              max={1}
              step={0.1}
              onChange={(v) => {
                setUpRaw({ ...upRaw, z: v });
                setPresetKey("custom");
              }}
            />
            <div className="pt-2 text-[11px] text-muted border-t border-border/50">
              {presetKey === "custom"
                ? "自定义相机姿态：根据滑块动态调整视点与朝向。"
                : PRESETS[presetKey]?.desc}
            </div>
          </div>
        </div>

        {/* Orthonormal Basis & 4x4 View Matrix Breakdown */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-xs sm:grid-cols-2">
          {/* Basis Vectors Analysis */}
          <div className="space-y-2.5">
            <p className="font-semibold text-foreground">
              Gram-Schmidt 构造的相机局部正交归一基底
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="font-sans font-medium text-muted">
                  前向视线 (Forward)：
                </span>
                <InlineMath
                  tex={`\\mathbf{f} = (${fmt(f.x)},\\, ${fmt(f.y)},\\, ${fmt(f.z)})^\\top`}
                />
              </div>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="font-sans font-medium text-muted">
                  横向右轴 (Right)：
                </span>
                <InlineMath
                  tex={`\\mathbf{r} = (${fmt(r.x)},\\, ${fmt(r.y)},\\, ${fmt(r.z)})^\\top`}
                />
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="font-sans font-medium text-muted">
                  垂直正交 (Up)：
                </span>
                <InlineMath
                  tex={`\\mathbf{u} = (${fmt(u.x)},\\, ${fmt(u.y)},\\, ${fmt(u.z)})^\\top`}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span>正交归一性检验 (Dot Products)：</span>
                <span className="font-mono text-foreground">
                  r·u={fmt(dot(r, u))}, r·f={fmt(dot(r, f))}, u·f=
                  {fmt(dot(u, f))}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>特殊正交群行列式 (SO(3))：</span>
                <span className="font-mono font-semibold text-accent">
                  <InlineMath tex={`\\det(R_{\\text{view}}) = ${fmt(detR)}`} />
                </span>
              </div>
            </div>
          </div>

          {/* 4x4 View Matrix Formula & Realtime Values */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                4×4 LookAt 相机 View 矩阵实时展开
              </p>
              <span className="font-mono text-[10px] text-muted">
                V = R_view · T(-eye)
              </span>
            </div>
            <div className="overflow-x-auto rounded border border-border bg-surface p-2.5 flex items-center justify-start min-h-[4rem]">
              <InlineMath tex={viewMatrixTex} />
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              核心代数机制：世界到相机是<strong>基变换的逆变换</strong>
              。因为旋转矩阵是正交矩阵，
              <strong>
                <InlineMath tex="R_{\text{view}} = R_{\text{cam}}^{-1} = R_{\text{cam}}^\top" />
              </strong>
              ，平移项则为相机在各轴的投影内积。
            </p>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
