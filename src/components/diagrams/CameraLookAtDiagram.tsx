import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";
import ParamSlider from "../framework/ParamSlider";
import InlineMath from "../framework/InlineMath";
import { mathToWorld } from "../../visualizations/core/3d/coords";
import { createControls } from "../../visualizations/core/3d/controls";
import { type Vec3, length, normalize, cross, dot } from "@math";

const PRESETS: PresetOption[] = [
  {
    value: "standard",
    label: "标准平视观察",
    description: "标准 Eye 与 Target，参考 Up 为世界 +Z 轴",
  },
  {
    value: "pitch_down",
    label: "斜向下俯瞰 (Pitch Down)",
    description: "相机处于斜上方高处，视线向下俯视注视目标",
  },
  {
    value: "yaw_side",
    label: "侧向偏航观察 (Yaw)",
    description: "相机偏向一侧观察，局部基底 r, u, f 相应发生航向旋转",
  },
  {
    value: "tilted_up",
    label: "Up 轴倾斜 (Gram-Schmidt 修正)",
    description:
      "参考 Up_raw 发生严重倾斜，Gram-Schmidt 正交化自动投影纠偏出严格正交的 True Up",
  },
];

function fmt(n: number): string {
  const v = Math.abs(n) < 1e-4 ? 0 : n;
  return v.toFixed(2);
}

