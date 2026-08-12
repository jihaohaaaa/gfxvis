import {
  ArrowHelper,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/axes3d";
import { mathToWorld } from "../../core/coords";
import { clamp } from "../../core/math";
import {
  addGroundGrid,
  addStandardLights,
  buildColoredGrid,
  createMarker,
  createSurfaceMaterial,
  disposeObject,
} from "../../core/three-utils";

export type SurfaceId = "sphere" | "graph";

export interface ParametricSurface {
  id: SurfaceId;
  label: string;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  nu: number;
  nv: number;
  point(u: number, v: number): [number, number, number];
  /** Original symbolic KaTeX formula, e.g. `(\sin u \cos v, \sin u \sin v, \cos u)`. */
  tex: string;
  /** First partial derivative dr/du at (u, v). */
  du(u: number, v: number): [number, number, number];
  /** Second partial derivative dr/dv at (u, v). */
  dv(u: number, v: number): [number, number, number];
  /** Original symbolic KaTeX formula of dr/du. */
  duTex: string;
  /** Original symbolic KaTeX formula of dr/dv. */
  dvTex: string;
  defaults: { u: number; v: number };
}

export const PARAMETRIC_SURFACES: Record<SurfaceId, ParametricSurface> = {
  sphere: {
    id: "sphere",
    label: "球面",
    uMin: 0,
    uMax: Math.PI,
    vMin: 0,
    vMax: 2 * Math.PI,
    nu: 24,
    nv: 48,
    point: (u, v) => [
      Math.sin(u) * Math.cos(v),
      Math.sin(u) * Math.sin(v),
      Math.cos(u),
    ],
    tex: "(\\sin u \\cos v, \\sin u \\sin v, \\cos u)",
    du: (u, v) => [
      Math.cos(u) * Math.cos(v),
      Math.cos(u) * Math.sin(v),
      -Math.sin(u),
    ],
    dv: (u, v) => [-Math.sin(u) * Math.sin(v), Math.sin(u) * Math.cos(v), 0],
    duTex: "(\\cos u \\cos v, \\cos u \\sin v, -\\sin u)",
    dvTex: "(-\\sin u \\sin v, \\sin u \\cos v, 0)",
    defaults: { u: 1.2, v: 1.5 },
  },
  graph: {
    id: "graph",
    label: "函数图像",
    uMin: -1.4,
    uMax: 1.4,
    vMin: -1.4,
    vMax: 1.4,
    nu: 32,
    nv: 32,
    point: (u, v) => [u, v, u * u + v * v],
    tex: "(u, v, u^2+v^2)",
    du: (u, _v) => [1, 0, 2 * u],
    dv: (_u, v) => [0, 1, 2 * v],
    duTex: "(1, 0, 2u)",
    dvTex: "(0, 1, 2v)",
    defaults: { u: 0.5, v: 0.7 },
  },
};

export interface ParametricSurfaceScene {
  scene: Scene;
  setSurface(id: SurfaceId): void;
  setParams(u: number, v: number): void;
  setAxesVisible(visible: boolean): void;
  setTangentsVisible(visible: boolean): void;
  dispose(): void;
}

/** Vertex-colored parametric mesh (color = math z height). */
function buildMesh(s: ParametricSurface): Mesh {
  const uAt = (i: number) => s.uMin + ((s.uMax - s.uMin) * i) / s.nu;
  const vAt = (j: number) => s.vMin + ((s.vMax - s.vMin) * j) / s.nv;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i <= s.nu; i++) {
    for (let j = 0; j <= s.nv; j++) {
      const z = s.point(uAt(i), vAt(j))[2];
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  }
  const geometry = buildColoredGrid(
    s.nu,
    s.nv,
    (i, j) => mathToWorld(...s.point(uAt(i), vAt(j))),
    (i, j) => s.point(uAt(i), vAt(j))[2],
    { min: zMin, max: zMax },
  );
  return new Mesh(
    geometry,
    createSurfaceMaterial({ transparent: false, polygonOffset: true }),
  );
}

/** Parameter grid: u-curves (v fixed) and v-curves (u fixed) as segments. */
function buildGrid(s: ParametricSurface): BufferGeometry {
  const pts: number[] = [];
  const pushCurve = (
    fn: (t: number) => [number, number, number],
    tMin: number,
    tMax: number,
    n: number,
  ) => {
    let prev: [number, number, number] | null = null;
    for (let i = 0; i <= n; i++) {
      const t = tMin + ((tMax - tMin) * i) / n;
      const p = fn(t);
      if (prev) {
        const [ax, ay, az] = mathToWorld(prev[0], prev[1], prev[2]);
        const [bx, by, bz] = mathToWorld(p[0], p[1], p[2]);
        pts.push(ax, ay, az, bx, by, bz);
      }
      prev = p;
    }
  };
  for (let j = 0; j <= s.nv; j++) {
    const v = s.vMin + ((s.vMax - s.vMin) * j) / s.nv;
    pushCurve((u) => s.point(u, v), s.uMin, s.uMax, 40);
  }
  for (let i = 0; i <= s.nu; i++) {
    const u = s.uMin + ((s.uMax - s.uMin) * i) / s.nu;
    pushCurve((vv) => s.point(u, vv), s.vMin, s.vMax, 40);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return geometry;
}

/**
 * 3D parametric surface demo: a parametric mesh plus its parameter grid, with
 * two highlighted parameter curves (u-curve and v-curve) through the current
 * (u, v) and a marker at r(u, v).
 */
export function createParametricSurfaceScene(): ParametricSurfaceScene {
  const scene = new Scene();

  addStandardLights(scene);
  addGroundGrid(scene, 5);

  const axesGroup = createAxesGroup(2.8);
  scene.add(axesGroup);

  let currentId: SurfaceId = "sphere";
  let mesh: Mesh | null = null;
  let grid: LineSegments | null = null;

  const uCurve = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xfacc15 }),
  );
  const vCurve = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0x22d3ee }),
  );
  uCurve.renderOrder = 1;
  vCurve.renderOrder = 1;
  scene.add(uCurve, vCurve);

  const marker = createMarker();
  marker.renderOrder = 1;
  scene.add(marker);

  // Tangent plane and the two partial derivative arrows at the marker.
  const tangentArrowU = new ArrowHelper(
    new Vector3(1, 0, 0),
    new Vector3(),
    0.55,
    0xfacc15,
    0.14,
    0.09,
  );
  const tangentArrowV = new ArrowHelper(
    new Vector3(0, 1, 0),
    new Vector3(),
    0.55,
    0x22d3ee,
    0.14,
    0.09,
  );
  const tangentPlane = new Mesh(
    new PlaneGeometry(0.7, 0.7),
    new MeshStandardMaterial({
      color: 0x4cc2ff,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  const tangentsGroup = new Group();
  tangentsGroup.add(tangentArrowU, tangentArrowV, tangentPlane);
  tangentsGroup.renderOrder = 1;
  scene.add(tangentsGroup);

  function setSurface(id: SurfaceId): void {
    if (id === currentId && mesh) return;
    currentId = id;
    if (mesh) {
      scene.remove(mesh);
      disposeObject(mesh);
      mesh = null;
    }
    if (grid) {
      scene.remove(grid);
      disposeObject(grid);
      grid = null;
    }
    const s = PARAMETRIC_SURFACES[id];
    mesh = buildMesh(s);
    scene.add(mesh);
    grid = new LineSegments(
      buildGrid(s),
      new LineBasicMaterial({
        color: 0x1f2937,
        transparent: true,
        opacity: 0.6,
      }),
    );
    grid.renderOrder = 1;
    scene.add(grid);
  }

  function setParams(u: number, v: number): void {
    const s = PARAMETRIC_SURFACES[currentId];
    const uc = clamp(u, s.uMin, s.uMax);
    const vc = clamp(v, s.vMin, s.vMax);

    // u-curve: v fixed = vc, u varies.
    const uPts: Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const uu = s.uMin + ((s.uMax - s.uMin) * i) / 64;
      const [x, y, z] = s.point(uu, vc);
      const [wx, wy, wz] = mathToWorld(x, y, z);
      uPts.push(new Vector3(wx, wy, wz));
    }
    uCurve.geometry.dispose();
    uCurve.geometry = new BufferGeometry().setFromPoints(uPts);

    // v-curve: u fixed = uc, v varies.
    const vPts: Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const vv = s.vMin + ((s.vMax - s.vMin) * i) / 64;
      const [x, y, z] = s.point(uc, vv);
      const [wx, wy, wz] = mathToWorld(x, y, z);
      vPts.push(new Vector3(wx, wy, wz));
    }
    vCurve.geometry.dispose();
    vCurve.geometry = new BufferGeometry().setFromPoints(vPts);

    const [mx, my, mz] = mathToWorld(...s.point(uc, vc));
    marker.position.set(mx, my, mz);

    // Tangent directions: dr/du and dr/dv at the current point.
    const [dux, duy, duz] = mathToWorld(...s.du(uc, vc));
    tangentArrowU.position.copy(marker.position);
    tangentArrowU.setDirection(new Vector3(dux, duy, duz).normalize());
    const [dvx, dvy, dvz] = mathToWorld(...s.dv(uc, vc));
    tangentArrowV.position.copy(marker.position);
    tangentArrowV.setDirection(new Vector3(dvx, dvy, dvz).normalize());

    // Tangent plane: normal = du x dv (math coords), mapped to world.
    const du = new Vector3(...s.du(uc, vc));
    const dv = new Vector3(...s.dv(uc, vc));
    const cross = new Vector3().crossVectors(du, dv);
    const [wnx, wny, wnz] = mathToWorld(cross.x, cross.y, cross.z);
    const normal = new Vector3(wnx, wny, wnz).normalize();
    tangentPlane.position.copy(marker.position);
    tangentPlane.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function setTangentsVisible(visible: boolean): void {
    tangentsGroup.visible = visible;
  }

  function dispose(): void {
    disposeObject(scene);
  }

  setSurface("sphere");
  setParams(1.2, 1.5);
  return {
    scene,
    setSurface,
    setParams,
    setAxesVisible,
    setTangentsVisible,
    dispose,
  };
}
