import {
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/3d/axes3d";
import { mathToWorld } from "../../core/3d/coords";
import {
  addGroundGrid,
  addStandardLights,
  createMarker,
  disposeObject,
} from "../../core/3d/three-utils";
import { evaluateNurbsHomogeneous, type Point2 } from "./bezier-splines";

export type HomogeneousPreset = "arc90" | "parabola";
export type HomogeneousMode = "trace" | "bundle";

export interface HomogeneousPresetData {
  id: HomogeneousPreset;
  label: string;
  points: Point2[];
  defaultW1: number;
}

export const HOMOGENEOUS_PRESETS: Record<
  HomogeneousPreset,
  HomogeneousPresetData
> = {
  arc90: {
    id: "arc90",
    label: "90° 圆弧",
    points: [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    defaultW1: Math.SQRT1_2,
  },
  parabola: {
    id: "parabola",
    label: "二次抛物线",
    points: [
      [-1.2, -0.5],
      [0, 1.5],
      [1.2, -0.5],
    ],
    defaultW1: 1.0,
  },
};

const DEGREE = 2;
const CLAMPED_KNOTS = [0, 0, 0, 1, 1, 1];
const CURVE_SAMPLES = 80;
const BUNDLE_RAYS = 18;

export interface NurbsHomogeneous3DScene {
  scene: Scene;
  setMode(mode: HomogeneousMode): void;
  setWeight(w1: number): void;
  setU(u: number): void;
  setPreset(preset: HomogeneousPreset): void;
  dispose(): void;
}

export function createNurbsHomogeneous3DScene(): NurbsHomogeneous3DScene {
  const scene = new Scene();
  addStandardLights(scene);

  // 1. 底层参考网格 (w = 0 空间基底)
  addGroundGrid(scene, 8, 16);

  // 2. 坐标系 (X, Y, W)
  const axes = createAxesGroup(2.2);
  scene.add(axes);

  // 3. 超平面 w = 1 (物理仿射超平面: Three.js 世界坐标 Y = 1)
  const planeGeom = new PlaneGeometry(4.5, 4.5);
  planeGeom.rotateX(-Math.PI / 2);
  const planeMat = new MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.12,
    side: DoubleSide,
    depthWrite: false,
  });
  const planeMesh = new Mesh(planeGeom, planeMat);
  planeMesh.position.set(0, 1.0, 0);
  scene.add(planeMesh);

  // 平面边缘线圈
  const planeEdgeGeom = new BufferGeometry();
  const half = 2.25;
  const edgeCorners = [
    new Vector3(-half, 1, -half),
    new Vector3(half, 1, -half),
    new Vector3(half, 1, half),
    new Vector3(-half, 1, half),
    new Vector3(-half, 1, -half),
  ];
  planeEdgeGeom.setFromPoints(edgeCorners);
  const planeEdge = new Line(
    planeEdgeGeom,
    new LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 }),
  );
  scene.add(planeEdge);

  // 4. 投影中心 / 射影原点 (0, 0, 0)
  const originMarker = createMarker(0x94a3b8, 0.08);
  originMarker.position.set(0, 0, 0);
  scene.add(originMarker);

  // 5. 动态图元组
  const dynamicGroup = new Group();
  scene.add(dynamicGroup);

  // 状态变量
  let currentPreset: HomogeneousPreset = "arc90";
  let currentW1 = HOMOGENEOUS_PRESETS.arc90.defaultW1;
  let currentU = 0.5;
  let currentMode: HomogeneousMode = "trace";

  function rebuild() {
    // 清除既有动态图元
    while (dynamicGroup.children.length > 0) {
      const child = dynamicGroup.children[0];
      dynamicGroup.remove(child);
      disposeObject(child);
    }

    const { points } = HOMOGENEOUS_PRESETS[currentPreset];
    const weights = [1, currentW1, 1];

    // 计算齐次控制点与物理控制点
    // Math 坐标 (x, y, w) -> Three.js 世界坐标 (x, w, -y)
    const p0Math: [number, number, number] = [points[0][0], points[0][1], 1];
    const p1Math: [number, number, number] = [points[1][0], points[1][1], 1];
    const p2Math: [number, number, number] = [points[2][0], points[2][1], 1];

    const p0WMath: [number, number, number] = [
      weights[0] * points[0][0],
      weights[0] * points[0][1],
      weights[0],
    ];
    const p1WMath: [number, number, number] = [
      weights[1] * points[1][0],
      weights[1] * points[1][1],
      weights[1],
    ];
    const p2WMath: [number, number, number] = [
      weights[2] * points[2][0],
      weights[2] * points[2][1],
      weights[2],
    ];

    const p0World = new Vector3(...mathToWorld(...p0Math));
    const p1World = new Vector3(...mathToWorld(...p1Math));
    const p2World = new Vector3(...mathToWorld(...p2Math));

    const p0WWorld = new Vector3(...mathToWorld(...p0WMath));
    const p1WWorld = new Vector3(...mathToWorld(...p1WMath));
    const p2WWorld = new Vector3(...mathToWorld(...p2WMath));

    // A. 3D 齐次控制多边形 (浅青色虚线)
    const poly3dGeom = new BufferGeometry().setFromPoints([
      p0WWorld,
      p1WWorld,
      p2WWorld,
    ]);
    const poly3dLine = new Line(
      poly3dGeom,
      new LineBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.7,
      }),
    );
    dynamicGroup.add(poly3dLine);

    // 3D 齐次控制点标记 (带权重)
    const mP0W = createMarker(0x818cf8, 0.07);
    mP0W.position.copy(p0WWorld);
    const mP1W = createMarker(0xc084fc, 0.08); // P1 重点高亮
    mP1W.position.copy(p1WWorld);
    const mP2W = createMarker(0x818cf8, 0.07);
    mP2W.position.copy(p2WWorld);
    dynamicGroup.add(mP0W, mP1W, mP2W);

    // B. 物理控制多边形 (w = 1 平面上，深灰虚线)
    const poly2dGeom = new BufferGeometry().setFromPoints([
      p0World,
      p1World,
      p2World,
    ]);
    const poly2dLine = new Line(
      poly2dGeom,
      new LineBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.5,
      }),
    );
    dynamicGroup.add(poly2dLine);

    // 物理控制点标记
    const mP0 = createMarker(0x475569, 0.05);
    mP0.position.copy(p0World);
    const mP1 = createMarker(0x475569, 0.05);
    mP1.position.copy(p1World);
    const mP2 = createMarker(0x475569, 0.05);
    mP2.position.copy(p2World);
    dynamicGroup.add(mP0, mP1, mP2);

    // C. 采样 3D 齐次曲线 ~C(u) 与物理曲线 C(u)
    const curve3dPoints: Vector3[] = [];
    const curve2dPoints: Vector3[] = [];

    for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
      const u = i / CURVE_SAMPLES;
      const { homogeneousPoint, projectedPoint } = evaluateNurbsHomogeneous(
        points,
        weights,
        DEGREE,
        u,
        CLAMPED_KNOTS,
      );
      const w3 = mathToWorld(
        homogeneousPoint[0],
        homogeneousPoint[1],
        homogeneousPoint[2],
      );
      const w2 = mathToWorld(projectedPoint[0], projectedPoint[1], 1.0);
      curve3dPoints.push(new Vector3(...w3));
      curve2dPoints.push(new Vector3(...w2));
    }

    // 3D 齐次 B-Spline 曲线 (紫蓝色)
    const c3dGeom = new BufferGeometry().setFromPoints(curve3dPoints);
    const c3dLine = new Line(
      c3dGeom,
      new LineBasicMaterial({ color: 0xa855f7, linewidth: 2 }),
    );
    dynamicGroup.add(c3dLine);

    // 2D 物理平面 NURBS 曲线 (碧绿色 / 翠绿，在 w=1 超平面上)
    const c2dGeom = new BufferGeometry().setFromPoints(curve2dPoints);
    const c2dLine = new Line(
      c2dGeom,
      new LineBasicMaterial({ color: 0x10b981, linewidth: 3 }),
    );
    dynamicGroup.add(c2dLine);

    // D. 模式渲染：光束追踪 vs 透视丛
    if (currentMode === "trace") {
      // 当前参数 u 处求值
      const { homogeneousPoint, projectedPoint } = evaluateNurbsHomogeneous(
        points,
        weights,
        DEGREE,
        currentU,
        CLAMPED_KNOTS,
      );
      const pt3World = new Vector3(
        ...mathToWorld(
          homogeneousPoint[0],
          homogeneousPoint[1],
          homogeneousPoint[2],
        ),
      );
      const pt2World = new Vector3(
        ...mathToWorld(projectedPoint[0], projectedPoint[1], 1.0),
      );

      // 1. 原点到 ~C(u) 再穿透到更远处的激光射线
      const rayDir = pt3World.clone().normalize();
      const rayLen = Math.max(pt3World.length(), pt2World.length()) * 1.35;
      const rayEnd = rayDir.clone().multiplyScalar(rayLen);

      const rayGeom = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        rayEnd,
      ]);
      const rayLine = new Line(
        rayGeom,
        new LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }),
      );
      dynamicGroup.add(rayLine);

      // 2. ~P1 的母线射线 (原点 -> P1 -> ~P1)
      const p1RayDir = p1WWorld.clone().normalize();
      const p1RayEnd = p1RayDir
        .clone()
        .multiplyScalar(Math.max(p1WWorld.length(), p1World.length()) * 1.25);
      const p1RayGeom = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        p1RayEnd,
      ]);
      const p1RayLine = new Line(
        p1RayGeom,
        new LineBasicMaterial({
          color: 0xc084fc,
          transparent: true,
          opacity: 0.4,
        }),
      );
      dynamicGroup.add(p1RayLine);

      // 3. 高亮求值点标志
      const mEval3D = createMarker(0xf59e0b, 0.08);
      mEval3D.position.copy(pt3World);
      const mEval2D = createMarker(0x10b981, 0.08);
      mEval2D.position.copy(pt2World);
      dynamicGroup.add(mEval3D, mEval2D);

      // 4. 垂直垂线 (~C(u) 投影到物理平面 / 地面)
      const dropGeom = new BufferGeometry().setFromPoints([
        pt3World,
        new Vector3(pt3World.x, 1, pt3World.z),
      ]);
      const dropLine = new Line(
        dropGeom,
        new LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.4,
        }),
      );
      dynamicGroup.add(dropLine);
    } else {
      // Bundle 模式：沿曲线密集绘制透射线丛 (形成透视锥面)
      const bundleLines: Vector3[] = [];
      for (let k = 0; k <= BUNDLE_RAYS; k += 1) {
        const u = k / BUNDLE_RAYS;
        const { homogeneousPoint, projectedPoint } = evaluateNurbsHomogeneous(
          points,
          weights,
          DEGREE,
          u,
          CLAMPED_KNOTS,
        );
        const pt3 = new Vector3(
          ...mathToWorld(
            homogeneousPoint[0],
            homogeneousPoint[1],
            homogeneousPoint[2],
          ),
        );
        const pt2 = new Vector3(
          ...mathToWorld(projectedPoint[0], projectedPoint[1], 1.0),
        );
        const maxLen = Math.max(pt3.length(), pt2.length()) * 1.1;
        const dir = pt3.clone().normalize();
        bundleLines.push(new Vector3(0, 0, 0), dir.multiplyScalar(maxLen));
      }
      const bundleGeom = new BufferGeometry().setFromPoints(bundleLines);
      const bundleMesh = new Line(
        bundleGeom,
        new LineBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.28,
        }),
      );
      dynamicGroup.add(bundleMesh);
    }
  }

  // 初次构建
  rebuild();

  return {
    scene,
    setMode(mode) {
      currentMode = mode;
      rebuild();
    },
    setWeight(w1) {
      currentW1 = w1;
      rebuild();
    },
    setU(u) {
      currentU = u;
      rebuild();
    },
    setPreset(preset) {
      currentPreset = preset;
      currentW1 = HOMOGENEOUS_PRESETS[preset].defaultW1;
      rebuild();
    },
    dispose() {
      disposeObject(scene);
    },
  };
}
