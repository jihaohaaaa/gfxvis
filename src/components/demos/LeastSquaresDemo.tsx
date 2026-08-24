import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  fitLeastSquaresLinear2D,
  type LeastSquaresResult2D,
  svd2x2,
  transpose2x2,
  multiplyMatrix2x2,
  type Matrix2x2,
} from "../../math/index";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import PresetSelector from "../framework/PresetSelector";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";

interface Point2D {
  id: number;
  x: number;
  y: number;
  name: string;
}

const PRESETS: Record<
  string,
  {
    name: string;
    desc: string;
    points: Point2D[];
    defaultMethod?: "normal" | "qr" | "svd" | "ridge";
  }
> = {
  standard: {
    name: "标准 3 点拟合",
    desc: "经典教科书算例：(1,1), (2,2), (3,2)，拟合 y = 2/3 + 1/2 x，残差非零",
    points: [
      { id: 1, x: 1, y: 1, name: "P₁" },
      { id: 2, x: 2, y: 2, name: "P₂" },
      { id: 3, x: 3, y: 2, name: "P₃" },
    ],
  },
  collinear: {
    name: "完美共线 (零残差)",
    desc: "三点严格共线 y = x，目标向量 b 恰好落在列空间 col(A) 内部，||e|| = 0",
    points: [
      { id: 1, x: 1, y: 1, name: "P₁" },
      { id: 2, x: 2, y: 2, name: "P₂" },
      { id: 3, x: 3, y: 3, name: "P₃" },
    ],
  },
  ill_conditioned: {
    name: "病态近共线 (高条件数)",
    desc: "x 坐标极其接近密集，导致列空间基向量几乎共线，kappa(A^T A) 发生平方爆炸",
    points: [
      { id: 1, x: 1.0, y: 1.0, name: "P₁" },
      { id: 2, x: 1.05, y: 1.05, name: "P₂" },
      { id: 3, x: 1.1, y: 1.15, name: "P₃" },
    ],
  },
  outlier: {
    name: "严重离群点 (Outlier)",
    desc: "P₃ 包含强噪声异常值，平方损失使得回归直线被显著往下拉扯",
    points: [
      { id: 1, x: 1, y: 1, name: "P₁" },
      { id: 2, x: 2, y: 2, name: "P₂" },
      { id: 3, x: 3, y: 6, name: "P₃" },
    ],
  },
};

type SolverMethod = "normal" | "qr" | "svd" | "ridge";