export default function CameraLookAtDiagram({
  height = "460px",
}: {
  height?: string;
}) {
  const [presetKey, setPresetKey] = useState("standard");
  const [eye, setEye] = useState<Vec3>({ x: 0, y: -4.5, z: 2.2 });
  const [target, setTarget] = useState<Vec3>({ x: 0, y: 0, z: 0.5 });
  const [upTiltAngle, setUpTiltAngle] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<ReturnType<typeof createControls> | null>(null);

  // Dynamic visual nodes
  const dynamicGroupRef = useRef<THREE.Group | null>(null);

  // 1. Calculate raw Up direction based on tilt angle
  const rad = (upTiltAngle * Math.PI) / 180;
  const upRaw: Vec3 = normalize({
    x: Math.sin(rad),
    y: 0,
    z: Math.cos(rad),
  });

  // 2. Gram-Schmidt Orthogonalization Process
  const forwardRaw: Vec3 = {
    x: target.x - eye.x,
    y: target.y - eye.y,
    z: target.z - eye.z,
  };
  const f: Vec3 = normalize(forwardRaw);

  const rightRaw = cross(f, upRaw);
  const rightLength = length(rightRaw);
  const r: Vec3 =
    rightLength < 1e-4 ? { x: 1, y: 0, z: 0 } : normalize(rightRaw);

  const u: Vec3 = cross(r, f);

  // Preset handler
  const handlePreset = (val: string) => {
    setPresetKey(val);
    if (val === "standard") {
      setEye({ x: 0, y: -4.5, z: 2.2 });
      setTarget({ x: 0, y: 0, z: 0.5 });
      setUpTiltAngle(0);
    } else if (val === "pitch_down") {
      setEye({ x: 3.2, y: -3.5, z: 3.8 });
      setTarget({ x: 0, y: 0, z: 0.2 });
      setUpTiltAngle(0);
    } else if (val === "yaw_side") {
      setEye({ x: -3.8, y: -2.5, z: 1.5 });
      setTarget({ x: 0.8, y: 0.5, z: 0.5 });
      setUpTiltAngle(0);
    } else if (val === "tilted_up") {
      setEye({ x: 0.5, y: -4.2, z: 2.0 });
      setTarget({ x: 0, y: 0, z: 0.5 });
      setUpTiltAngle(35);
    }
  };

  // Mount Three.js Viewer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    const [initWx, initWy, initWz] = mathToWorld(6.5, -6.5, 4.5);
    camera.position.set(initWx, initWy, initWz);
    cameraRef.current = camera;

    const controls = createControls(camera, renderer.domElement);
    const [tWx, tWy, tWz] = mathToWorld(0, 0, 0.5);
    controls.target.set(tWx, tWy, tWz);
    controls.update();
    controlsRef.current = controls;

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Floor Grid Helper (Math Z-up -> World XZ plane with Y=0)
    const grid = new THREE.GridHelper(10, 10, 0x94a3b8, 0xcbd5e1);
    grid.position.y = 0;
    scene.add(grid);

    // Dynamic Objects Group
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // Theme Background adaptation
    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--gfx-bg").trim() || "#ffffff";
      renderer.setClearColor(bg, 1);
    };
    applyTheme();

    const themeObserver = new MutationObserver(() => applyTheme());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D Geometry when state changes
  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ("geometry" in child && (child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    const [eyeWx, eyeWy, eyeWz] = mathToWorld(eye.x, eye.y, eye.z);
    const [tgtWx, tgtWy, tgtWz] = mathToWorld(target.x, target.y, target.z);

    const eyeV = new THREE.Vector3(eyeWx, eyeWy, eyeWz);
    const tgtV = new THREE.Vector3(tgtWx, tgtWy, tgtWz);

    // 1. Camera Mesh at Eye
    const camGroup = new THREE.Group();
    camGroup.position.copy(eyeV);

    const camBodyGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
    const camBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.6,
    });
    const camBody = new THREE.Mesh(camBodyGeo, camBodyMat);
    camGroup.add(camBody);

    const lensGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 24);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, -0.28);
    camGroup.add(lens);

    // Orient camera towards target
    const [rWx, rWy, rWz] = mathToWorld(r.x, r.y, r.z);
    const [uWx, uWy, uWz] = mathToWorld(u.x, u.y, u.z);
    const [fWx, fWy, fWz] = mathToWorld(f.x, f.y, f.z);

    const rotMatrix = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(rWx, rWy, rWz),
      new THREE.Vector3(uWx, uWy, uWz),
      new THREE.Vector3(-fWx, -fWy, -fWz),
    );
    camGroup.quaternion.setFromRotationMatrix(rotMatrix);
    group.add(camGroup);

    // 2. Target Mesh at Target Position
    const targetGroup = new THREE.Group();
    targetGroup.position.copy(tgtV);

    const targetCenterGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const targetCenterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 0.5,
    });
    targetGroup.add(new THREE.Mesh(targetCenterGeo, targetCenterMat));

    const ringGeo = new THREE.RingGeometry(0.24, 0.28, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    targetGroup.add(new THREE.Mesh(ringGeo, ringMat));
    group.add(targetGroup);

    // 3. Sightline Ray (Eye to Target)
    const lineGeo = new THREE.BufferGeometry().setFromPoints([eyeV, tgtV]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x3b82f6,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 2,
    });
    const sightLine = new THREE.Line(lineGeo, lineMat);
    sightLine.computeLineDistances();
    group.add(sightLine);

    // 4. Frustum Visual Pyramid Wireframe
    const frustumLength = Math.min(eyeV.distanceTo(tgtV) * 0.9, 3.5);
    const halfFov = (30 * Math.PI) / 180 / 2;
    const aspect = 1.33;
    const h = frustumLength * Math.tan(halfFov);
    const w = h * aspect;

    const fLocal = new THREE.Vector3(fWx, fWy, fWz).multiplyScalar(
      frustumLength,
    );
    const rLocal = new THREE.Vector3(rWx, rWy, rWz);
    const uLocal = new THREE.Vector3(uWx, uWy, uWz);

    const pCenter = eyeV.clone().add(fLocal);
    const pTL = pCenter
      .clone()
      .add(uLocal.clone().multiplyScalar(h))
      .sub(rLocal.clone().multiplyScalar(w));
    const pTR = pCenter
      .clone()
      .add(uLocal.clone().multiplyScalar(h))
      .add(rLocal.clone().multiplyScalar(w));
    const pBR = pCenter
      .clone()
      .sub(uLocal.clone().multiplyScalar(h))
      .add(rLocal.clone().multiplyScalar(w));
    const pBL = pCenter
      .clone()
      .sub(uLocal.clone().multiplyScalar(h))
      .sub(rLocal.clone().multiplyScalar(w));

    const frustumPoints = [
      eyeV,
      pTL,
      eyeV,
      pTR,
      eyeV,
      pBR,
      eyeV,
      pBL,
      pTL,
      pTR,
      pTR,
      pBR,
      pBR,
      pBL,
      pBL,
      pTL,
    ];
    const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPoints);
    const frustumMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.45,
    });
    group.add(new THREE.LineSegments(frustumGeo, frustumMat));

    // 5. 3D Basis Vectors Tripod at Camera Eye
    const arrowLen = 1.5;
    const headLen = 0.3;
    const headWidth = 0.18;

    // Forward f (Blue)
    const fDir = new THREE.Vector3(fWx, fWy, fWz).normalize();
    const fArrow = new THREE.ArrowHelper(
      fDir,
      eyeV,
      arrowLen,
      0x3b82f6,
      headLen,
      headWidth,
    );
    group.add(fArrow);

    // Right r (Red)
    const rDir = new THREE.Vector3(rWx, rWy, rWz).normalize();
    const rArrow = new THREE.ArrowHelper(
      rDir,
      eyeV,
      arrowLen,
      0xef4444,
      headLen,
      headWidth,
    );
    group.add(rArrow);

    // True Up u (Emerald)
    const uDir = new THREE.Vector3(uWx, uWy, uWz).normalize();
    const uArrow = new THREE.ArrowHelper(
      uDir,
      eyeV,
      arrowLen,
      0x10b981,
      headLen,
      headWidth,
    );
    group.add(uArrow);

    // Raw Reference Up up_raw (Amber Dashed Arrow)
    const [upRawWx, upRawWy, upRawWz] = mathToWorld(upRaw.x, upRaw.y, upRaw.z);
    const upRawDir = new THREE.Vector3(upRawWx, upRawWy, upRawWz).normalize();
    const upRawArrow = new THREE.ArrowHelper(
      upRawDir,
      eyeV,
      arrowLen * 1.1,
      0xf59e0b,
      headLen,
      headWidth,
    );
    group.add(upRawArrow);

    // Gram-Schmidt projection arc/line between up_raw tip and u tip
    const upRawTip = eyeV
      .clone()
      .add(upRawDir.clone().multiplyScalar(arrowLen));
    const uTip = eyeV.clone().add(uDir.clone().multiplyScalar(arrowLen));
    const projGeo = new THREE.BufferGeometry().setFromPoints([upRawTip, uTip]);
    const projMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const projLine = new THREE.Line(projGeo, projMat);
    projLine.computeLineDistances();
    group.add(projLine);

    // Drop projections to floor for Eye & Target
    const eyeFloor = new THREE.Vector3(eyeWx, 0, eyeWz);
    const eyeDropGeo = new THREE.BufferGeometry().setFromPoints([
      eyeV,
      eyeFloor,
    ]);
    const eyeDropMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const eyeDrop = new THREE.Line(eyeDropGeo, eyeDropMat);
    eyeDrop.computeLineDistances();
    group.add(eyeDrop);

    const tgtFloor = new THREE.Vector3(tgtWx, 0, tgtWz);
    const tgtDropGeo = new THREE.BufferGeometry().setFromPoints([
      tgtV,
      tgtFloor,
    ]);
    const tgtDrop = new THREE.Line(tgtDropGeo, eyeDropMat);
    tgtDrop.computeLineDistances();
    group.add(tgtDrop);
  }, [eye, target, upTiltAngle]);

  return (
    <ExpandableDemo id="camera-lookat-basis-3d-diagram" height={height}>
      <div className="space-y-4">
        {/* Preset Selector */}
        <PresetSelector
          label="相机观察姿态预设:"
          options={PRESETS}
          value={presetKey}
          onChange={handlePreset}
        />

        {/* 3D WebGL Canvas Viewport */}
        <div className="relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/80 bg-surface-hover/80 px-3 py-2 text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
              三维相机坐标系与 Gram-Schmidt 正交化基底交互视图
            </span>
            <span className="text-[11px] text-muted font-normal">
              左键旋转 / 右键平移 / 滚轮缩放
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative h-[20rem] md:h-[26rem] w-full"
          >
            <CanvasToolbar />

            {/* In-canvas Legend */}
            <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-col gap-1 rounded bg-surface/90 p-2 text-[11px] text-muted backdrop-blur-xs border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-bold">
                  ● f (Forward 视线)
                </span>
                <span className="text-red-500 font-bold">
                  ● r (Right 右向轴)
                </span>
                <span className="text-emerald-500 font-bold">
                  ● u (True Up 实际上方向)
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 border-t border-border/40 text-[10px]">
                <span className="text-amber-500 font-medium">
                  ● up_raw (参考世界上方向)
                </span>
                <span className="text-muted">
                  （金色虚线为 Gram-Schmidt 正交纠偏投影）
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Math Breakdown & Sliders Controls */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Controls Sliders */}
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-xs">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                相机视点位置 <InlineMath tex="\mathbf{eye} = (x, y, z)" />
              </p>
              <ParamSlider
                label="Eye X"
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
                label="Eye Y"
                value={eye.y}
                min={-8}
                max={2}
                step={0.1}
                onChange={(v) => {
                  setEye({ ...eye, y: v });
                  setPresetKey("custom");
                }}
              />
              <ParamSlider
                label="Eye Z (高度)"
                value={eye.z}
                min={0}
                max={6}
                step={0.1}
                onChange={(v) => {
                  setEye({ ...eye, z: v });
                  setPresetKey("custom");
                }}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="font-semibold text-foreground">
                注视目标点 <InlineMath tex="\mathbf{target} = (x, y, z)" />
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
                min={-3}
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

            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">
                  参考上方向倾角 <InlineMath tex="\mathbf{up}_{\text{raw}}" />{" "}
                  偏角
                </p>
                <span className="font-mono text-[11px] text-amber-500 font-bold">
                  {upTiltAngle}°
                </span>
              </div>
              <ParamSlider
                label="Up 倾角 (度)"
                value={upTiltAngle}
                min={-60}
                max={60}
                step={1}
                onChange={(v) => {
                  setUpTiltAngle(v);
                  setPresetKey("custom");
                }}
              />
            </div>
          </div>

          {/* Gram-Schmidt Math Calculation Output */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 text-xs space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-2">
                Gram-Schmidt 实时三步正交归一化推导
              </p>
              <div className="space-y-2 font-mono text-[11px]">
                {/* Step 1: Forward */}
                <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-blue-500 font-bold">
                    <span>1. 前向视线单位向量 f</span>
                    <span>‖f‖ = 1.00</span>
                  </div>
                  <InlineMath
                    tex={`\\mathbf{f} = \\frac{\\mathbf{target} - \\mathbf{eye}}{\\|\\dots\\|} = (${fmt(f.x)},\\, ${fmt(f.y)},\\, ${fmt(f.z)})^\\top`}
                  />
                </div>

                {/* Step 2: Right */}
                <div className="rounded border border-red-500/30 bg-red-500/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-red-500 font-bold">
                    <span>2. 右向单位向量 r</span>
                    <span>‖r‖ = 1.00</span>
                  </div>
                  <InlineMath
                    tex={`\\mathbf{r} = \\frac{\\mathbf{f} \\times \\mathbf{up}_{\\text{raw}}}{\\|\\dots\\|} = (${fmt(r.x)},\\, ${fmt(r.y)},\\, ${fmt(r.z)})^\\top`}
                  />
                </div>

                {/* Step 3: True Up */}
                <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-500 font-bold">
                    <span>3. 严格正交的实际上方向 u</span>
                    <span>‖u‖ = 1.00</span>
                  </div>
                  <InlineMath
                    tex={`\\mathbf{u} = \\mathbf{r} \\times \\mathbf{f} = (${fmt(u.x)},\\, ${fmt(u.y)},\\, ${fmt(u.z)})^\\top`}
                  />
                </div>
              </div>
            </div>

            {/* Dot Product Orthogonality Verification */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-muted text-[11px]">
                <span>正交归一性点积检验：</span>
                <span className="font-mono text-foreground font-semibold">
                  r·u = {fmt(dot(r, u))} | r·f = {fmt(dot(r, f))} | u·f ={" "}
                  {fmt(dot(u, f))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
