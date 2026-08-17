import {
  ArrowHelper,
  BufferGeometry,
  DoubleSide,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  TorusGeometry,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/3d/axes3d";
import { mathToWorld } from "../../core/3d/coords";
import {
  addGroundGrid,
  addStandardLights,
  disposeObject,
} from "../../core/3d/three-utils";
import {
  createTransformGizmo3D,
  type TransformGizmo3D,
} from "../../core/3d/gizmo3d";
import type { ProjectionModeId } from "./projection2d";

export type ProjectionTargetId = "xy-plane" | "plane-xyz";

export interface Projection3DMode {
  id: ProjectionModeId;
  label: string;
  /** KaTeX matrix of P. */
  tex: string;
  /** KaTeX formula of Px in terms of x, y, z. */
  texPx: string;
  /** KaTeX formula of (I - P)x in terms of x, y, z. */
  texResidual: string;
  project(x: number, y: number, z: number): [number, number, number];
  residual(x: number, y: number, z: number): [number, number, number];
}

export interface Projection3DTarget {
  id: ProjectionTargetId;
  label: string;
  /** KaTeX of the target plane equation, e.g. z = 0 or x + y + z = 0. */
  tex: string;
  /** Plane normal in math coordinates. */
  normal: [number, number, number];
  modes: Record<ProjectionModeId, Projection3DMode>;
}

export interface Projection3DScene {
  scene: Scene;
  gizmo: TransformGizmo3D;
  setVector(x: number, y: number, z: number): void;
  setMode(mode: ProjectionModeId): void;
  setTarget(target: ProjectionTargetId): void;
  setAxesVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * 3D projections onto a plane through the origin: the xy-plane (z = 0) or the
 * oblique plane x + y + z = 0, each in an orthogonal and an oblique mode.
 */
export const PROJECTION3D_TARGETS: Record<
  ProjectionTargetId,
  Projection3DTarget
> = {
  "xy-plane": {
    id: "xy-plane",
    label: "xy 平面",
    tex: "z = 0",
    normal: [0, 0, 1],
    modes: {
      orthogonal: {
        id: "orthogonal",
        label: "正交投影",
        tex: "\\begin{pmatrix}1&0&0\\\\0&1&0\\\\0&0&0\\end{pmatrix}",
        texPx: "(x,\\,y,\\,0)",
        texResidual: "(0,\\,0,\\,z)",
        project: (x, y, _z) => [x, y, 0],
        residual: (_x, _y, z) => [0, 0, z],
      },
      oblique: {
        id: "oblique",
        label: "斜投影(沿 (1,-1,1))",
        tex: "\\begin{pmatrix}1&0&-1\\\\0&1&1\\\\0&0&0\\end{pmatrix}",
        texPx: "(x-z,\\,y+z,\\,0)",
        texResidual: "(z,\\,-z,\\,z)",
        project: (x, y, z) => [x - z, y + z, 0],
        residual: (_x, _y, z) => [z, -z, z],
      },
    },
  },
  "plane-xyz": {
    id: "plane-xyz",
    label: "x+y+z=0",
    tex: "x+y+z = 0",
    normal: [1, 1, 1],
    modes: {
      orthogonal: {
        id: "orthogonal",
        label: "正交投影",
        tex: "\\frac{1}{3}\\begin{pmatrix}2&-1&-1\\\\-1&2&-1\\\\-1&-1&2\\end{pmatrix}",
        texPx: "(x-\\tfrac{s}{3},\\,y-\\tfrac{s}{3},\\,z-\\tfrac{s}{3})",
        texResidual: "(\\tfrac{s}{3},\\,\\tfrac{s}{3},\\,\\tfrac{s}{3})",
        project: (x, y, z) => {
          const s = x + y + z;
          return [x - s / 3, y - s / 3, z - s / 3];
        },
        residual: (x, y, z) => {
          const s = x + y + z;
          return [s / 3, s / 3, s / 3];
        },
      },
      oblique: {
        id: "oblique",
        label: "斜投影(沿 (1,1,-1))",
        tex: "\\frac{1}{3}\\begin{pmatrix}2&-1&1\\\\-1&2&1\\\\1&1&2\\end{pmatrix}",
        texPx: "(x-\\tfrac{d}{3},\\,y-\\tfrac{d}{3},\\,z+\\tfrac{d}{3})",
        texResidual: "(\\tfrac{d}{3},\\,\\tfrac{d}{3},\\,-\\tfrac{d}{3})",
        project: (x, y, z) => {
          const d = x + y - z;
          return [x - d / 3, y - d / 3, z + d / 3];
        },
        residual: (x, y, z) => {
          const d = x + y - z;
          return [d / 3, d / 3, -d / 3];
        },
      },
    },
  },
};

const ORIGIN = new Vector3(0, 0, 0);

function applyArrow(
  arrow: ArrowHelper,
  origin: Vector3,
  target: Vector3,
  headLen: number,
  headWidth: number,
): void {
  const dir = target.clone().sub(origin);
  const len = dir.length();
  if (len < 1e-4) {
    arrow.visible = false;
    return;
  }
  arrow.visible = true;
  arrow.position.copy(origin);
  arrow.setDirection(dir.normalize());
  arrow.setLength(len, headLen, headWidth);
}

export function createProjection3DScene(): Projection3DScene {
  const scene = new Scene();
  addStandardLights(scene);

  const axesGroup = createAxesGroup(3);
  scene.add(axesGroup);
  addGroundGrid(scene, 6, 12);

  const targetPlane = new Mesh(
    new PlaneGeometry(6, 6),
    new MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  scene.add(targetPlane);

  const vector = { x: 2, y: 1.5, z: 1 };
  let currentTarget: ProjectionTargetId = "xy-plane";
  let currentMode: ProjectionModeId = "orthogonal";

  const xArrow = new ArrowHelper(
    new Vector3(1, 0, 0),
    ORIGIN,
    1,
    0xd97706,
    0.22,
    0.12,
  );
  const pxArrow = new ArrowHelper(
    new Vector3(1, 0, 0),
    ORIGIN,
    1,
    0x2563eb,
    0.2,
    0.11,
  );
  scene.add(xArrow);
  scene.add(pxArrow);

  const residualLine = new Line(
    new BufferGeometry(),
    new LineDashedMaterial({
      color: 0xd97706,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.8,
    }),
  );
  scene.add(residualLine);

  const ring = new Mesh(
    new TorusGeometry(0.12, 0.02, 12, 24),
    new MeshBasicMaterial({ color: 0x2563eb }),
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // 3D Transform Gizmo at vector tip x
  const { gizmo } = createTransformGizmo3D(vector);
  scene.add(gizmo.group);

  function orientTargetPlane(): void {
    const [nx, ny, nz] = PROJECTION3D_TARGETS[currentTarget].normal;
    const [wnx, wny, wnz] = mathToWorld(nx, ny, nz);
    const normal = new Vector3(wnx, wny, wnz).normalize();
    targetPlane.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
  }

  function update(): void {
    const mode = PROJECTION3D_TARGETS[currentTarget].modes[currentMode];
    const { x, y, z } = vector;
    const [px, py, pz] = mode.project(x, y, z);

    const tip = new Vector3(...mathToWorld(x, y, z));
    const ptip = new Vector3(...mathToWorld(px, py, pz));

    applyArrow(xArrow, ORIGIN, tip, 0.22, 0.12);
    applyArrow(pxArrow, ORIGIN, ptip, 0.2, 0.11);

    // Residual (I - P)x in world space = segment from Px to x.
    residualLine.geometry.setFromPoints([ptip, tip]);
    residualLine.computeLineDistances();

    ring.position.copy(ptip);
    gizmo.setPosition(x, y, z);
  }

  function setVector(x: number, y: number, z: number): void {
    vector.x = x;
    vector.y = y;
    vector.z = z;
    update();
  }

  function setMode(mode: ProjectionModeId): void {
    currentMode = mode;
    update();
  }

  function setTarget(target: ProjectionTargetId): void {
    currentTarget = target;
    orientTargetPlane();
    update();
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function dispose(): void {
    disposeObject(scene);
    gizmo.dispose();
  }

  setTarget("xy-plane");
  return {
    scene,
    gizmo,
    setVector,
    setMode,
    setTarget,
    setAxesVisible,
    dispose,
  };
}