export default function LeastSquaresDemo({ height }: { height?: string }) {
  const [presetKey, setPresetKey] = useState<string>("standard");
  const [points, setPoints] = useState<Point2D[]>(PRESETS.standard.points);
  const [method, setMethod] = useState<SolverMethod>("normal");
  const [lambda, setLambda] = useState<number>(0.5);
  const [showSquares, setShowSquares] = useState<boolean>(true);
  const [showColPlane, setShowColPlane] = useState<boolean>(true);

  // 2D Canvas Dragging State
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<number | null>(null);

  // 3D Three.js Container
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const threeSceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    planeMesh?: THREE.Mesh;
    arrowB?: THREE.ArrowHelper;
    arrowBHat?: THREE.ArrowHelper;
    arrowE?: THREE.ArrowHelper;
    arrowA1?: THREE.ArrowHelper;
    arrowA2?: THREE.ArrowHelper;
    normalLine?: THREE.Line;
    animId?: number;
  } | null>(null);

  // Fit Result
  const fitResult: LeastSquaresResult2D = useMemo(() => {
    return fitLeastSquaresLinear2D(points, {
      method,
      lambda: method === "ridge" ? lambda : 0,
    });
  }, [points, method, lambda]);

  // Handle Preset Change
  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    if (PRESETS[key]) {
      setPoints(PRESETS[key].points.map((p) => ({ ...p })));
      if (PRESETS[key].defaultMethod) {
        setMethod(PRESETS[key].defaultMethod!);
      }
    }
  };

  // --- 2D Canvas Coordinate Transforms ---
  const domain = { xMin: -0.5, xMax: 4.5, yMin: -0.5, yMax: 6.5 };

  const mathToCanvas2D = useCallback(
    (mx: number, my: number, width: number, height: number) => {
      const padding = 36;
      const plotW = width - padding * 2;
      const plotH = height - padding * 2;
      const px =
        padding + ((mx - domain.xMin) / (domain.xMax - domain.xMin)) * plotW;
      const py =
        height -
        padding -
        ((my - domain.yMin) / (domain.yMax - domain.yMin)) * plotH;
      return { px, py };
    },
    [domain.xMin, domain.xMax, domain.yMin, domain.yMax],
  );

  const canvasToMath2D = useCallback(
    (px: number, py: number, width: number, height: number) => {
      const padding = 36;
      const plotW = width - padding * 2;
      const plotH = height - padding * 2;
      const mx =
        domain.xMin + ((px - padding) / plotW) * (domain.xMax - domain.xMin);
      const my =
        domain.yMin +
        ((height - padding - py) / plotH) * (domain.yMax - domain.yMin);
      return { mx, my };
    },
    [domain.xMin, domain.xMax, domain.yMin, domain.yMax],
  );

  // --- Render 2D Canvas ---
  const render2D = useCallback(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Grid lines
    ctx.strokeStyle = "rgba(150, 150, 150, 0.12)";
    ctx.lineWidth = 1;
    for (let x = Math.ceil(domain.xMin); x <= Math.floor(domain.xMax); x++) {
      const p1 = mathToCanvas2D(x, domain.yMin, width, height);
      const p2 = mathToCanvas2D(x, domain.yMax, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    for (let y = Math.ceil(domain.yMin); y <= Math.floor(domain.yMax); y++) {
      const p1 = mathToCanvas2D(domain.xMin, y, width, height);
      const p2 = mathToCanvas2D(domain.xMax, y, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }

    // 2. Axes
    ctx.strokeStyle = "rgba(150, 150, 150, 0.4)";
    ctx.lineWidth = 1.5;
    const origin = mathToCanvas2D(0, 0, width, height);
    const xEnd = mathToCanvas2D(domain.xMax, 0, width, height);
    const yEnd = mathToCanvas2D(0, domain.yMax, width, height);
    // X axis
    ctx.beginPath();
    ctx.moveTo(mathToCanvas2D(domain.xMin, 0, width, height).px, origin.py);
    ctx.lineTo(xEnd.px, origin.py);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(origin.px, mathToCanvas2D(0, domain.yMin, width, height).py);
    ctx.lineTo(origin.px, yEnd.py);
    ctx.stroke();

    // 3. Fitted regression line: y = c + d * x
    const { c, d } = fitResult;
    const lineX0 = domain.xMin;
    const lineY0 = c + d * lineX0;
    const lineX1 = domain.xMax;
    const lineY1 = c + d * lineX1;

    const lp0 = mathToCanvas2D(lineX0, lineY0, width, height);
    const lp1 = mathToCanvas2D(lineX1, lineY1, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(36, 36, width - 72, height - 72);
    ctx.clip();

    ctx.strokeStyle = "#3b82f6"; // Blue
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lp0.px, lp0.py);
    ctx.lineTo(lp1.px, lp1.py);
    ctx.stroke();

    // 4. Residual vertical segments and squares (e_i^2)
    points.forEach((p) => {
      const yHat = c + d * p.x;
      const ei = p.y - yHat;
      const pCanvas = mathToCanvas2D(p.x, p.y, width, height);
      const yHatCanvas = mathToCanvas2D(p.x, yHat, width, height);

      // Residual square area (showSquares)
      if (showSquares && Math.abs(ei) > 0.001) {
        const sidePx = Math.abs(pCanvas.py - yHatCanvas.py);
        const topPy = Math.min(pCanvas.py, yHatCanvas.py);
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.lineWidth = 1;
        ctx.fillRect(pCanvas.px, topPy, sidePx, sidePx);
        ctx.strokeRect(pCanvas.px, topPy, sidePx, sidePx);
      }

      // Vertical dashed residual line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ef4444"; // Red residual line
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pCanvas.px, pCanvas.py);
      ctx.lineTo(yHatCanvas.px, yHatCanvas.py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Foot of the projection on the line
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(yHatCanvas.px, yHatCanvas.py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // 5. Draw data points
    points.forEach((p) => {
      const pCanvas = mathToCanvas2D(p.x, p.y, width, height);
      const isDragging = draggingPointId === p.id;

      // Glow halo
      ctx.fillStyle = isDragging
        ? "rgba(245, 158, 11, 0.4)"
        : "rgba(59, 130, 246, 0.2)";
      ctx.beginPath();
      ctx.arc(pCanvas.px, pCanvas.py, isDragging ? 12 : 9, 0, Math.PI * 2);
      ctx.fill();

      // Point circle
      ctx.fillStyle = isDragging ? "#f59e0b" : "#2563eb";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pCanvas.px, pCanvas.py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(
        `${p.name} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
        pCanvas.px + 8,
        pCanvas.py - 6,
      );
    });
  }, [
    points,
    domain.xMin,
    domain.xMax,
    domain.yMin,
    domain.yMax,
    fitResult,
    showSquares,
    draggingPointId,
    mathToCanvas2D,
  ]);

  useEffect(() => {
    render2D();
  }, [render2D]);

  useEffect(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      render2D();
    });
    resizeObserver.observe(canvas);
    return () => {
      resizeObserver.disconnect();
    };
  }, [render2D]);

  // --- Pointer Interactions for 2D Point Dragging ---
  const handlePointerDown2D = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Find nearest point within 18px radius
    let foundId: number | null = null;
    points.forEach((p) => {
      const cp = mathToCanvas2D(
        p.x,
        p.y,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      const dist = Math.hypot(cp.px - px, cp.py - py);
      if (dist <= 18) {
        foundId = p.id;
      }
    });

    if (foundId !== null) {
      setDraggingPointId(foundId);
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove2D = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointId === null) return;
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { mx, my } = canvasToMath2D(
      px,
      py,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    const clampedX = Math.max(0, Math.min(4, Math.round(mx * 10) / 10));
    const clampedY = Math.max(0, Math.min(6, Math.round(my * 10) / 10));

    setPoints((prev) =>
      prev.map((p) =>
        p.id === draggingPointId ? { ...p, x: clampedX, y: clampedY } : p,
      ),
    );
  };

  const handlePointerUp2D = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointId !== null) {
      setDraggingPointId(null);
      if (canvas2DRef.current?.hasPointerCapture(e.pointerId)) {
        canvas2DRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  // --- 3D Vector Space Three.js Setup (Column Space col(A) vs Left Nullspace ker(A^T)) ---
  useEffect(() => {
    const container = threeMountRef.current;
    if (!container) return;

    // 1. Init Scene, Camera, Renderer
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 4.5, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(1.5, 1.5, 1.5);
    controls.update();

    // 2. Add Lighting & 3D Axes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(8, 10, 8);
    scene.add(dirLight);

    const axesHelper = new THREE.AxesHelper(4);
    scene.add(axesHelper);

    // 3. Grid Helper
    const gridHelper = new THREE.GridHelper(8, 8, 0x334155, 0x1e293b);
    gridHelper.position.set(0, 0, 0);
    scene.add(gridHelper);

    threeSceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
    };

    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      controls.update();
      renderer.render(scene, camera);
      threeSceneRef.current!.animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !threeSceneRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (threeSceneRef.current?.animId) {
        cancelAnimationFrame(threeSceneRef.current.animId);
      }
      controls.dispose();
      renderer.dispose();
      container.replaceChildren();
      threeSceneRef.current = null;
    };
  }, []);

  // --- Update 3D Geometry when points change ---
  useEffect(() => {
    const refs = threeSceneRef.current;
    if (!refs) return;
    const { scene } = refs;

    // Remove old dynamic objects
    if (refs.planeMesh) scene.remove(refs.planeMesh);
    if (refs.arrowB) scene.remove(refs.arrowB);
    if (refs.arrowBHat) scene.remove(refs.arrowBHat);
    if (refs.arrowE) scene.remove(refs.arrowE);
    if (refs.arrowA1) scene.remove(refs.arrowA1);
    if (refs.arrowA2) scene.remove(refs.arrowA2);
    if (refs.normalLine) scene.remove(refs.normalLine);

    if (points.length < 3) return;

    // Vector a1 = (1, 1, 1), a2 = (x1, x2, x3), b = (y1, y2, y3)
    const a1 = new THREE.Vector3(1, 1, 1);
    const a2 = new THREE.Vector3(points[0].x, points[1].x, points[2].x);
    const bVec = new THREE.Vector3(points[0].y, points[1].y, points[2].y);

    const bHatVec = new THREE.Vector3(
      fitResult.bHat[0] ?? 0,
      fitResult.bHat[1] ?? 0,
      fitResult.bHat[2] ?? 0,
    );
    const eVec = new THREE.Vector3().subVectors(bVec, bHatVec);

    // 1. Column Space col(A) Plane Mesh: parametric plane = u * a1 + v * a2
    if (showColPlane) {
      const planeGeom = new THREE.BufferGeometry();
      const uSteps = 10;
      const vSteps = 10;
      const uMin = -0.5;
      const uMax = 2.5;
      const vMin = -0.5;
      const vMax = 2.0;

      const vertices: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i <= uSteps; i++) {
        const u = uMin + (i / uSteps) * (uMax - uMin);
        for (let j = 0; j <= vSteps; j++) {
          const v = vMin + (j / vSteps) * (vMax - vMin);
          const p = new THREE.Vector3()
            .addScaledVector(a1, u)
            .addScaledVector(a2, v);
          vertices.push(p.x, p.y, p.z);
        }
      }

      for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
          const a = i * (vSteps + 1) + j;
          const b = (i + 1) * (vSteps + 1) + j;
          const c = (i + 1) * (vSteps + 1) + (j + 1);
          const d = i * (vSteps + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      planeGeom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      planeGeom.setIndex(indices);
      planeGeom.computeVertexNormals();

      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9, // Sky blue
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        wireframe: false,
      });
      const planeMesh = new THREE.Mesh(planeGeom, planeMat);
      scene.add(planeMesh);
      refs.planeMesh = planeMesh;
    }

    // Helper to build 3D arrow
    const makeArrow = (
      dir: THREE.Vector3,
      origin: THREE.Vector3,
      color: number,
    ) => {
      const len = dir.length();
      if (len < 0.001) return undefined;
      const normalized = dir.clone().normalize();
      const arrow = new THREE.ArrowHelper(
        normalized,
        origin,
        len,
        color,
        Math.min(0.3, len * 0.25),
        Math.min(0.18, len * 0.15),
      );
      scene.add(arrow);
      return arrow;
    };

    const origin0 = new THREE.Vector3(0, 0, 0);

    // Vector a1 (yellow) & a2 (cyan)
    refs.arrowA1 = makeArrow(a1, origin0, 0xfacc15);
    refs.arrowA2 = makeArrow(a2, origin0, 0x06b6d4);

    // Target Observation Vector b (red)
    refs.arrowB = makeArrow(bVec, origin0, 0xef4444);

    // Orthogonal Projection Vector bHat in col(A) (green)
    refs.arrowBHat = makeArrow(bHatVec, origin0, 0x10b981);

    // Residual Orthogonal Vector e = b - bHat (purple) connecting bHat -> b
    refs.arrowE = makeArrow(eVec, bHatVec, 0xa855f7);

    // Dashed line for residual normal extending to origin (Left Nullspace ker(A^T))
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3().addScaledVector(eVec, -1.5),
      new THREE.Vector3().addScaledVector(eVec, 1.5),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xc084fc,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    const normalLine = new THREE.Line(lineGeom, lineMat);
    normalLine.computeLineDistances();
    scene.add(normalLine);
    refs.normalLine = normalLine;
  }, [points, fitResult, showColPlane]);

  // KaTeX Matrices computation
  const { c, d, residualNormSq, AtA, Atb, condA, condAtA } = fitResult;
  const a1_dot_e = fitResult.residuals.reduce((acc, e) => acc + e, 0);
  const a2_dot_e = fitResult.residuals.reduce(
    (acc, e, idx) => acc + e * points[idx].x,
    0,
  );

  // Step-by-step mathematical diagnostics for each solver method
  const currentDerivation = useMemo(() => {
    const p1x = points[0]?.x.toFixed(1) ?? "1.0";
    const p2x = points[1]?.x.toFixed(1) ?? "2.0";
    const p3x = points[2]?.x.toFixed(1) ?? "3.0";
    const p1y = points[0]?.y.toFixed(1) ?? "1.0";
    const p2y = points[1]?.y.toFixed(1) ?? "2.0";
    const p3y = points[2]?.y.toFixed(1) ?? "2.0";

    const detAtA = AtA[0][0] * AtA[1][1] - AtA[0][1] * AtA[1][0];
    const invAtA: Matrix2x2 =
      Math.abs(detAtA) > 1e-8
        ? [
            [AtA[1][1] / detAtA, -AtA[0][1] / detAtA],
            [-AtA[1][0] / detAtA, AtA[0][0] / detAtA],
          ]
        : [
            [0, 0],
            [0, 0],
          ];

    if (method === "qr") {
      const sum1 = points.length;
      const sumX = points.reduce((acc, p) => acc + p.x, 0);
      const sumY = points.reduce((acc, p) => acc + p.y, 0);
      const r00 = Math.sqrt(sum1);
      const r01 = sumX / (r00 || 1);
      let q1NormSq = 0;
      const q1Unnorm: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const val = points[i].x - r01 / (r00 || 1);
        q1Unnorm.push(val);
        q1NormSq += val * val;
      }
      const r11 = Math.sqrt(q1NormSq);
      const qty0 = sumY / (r00 || 1);
      let qty1Unnorm = 0;
      for (let i = 0; i < points.length; i++) {
        qty1Unnorm += q1Unnorm[i] * points[i].y;
      }
      const qty1 = r11 > 1e-8 ? qty1Unnorm / r11 : 0;

      return {
        title: "2. QR 分解法 (QR Decomposition)",
        badge: "Rx̂ = Qᵀb",
        steps: [
          {
            label: "理论公式",
            tex: "A = QR \\implies R \\hat{\\mathbf{x}} = Q^\\top \\mathbf{b}",
          },
          {
            label: "正交分解装配",
            tex: `\\begin{pmatrix} ${r00.toFixed(2)} & ${r01.toFixed(2)} \\\\ 0 & ${r11.toFixed(2)} \\end{pmatrix} \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${qty0.toFixed(2)} \\\\ ${qty1.toFixed(2)} \\end{pmatrix}`,
          },
          {
            label: "上三角回代求解",
            tex: `d = \\frac{${qty1.toFixed(2)}}{${r11.toFixed(2)}} = ${d.toFixed(3)}, \\quad c = \\frac{${qty0.toFixed(2)} - (${r01.toFixed(2)})(${d.toFixed(3)})}{${r00.toFixed(2)}} = ${c.toFixed(3)}`,
          },
          {
            label: "最终求解向量",
            tex: `\\hat{\\mathbf{x}} = \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${c.toFixed(3)} \\\\ ${d.toFixed(3)} \\end{pmatrix}`,
          },
        ],
      };
    }

    if (method === "svd") {
      const svdObj = svd2x2(AtA);
      const s1 = Math.sqrt(Math.max(svdObj.sigma1, 0));
      const s2 = Math.sqrt(Math.max(svdObj.sigma2, 0));
      const invS1 = s1 > 1e-4 ? 1 / s1 : 0;
      const invS2 = s2 > 1e-4 ? 1 / s2 : 0;
      const VT = transpose2x2(svdObj.V);
      const SigmaInv: Matrix2x2 = [
        [invS1 * invS1, 0],
        [0, invS2 * invS2],
      ];
      const pinv = multiplyMatrix2x2(svdObj.V, multiplyMatrix2x2(SigmaInv, VT));

      return {
        title: "3. SVD 伪逆法 (SVD Pseudoinverse)",
        badge: "x̂ = A⁺b",
        steps: [
          {
            label: "理论公式",
            tex: "\\hat{\\mathbf{x}} = A^+ \\mathbf{b} = (A^\\top A)^+ A^\\top \\mathbf{b}",
          },
          {
            label: "奇异值分解装配",
            tex: `\\sigma_1 = ${s1.toFixed(2)}, \\; \\sigma_2 = ${s2.toFixed(2)} \\implies \\Sigma = \\begin{pmatrix} ${s1.toFixed(2)} & 0 \\\\ 0 & ${s2.toFixed(2)} \\end{pmatrix}`,
          },
          {
            label: "代入伪逆矩阵相乘",
            tex: `\\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${pinv[0][0].toFixed(3)} & ${pinv[1][0].toFixed(3)} \\\\ ${pinv[0][1].toFixed(3)} & ${pinv[1][1].toFixed(3)} \\end{pmatrix} \\begin{pmatrix} ${Atb[0].toFixed(1)} \\\\ ${Atb[1].toFixed(1)} \\end{pmatrix}`,
          },
          {
            label: "最终求解向量",
            tex: `\\hat{\\mathbf{x}} = \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${c.toFixed(3)} \\\\ ${d.toFixed(3)} \\end{pmatrix}`,
          },
        ],
      };
    }

    if (method === "ridge") {
      const regAtA: Matrix2x2 = [
        [AtA[0][0] + lambda, AtA[0][1]],
        [AtA[1][0], AtA[1][1] + lambda],
      ];
      const detReg = regAtA[0][0] * regAtA[1][1] - regAtA[0][1] * regAtA[1][0];
      const regInv: Matrix2x2 =
        Math.abs(detReg) > 1e-8
          ? [
              [regAtA[1][1] / detReg, -regAtA[0][1] / detReg],
              [-regAtA[1][0] / detReg, regAtA[0][0] / detReg],
            ]
          : [
              [0, 0],
              [0, 0],
            ];

      return {
        title: "4. Ridge 正则化 (Ridge Regression)",
        badge: "(AᵀA + λI)x̂ = Aᵀb",
        steps: [
          {
            label: "理论公式",
            tex: "(A^\\top A + \\lambda I) \\hat{\\mathbf{x}} = A^\\top \\mathbf{b}",
          },
          {
            label: "代入具体数值 Aᵀ, A, b",
            tex: `\\left[ \\begin{pmatrix} 1 & 1 & 1 \\\\ ${p1x} & ${p2x} & ${p3x} \\end{pmatrix} \\begin{pmatrix} 1 & ${p1x} \\\\ 1 & ${p2x} \\\\ 1 & ${p3x} \\end{pmatrix} + ${lambda.toFixed(2)} \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix} \\right] \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} 1 & 1 & 1 \\\\ ${p1x} & ${p2x} & ${p3x} \\end{pmatrix} \\begin{pmatrix} ${p1y} \\\\ ${p2y} \\\\ ${p3y} \\end{pmatrix}`,
          },
          {
            label: "计算阻尼正规方程组",
            tex: `\\begin{pmatrix} ${(AtA[0][0] + lambda).toFixed(1)} & ${AtA[1][0].toFixed(1)} \\\\ ${AtA[0][1].toFixed(1)} & ${(AtA[1][1] + lambda).toFixed(1)} \\end{pmatrix} \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${Atb[0].toFixed(1)} \\\\ ${Atb[1].toFixed(1)} \\end{pmatrix}`,
          },
          {
            label: "阻尼求逆",
            tex: `\\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${regInv[0][0].toFixed(3)} & ${regInv[1][0].toFixed(3)} \\\\ ${regInv[0][1].toFixed(3)} & ${regInv[1][1].toFixed(3)} \\end{pmatrix} \\begin{pmatrix} ${Atb[0].toFixed(1)} \\\\ ${Atb[1].toFixed(1)} \\end{pmatrix}`,
          },
          {
            label: "最终求解向量",
            tex: `\\hat{\\mathbf{x}} = \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${c.toFixed(3)} \\\\ ${d.toFixed(3)} \\end{pmatrix}`,
          },
        ],
      };
    }

    // Default: Normal Equations with complete 5-step matrix substitution
    return {
      title: "1. 正规方程组 (Normal Equations)",
      badge: "AᵀA x̂ = Aᵀb",
      steps: [
        {
          label: "理论公式",
          tex: "A^\\top A \\hat{\\mathbf{x}} = A^\\top \\mathbf{b}",
        },
        {
          label: "代入具体数值 Aᵀ, A, b",
          tex: `\\begin{pmatrix} 1 & 1 & 1 \\\\ ${p1x} & ${p2x} & ${p3x} \\end{pmatrix} \\begin{pmatrix} 1 & ${p1x} \\\\ 1 & ${p2x} \\\\ 1 & ${p3x} \\end{pmatrix} \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} 1 & 1 & 1 \\\\ ${p1x} & ${p2x} & ${p3x} \\end{pmatrix} \\begin{pmatrix} ${p1y} \\\\ ${p2y} \\\\ ${p3y} \\end{pmatrix}`,
        },
        {
          label: "乘法得到正规方程组",
          tex: `\\begin{pmatrix} ${AtA[0][0].toFixed(1)} & ${AtA[1][0].toFixed(1)} \\\\ ${AtA[0][1].toFixed(1)} & ${AtA[1][1].toFixed(1)} \\end{pmatrix} \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${Atb[0].toFixed(1)} \\\\ ${Atb[1].toFixed(1)} \\end{pmatrix}`,
        },
        {
          label: "求逆代入 x̂ = (AᵀA)⁻¹ Aᵀb",
          tex: `\\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${invAtA[0][0].toFixed(3)} & ${invAtA[1][0].toFixed(3)} \\\\ ${invAtA[0][1].toFixed(3)} & ${invAtA[1][1].toFixed(3)} \\end{pmatrix} \\begin{pmatrix} ${Atb[0].toFixed(1)} \\\\ ${Atb[1].toFixed(1)} \\end{pmatrix}`,
        },
        {
          label: "最终求解向量",
          tex: `\\hat{\\mathbf{x}} = \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} ${c.toFixed(3)} \\\\ ${d.toFixed(3)} \\end{pmatrix}`,
        },
      ],
    };
  }, [points, AtA, Atb, c, d, lambda, method]);

  return (
    <ExpandableDemo id="least-squares-demo" height={height}>
      <div id="least-squares-demo" className="space-y-4">
        {/* Top Control Bar */}
        <div className="space-y-2 border-b border-border/80 pb-3">
          {/* Row 1: Method Tabs & Right-aligned CanvasToolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Method Tabs */}
            <div className="flex rounded-lg bg-surface-hover p-1">
              {(
                [
                  { id: "normal", label: "1. 正规方程法 (Normal)" },
                  { id: "qr", label: "2. QR 分解法 (QR)" },
                  { id: "svd", label: "3. SVD 伪逆法 (SVD)" },
                  { id: "ridge", label: "4. Ridge 正则化" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    method === item.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: Toolbar Controls (S / M / L & Expand) */}
            <CanvasToolbar className="static" />
          </div>

          {/* Row 2: Preset Selector */}
          <div className="flex items-center">
            <PresetSelector
              options={Object.entries(PRESETS).map(([key, val]) => ({
                id: key,
                label: val.name,
              }))}
              value={presetKey}
              onChange={handlePresetChange}
            />
          </div>
        </div>

        {/* Ridge Lambda Slider if active */}
        {method === "ridge" && (
          <div className="flex items-center gap-4 rounded-lg bg-surface p-3 border border-border/60">
            <ParamSlider
              label={
                <span className="text-xs font-medium text-muted flex items-center gap-1">
                  Ridge 惩罚系数 <InlineMath tex="\lambda" />:
                </span>
              }
              value={lambda}
              min={0}
              max={5}
              step={0.05}
              onChange={setLambda}
              widthClass="flex-1"
            />
          </div>
        )}

        {/* Dual-View Split Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left View: 2D Data Space Canvas */}
          <div className="relative flex flex-col rounded-xl border border-border/80 bg-surface/50 p-3 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                数据拟合空间 (Data Space <InlineMath tex="\mathbb{R}^2" />)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSquares((v) => !v)}
                  className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                    showSquares
                      ? "border-red-500/50 bg-red-500/15 text-red-400"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  {showSquares ? "隐藏误差面积" : "显示误差面积 e²"}
                </button>
              </div>
            </div>

            <div className="relative h-[var(--demo-height,20rem)] w-full rounded-lg overflow-hidden border border-border/60 bg-slate-950">
              <canvas
                ref={canvas2DRef}
                onPointerDown={handlePointerDown2D}
                onPointerMove={handlePointerMove2D}
                onPointerUp={handlePointerUp2D}
                onPointerCancel={handlePointerUp2D}
                className="w-full h-full cursor-crosshair touch-none"
              />
              <div className="absolute bottom-2 left-2 pointer-events-none rounded bg-black/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
                拖动蓝点调整坐标 (x, y)
              </div>
            </div>

            <div className="mt-2 text-xs text-muted">
              最佳拟合直线：
              <InlineMath tex={`y = ${c.toFixed(2)} + ${d.toFixed(2)} x`} />
              ，残差平方和：
              <InlineMath
                tex={`\\lVert \\mathbf{e} \\rVert^2 = ${residualNormSq.toFixed(3)}`}
              />
            </div>
          </div>

          {/* Right View: 3D Vector Space Canvas (Three.js) */}
          <div className="relative flex flex-col rounded-xl border border-border/80 bg-surface/50 p-3 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                向量子空间 (Vector Space <InlineMath tex="\mathbb{R}^3" />)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowColPlane((v) => !v)}
                  className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                    showColPlane
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-400"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  {showColPlane ? "隐藏列空间平面" : "显示 col(A) 平面"}
                </button>
              </div>
            </div>

            <div
              ref={threeMountRef}
              className="relative h-[var(--demo-height,20rem)] w-full rounded-lg overflow-hidden border border-border/60 bg-slate-950"
            >
              <div className="absolute bottom-2 left-2 pointer-events-none rounded bg-black/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm z-10">
                按住鼠标左键旋转 3D 视角，右键平移
              </div>
            </div>

            {/* Legend & 3D Orthogonality Indicator */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <InlineMath tex="\mathbf{b}" /> 观测向量
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <InlineMath tex="\hat{\mathbf{b}} \in \operatorname{col}(A)" />{" "}
                  投影
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <InlineMath tex="\mathbf{e} \in \ker(A^\top)" /> 残差
                </span>
              </div>
              <div className="text-[11px] text-purple-400 font-mono">
                Aᵀe = [
                {Math.abs(a1_dot_e) < 1e-4 ? "0.00" : a1_dot_e.toFixed(2)},{" "}
                {Math.abs(a2_dot_e) < 1e-4 ? "0.00" : a2_dot_e.toFixed(2)}]ᵀ
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Math Diagnostics & Matrix Cards */}
        <div className="space-y-3">
          {/* Top Row: Card 1 & Card 2 in 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Card 1: Normal Equations / Step-by-Step Derivation */}
            <div className="rounded-lg border border-border bg-surface p-3 space-y-2 text-xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>{currentDerivation.title}</span>
                <span className="text-[10px] text-muted font-mono">
                  {currentDerivation.badge}
                </span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {currentDerivation.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5"
                  >
                    <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                      <span>
                        {idx + 1}. {step.label}
                      </span>
                    </div>
                    <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                      <InlineMath tex={step.tex} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-accent font-semibold pt-1 border-t border-border/60 flex items-center justify-between">
                <span>拟合方程:</span>
                <span className="font-mono">
                  y = {c.toFixed(2)} + {d.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Card 2: Subspace & Orthogonality Check */}
            <div className="rounded-lg border border-border bg-surface p-3 space-y-2 text-xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>四大子空间正交性检验</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  e ⟂ col(A)
                </span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {/* Step 1: 投影向量具体数值 bHat = A xHat */}
                <div className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5">
                  <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                    <span>1. 投影向量计算 b̂ = A x̂</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                    <InlineMath
                      tex={`\\hat{\\mathbf{b}} = A\\hat{\\mathbf{x}} = \\begin{pmatrix} 1 & ${points[0]?.x.toFixed(1) ?? "1.0"} \\\\ 1 & ${points[1]?.x.toFixed(1) ?? "2.0"} \\\\ 1 & ${points[2]?.x.toFixed(1) ?? "3.0"} \\end{pmatrix} \\begin{pmatrix} ${c.toFixed(3)} \\\\ ${d.toFixed(3)} \\end{pmatrix} = \\begin{pmatrix} ${(fitResult.bHat[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.bHat[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.bHat[2] ?? 0).toFixed(2)} \\end{pmatrix}`}
                    />
                  </div>
                </div>

                {/* Step 2: 残差向量具体数值 e = b - bHat */}
                <div className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5">
                  <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                    <span>2. 残差向量计算 e = b - b̂</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                    <InlineMath
                      tex={`\\mathbf{e} = \\mathbf{b} - \\hat{\\mathbf{b}} = \\begin{pmatrix} ${points[0]?.y.toFixed(1) ?? "1.0"} \\\\ ${points[1]?.y.toFixed(1) ?? "2.0"} \\\\ ${points[2]?.y.toFixed(1) ?? "2.0"} \\end{pmatrix} - \\begin{pmatrix} ${(fitResult.bHat[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.bHat[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.bHat[2] ?? 0).toFixed(2)} \\end{pmatrix} = \\begin{pmatrix} ${(fitResult.residuals[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[2] ?? 0).toFixed(2)} \\end{pmatrix}`}
                    />
                  </div>
                </div>

                {/* Step 3: 基向量 a1 点乘 e */}
                <div className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5">
                  <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                    <span>3. 基向量 a₁ · e 内积校验</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                    <InlineMath
                      tex={`\\mathbf{a}_1^\\top \\mathbf{e} = \\begin{pmatrix} 1 & 1 & 1 \\end{pmatrix} \\begin{pmatrix} ${(fitResult.residuals[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[2] ?? 0).toFixed(2)} \\end{pmatrix} = (1)(${(fitResult.residuals[0] ?? 0).toFixed(2)}) + (1)(${(fitResult.residuals[1] ?? 0).toFixed(2)}) + (1)(${(fitResult.residuals[2] ?? 0).toFixed(2)}) = ${Math.abs(a1_dot_e) < 1e-4 ? "0.00" : a1_dot_e.toFixed(2)}`}
                    />
                  </div>
                </div>

                {/* Step 4: 基向量 a2 点乘 e */}
                <div className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5">
                  <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                    <span>4. 基向量 a₂ · e 内积校验</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                    <InlineMath
                      tex={`\\mathbf{a}_2^\\top \\mathbf{e} = \\begin{pmatrix} ${points[0]?.x.toFixed(1) ?? "1.0"} & ${points[1]?.x.toFixed(1) ?? "2.0"} & ${points[2]?.x.toFixed(1) ?? "3.0"} \\end{pmatrix} \\begin{pmatrix} ${(fitResult.residuals[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[2] ?? 0).toFixed(2)} \\end{pmatrix} = (${points[0]?.x.toFixed(1) ?? "1.0"})(${(fitResult.residuals[0] ?? 0).toFixed(2)}) + (${points[1]?.x.toFixed(1) ?? "2.0"})(${(fitResult.residuals[1] ?? 0).toFixed(2)}) + (${points[2]?.x.toFixed(1) ?? "3.0"})(${(fitResult.residuals[2] ?? 0).toFixed(2)}) = ${Math.abs(a2_dot_e) < 1e-4 ? "0.00" : a2_dot_e.toFixed(2)}`}
                    />
                  </div>
                </div>

                {/* Step 5: 矩阵紧凑形式 Aᵀe */}
                <div className="rounded bg-surface-hover/50 p-1.5 border border-border/40 space-y-0.5">
                  <div className="text-[10px] text-muted font-mono flex items-center justify-between">
                    <span>5. 矩阵形式 Aᵀe = 0</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden py-1 text-[11px] text-foreground">
                    <InlineMath
                      tex={`A^\\top \\mathbf{e} = \\begin{pmatrix} 1 & 1 & 1 \\\\ ${points[0]?.x.toFixed(1) ?? "1.0"} & ${points[1]?.x.toFixed(1) ?? "2.0"} & ${points[2]?.x.toFixed(1) ?? "3.0"} \\end{pmatrix} \\begin{pmatrix} ${(fitResult.residuals[0] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[1] ?? 0).toFixed(2)} \\\\ ${(fitResult.residuals[2] ?? 0).toFixed(2)} \\end{pmatrix} = \\begin{pmatrix} ${Math.abs(a1_dot_e) < 1e-4 ? "0.00" : a1_dot_e.toFixed(2)} \\\\ ${Math.abs(a2_dot_e) < 1e-4 ? "0.00" : a2_dot_e.toFixed(2)} \\end{pmatrix}`}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-purple-400 font-medium pt-1 border-t border-border/60 flex items-center justify-between">
                <span>代数结论:</span>
                <span className="font-mono text-[10px]">
                  <InlineMath tex="\mathbf{e} \in \ker(A^\top) \iff \mathbf{e} \perp \operatorname{col}(A)" />
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Card 3 Full-width */}
          <div className="rounded-lg border border-border bg-surface p-3 space-y-1 text-xs">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>数值稳定性与条件数</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  condAtA > 1000
                    ? "bg-red-500/20 text-red-400"
                    : condAtA > 100
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {condAtA > 1000
                  ? "严重病态"
                  : condAtA > 100
                    ? "一般病态"
                    : "良好稳定"}
              </span>
            </div>
            <div className="text-muted text-[11px] flex flex-wrap items-center gap-6 pt-1">
              <div>
                设计矩阵条件数:{" "}
                <InlineMath tex={`\\kappa(A) = ${condA.toFixed(2)}`} />
              </div>
              <div>
                正规方程条件数:{" "}
                <InlineMath
                  tex={`\\kappa(A^\\top A) = \\kappa(A)^2 = ${condAtA.toFixed(1)}`}
                />
              </div>
            </div>
            {condAtA > 100 && (
              <div className="text-[10px] text-amber-400 leading-tight pt-1">
                ⚠️ 正规方程平方放大了条件数，工程建议采用 QR 正交分解或 SVD
                求解！
              </div>
            )}
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
