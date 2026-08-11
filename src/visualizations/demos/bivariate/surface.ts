import {
  AmbientLight,
  ArrowHelper,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { coolwarm, valueToT } from "../../core/colormap";
import { mathToWorld } from "../../core/coords";
import { createAxesGroup } from "../../core/axes3d";

export const SURFACE_FN = {
  f: (x: number, y: number) => (x * x - y * y) / 2,
  fx: (x: number, _y: number) => x,
  fy: (_x: number, y: number) => -y,
};

export const DOMAIN = 2.4;

export interface SurfaceScene {
  scene: Scene;
  surface: Mesh;
  setPoint(x: number, y: number): void;
  getPoint(): { x: number; y: number };
  setAxesVisible(visible: boolean): void;
  setSurfaceTransparent(transparent: boolean): void;
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

export function createSurfaceScene(): SurfaceScene {
  const scene = new Scene();

  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 8, 3);
  scene.add(sun);

  // Ground grid on the math z = 0 plane (Three XZ plane).
  scene.add(new GridHelper(2 * DOMAIN, 16, 0x64748b, 0x475569));

  // Math axes (x red, y green, z blue) via mathToWorld; toggleable.
  const axesGroup = createAxesGroup(3);
  scene.add(axesGroup);

  const geometry = buildSurfaceGeometry(96);
  const surfaceMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0,
    side: DoubleSide,
    // Semi-transparent by default (depthWrite off) so the normal arrow,
    // tangent plane and direction lines stay visible; toggleable.
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const surface = new Mesh(geometry, surfaceMaterial);
  scene.add(surface);

  const marker = new Mesh(
    new SphereGeometry(0.08, 20, 20),
    new MeshStandardMaterial({ color: 0xef4444 }),
  );
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
    surfaceMaterial.transparent = transparent;
    surfaceMaterial.opacity = transparent ? 0.55 : 1;
    surfaceMaterial.depthWrite = !transparent;
    surfaceMaterial.needsUpdate = true;
  }

  function dispose(): void {
    disposeObject(scene);
  }

  update();
  return {
    scene,
    surface,
    setPoint,
    getPoint,
    setAxesVisible,
    setSurfaceTransparent,
    dispose,
  };
}

export function buildSurfaceGeometry(res: number): BufferGeometry {
  const step = (2 * DOMAIN) / res;
  const values: number[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= res; i++) {
    for (let j = 0; j <= res; j++) {
      const x = -DOMAIN + j * step;
      const y = -DOMAIN + i * step;
      const v = SURFACE_FN.f(x, y);
      values.push(v);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const index = (i: number, j: number) => i * (res + 1) + j;
  for (let i = 0; i <= res; i++) {
    for (let j = 0; j <= res; j++) {
      const x = -DOMAIN + j * step;
      const y = -DOMAIN + i * step;
      const z = values[index(i, j)];
      const [wx, wy, wz] = mathToWorld(x, y, z);
      positions.push(wx, wy, wz);
      const [cr, cg, cb] = coolwarm(valueToT(z, min, max));
      const color = new Color(cr / 255, cg / 255, cb / 255);
      colors.push(color.r, color.g, color.b);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const a = index(i, j);
      const b = index(i, j + 1);
      const c = index(i + 1, j);
      const d = index(i + 1, j + 1);
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
