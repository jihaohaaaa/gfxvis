import {
  ArrowHelper,
  BufferGeometry,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/3d/axes3d";
import { mathToWorld } from "../../core/3d/coords";
import {
  addGroundGrid,
  addStandardLights,
  applySurfaceTransparency,
  buildColoredGrid,
  createMarker,
  createSurfaceMaterial,
  disposeObject,
} from "../../core/3d/three-utils";
import {
  createTransformGizmo3D,
  type TransformGizmo3D,
} from "../../core/3d/gizmo3d";

export const SURFACE_FN = {
  f: (x: number, y: number) => (x * x - y * y) / 2,
  fx: (x: number, _y: number) => x,
  fy: (_x: number, y: number) => -y,
};

export const DOMAIN = 2.4;

export interface SurfaceScene {
  scene: Scene;
  surface: Mesh;
  gizmo: TransformGizmo3D;
  setPoint(x: number, y: number): void;
  getPoint(): { x: number; y: number };
  setAxesVisible(visible: boolean): void;
  setSurfaceTransparent(transparent: boolean): void;
  dispose(): void;
}

export function createSurfaceScene(): SurfaceScene {
  const scene = new Scene();

  addStandardLights(scene);

  // Ground grid on the math z = 0 plane (Three XZ plane).
  addGroundGrid(scene, 30, 30);

  // Math axes (x red, y green, z blue) via mathToWorld; toggleable.
  const axesGroup = createAxesGroup(3);
  scene.add(axesGroup);

  const surfaceMaterial = createSurfaceMaterial();
  const surface = new Mesh(buildSurfaceGeometry(96), surfaceMaterial);
  scene.add(surface);

  const marker = createMarker();
  scene.add(marker);

  const tangentPlane = new Mesh(
    new PlaneGeometry(2.1, 2.1),
    new MeshStandardMaterial({
      color: 0x4cc2ff,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  scene.add(tangentPlane);

  const dirMatX = new LineBasicMaterial({ color: 0xef4444 });
  const dirMatY = new LineBasicMaterial({ color: 0x22c55e });
  const dirLineX = new LineSegments(new BufferGeometry(), dirMatX);
  const dirLineY = new LineSegments(new BufferGeometry(), dirMatY);
  scene.add(dirLineX, dirLineY);

  const normalArrow = new ArrowHelper(
    new Vector3(0, 1, 0),
    new Vector3(),
    1.15,
    0x3b82f6,
    0.22,
    0.14,
  );
  scene.add(normalArrow);

  const point = { x: 0.8, y: 0.6 };

  // Surface mode 3D Transform Gizmo
  const { gizmo } = createTransformGizmo3D({
    initialPos: { x: point.x, y: point.y, z: SURFACE_FN.f(point.x, point.y) },
    mode: "surface",
  });
  scene.add(gizmo.group);

  function update(): void {
    const x = point.x;
    const y = point.y;
    const z = SURFACE_FN.f(x, y);
    const dzdx = SURFACE_FN.fx(x, y);
    const dzdy = SURFACE_FN.fy(x, y);

    const [wx, wy, wz] = mathToWorld(x, y, z);
    marker.position.set(wx, wy, wz);

    const [nx, ny, nz] = mathToWorld(-dzdx, -dzdy, 1);
    const normal = new Vector3(nx, ny, nz).normalize();

    tangentPlane.position.set(wx, wy, wz);
    tangentPlane.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);

    const base = new Vector3(wx, wy, wz);
    const len = 0.9;
    const [ux, uy, uz] = mathToWorld(1, 0, dzdx);
    const [vx, vy, vz] = mathToWorld(0, 1, dzdy);
    dirLineX.geometry.setFromPoints([
      base,
      new Vector3(wx + len * ux, wy + len * uy, wz + len * uz),
    ]);
    dirLineY.geometry.setFromPoints([
      base,
      new Vector3(wx + len * vx, wy + len * vy, wz + len * vz),
    ]);

    normalArrow.position.copy(base);
    normalArrow.setDirection(normal);
    gizmo.setPosition(x, y, z);
  }

  function setPoint(x: number, y: number): void {
    point.x = x;
    point.y = y;
    update();
  }

  function getPoint(): { x: number; y: number } {
    return { ...point };
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function setSurfaceTransparent(transparent: boolean): void {
    applySurfaceTransparency(surfaceMaterial, transparent);
  }

  function dispose(): void {
    disposeObject(scene);
    gizmo.dispose();
  }

  update();
  return {
    scene,
    surface,
    gizmo,
    setPoint,
    getPoint,
    setAxesVisible,
    setSurfaceTransparent,
    dispose,
  };
}

/** Vertex-colored grid for z = f(x, y) over [-DOMAIN, DOMAIN]^2. */
export function buildSurfaceGeometry(res: number): BufferGeometry {
  const step = (2 * DOMAIN) / res;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= res; i++) {
    for (let j = 0; j <= res; j++) {
      const v = SURFACE_FN.f(-DOMAIN + j * step, -DOMAIN + i * step);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return buildColoredGrid(
    res,
    res,
    (i, j) => {
      const x = -DOMAIN + j * step;
      const y = -DOMAIN + i * step;
      return mathToWorld(x, y, SURFACE_FN.f(x, y));
    },
    (i, j) => {
      const x = -DOMAIN + j * step;
      const y = -DOMAIN + i * step;
      return SURFACE_FN.f(x, y);
    },
    { min, max },
  );
}
