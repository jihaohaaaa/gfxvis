import {
  AmbientLight,
  ArrowHelper,
  BufferGeometry,
  DirectionalLight,
  GridHelper,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { mathToWorld } from "../../core/coords";
import { createAxesGroup } from "../../core/axes3d";

export type SpaceCurveId = "circle" | "helix" | "trefoil";

export interface SpaceCurve {
  id: SpaceCurveId;
  label: string;
  tMin: number;
  tMax: number;
  defaultT: number;
  point(t: number): [number, number, number];
  tangent(t: number): [number, number, number];
  /** Original symbolic KaTeX formula, e.g. `(\cos t, \sin t, 0)`. */
  tex: string;
}

export const SPACE_CURVES: Record<SpaceCurveId, SpaceCurve> = {
  circle: {
    id: "circle",
    label: "圆",
    tMin: 0,
    tMax: 2 * Math.PI,
    defaultT: 1.0,
    point: (t) => [Math.cos(t), Math.sin(t), 0],
    tangent: (t) => [-Math.sin(t), Math.cos(t), 0],
    tex: "(\\cos t, \\sin t, 0)",
  },
  helix: {
    id: "helix",
    label: "螺旋线",
    tMin: 0,
    tMax: 2 * Math.PI,
    defaultT: 1.5,
    point: (t) => [Math.cos(t), Math.sin(t), 0.5 * t],
    tangent: (t) => [-Math.sin(t), Math.cos(t), 0.5],
    tex: "(\\cos t, \\sin t, \\frac{t}{2})",
  },
  trefoil: {
    id: "trefoil",
    label: "三叶结",
    tMin: 0,
    tMax: 2 * Math.PI,
    defaultT: 0.5,
    point: (t) => [
      (2 + Math.cos(3 * t)) * Math.cos(2 * t),
      (2 + Math.cos(3 * t)) * Math.sin(2 * t),
      Math.sin(3 * t),
    ],
    tangent: (t) => [
      -3 * Math.sin(3 * t) * Math.cos(2 * t) -
        2 * (2 + Math.cos(3 * t)) * Math.sin(2 * t),
      -3 * Math.sin(3 * t) * Math.sin(2 * t) +
        2 * (2 + Math.cos(3 * t)) * Math.cos(2 * t),
      3 * Math.cos(3 * t),
    ],
    tex: "((2+\\cos 3t)\\cos 2t, (2+\\cos 3t)\\sin 2t, \\sin 3t)",
  },
};

export interface Curve3DScene {
  scene: Scene;
  setCurve(id: SpaceCurveId): void;
  setT(t: number): void;
  setAxesVisible(visible: boolean): void;
  dispose(): void;
}

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    const candidate = child as {
      geometry?: { dispose?: () => void };
      material?: { dispose?: () => void } | Array<{ dispose?: () => void }>;
    };
    candidate.geometry?.dispose?.();
    const material = candidate.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose?.());
    } else {
      material?.dispose?.();
    }
  });
}

/**
 * 3D space-curve explorer: circle (z = 0), helix (z linear) and trefoil knot
 * (all three coordinates). A marker and velocity arrow follow r(t).
 */
export function createCurve3DScene(): Curve3DScene {
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 8, 3);
  scene.add(sun);

  // Fixed grid/axes sized to fit all three curves.
  scene.add(new GridHelper(6, 16, 0x64748b, 0x475569));

  const axesGroup = createAxesGroup(3.0);
  scene.add(axesGroup);

  let currentId: SpaceCurveId = "circle";
  let curveLine: Line | null = null;
  const curveMaterial = new LineBasicMaterial({ color: 0x94a3b8 });

  const marker = new Mesh(
    new SphereGeometry(0.09, 20, 20),
    new MeshStandardMaterial({ color: 0xef4444 }),
  );
  scene.add(marker);

  const velocityArrow = new ArrowHelper(
    new Vector3(0, 1, 0),
    new Vector3(),
    0.7,
    0x3b82f6,
    0.18,
    0.12,
  );
  scene.add(velocityArrow);

  function buildCurveGeometry(id: SpaceCurveId): BufferGeometry {
    const curve = SPACE_CURVES[id];
    const pts: Vector3[] = [];
    const N = 256;
    for (let i = 0; i <= N; i++) {
      const t = curve.tMin + ((curve.tMax - curve.tMin) * i) / N;
      const [x, y, z] = curve.point(t);
      const [wx, wy, wz] = mathToWorld(x, y, z);
      pts.push(new Vector3(wx, wy, wz));
    }
    return new BufferGeometry().setFromPoints(pts);
  }

  function setCurve(id: SpaceCurveId): void {
    if (curveLine) {
      scene.remove(curveLine);
      curveLine.geometry.dispose();
      curveLine = null;
    }
    currentId = id;
    curveLine = new Line(buildCurveGeometry(id), curveMaterial);
    scene.add(curveLine);
  }

  function setT(t: number): void {
    const curve = SPACE_CURVES[currentId];
    const [mx, my, mz] = curve.point(t);
    const [wx, wy, wz] = mathToWorld(mx, my, mz);
    marker.position.set(wx, wy, wz);
    const [tx, ty, tz] = curve.tangent(t);
    const mag = Math.hypot(tx, ty, tz) || 1;
    const [dx, dy, dz] = mathToWorld(tx / mag, ty / mag, tz / mag);
    velocityArrow.position.set(wx, wy, wz);
    velocityArrow.setDirection(new Vector3(dx, dy, dz));
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function dispose(): void {
    disposeObject(scene);
  }

  setCurve("circle");
  setT(1.0);
  return { scene, setCurve, setT, setAxesVisible, dispose };
}
