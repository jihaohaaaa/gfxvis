import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereGeometry,
} from "three";
import { coolwarm, valueToT } from "./colormap";

/**
 * Recursively dispose geometry / material(s) on an object subtree. Shared by
 * every 3D scene so disposal logic lives in exactly one place.
 */
export function disposeObject(object: Object3D): void {
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

/** Standard demo lighting: soft ambient + key directional from (4, 8, 3). */
export function addStandardLights(scene: Scene): void {
  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 8, 3);
  scene.add(sun);
}

/** Ground grid on the math z = 0 plane (Three XZ plane), shared styling. */
export function addGroundGrid(
  scene: Scene,
  size: number,
  divisions = 16,
): void {
  scene.add(new GridHelper(size, divisions, 0x64748b, 0x475569));
}

export interface SurfaceMaterialOptions {
  /** Transparent-by-default (depthWrite off) so overlays stay visible. */
  transparent?: boolean;
  opacity?: number;
  /** Avoid z-fighting with overlaid lines (parametric grids). */
  polygonOffset?: boolean;
}

/** Vertex-colored surface material with the shared look. */
export function createSurfaceMaterial(
  options: SurfaceMaterialOptions = {},
): MeshStandardMaterial {
  const transparent = options.transparent ?? true;
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0,
    side: DoubleSide,
    transparent,
    opacity: transparent ? (options.opacity ?? 0.55) : 1,
    depthWrite: !transparent,
    ...(options.polygonOffset
      ? { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }
      : {}),
  });
}

/** Toggle a surface material between semi-transparent and opaque. */
export function applySurfaceTransparency(
  material: MeshStandardMaterial,
  transparent: boolean,
  opacity = 0.55,
): void {
  material.transparent = transparent;
  material.opacity = transparent ? opacity : 1;
  material.depthWrite = !transparent;
  material.needsUpdate = true;
}

/** Small draggable marker sphere shared by 3D scenes. */
export function createMarker(color = 0xef4444, radius = 0.09): Mesh {
  return new Mesh(
    new SphereGeometry(radius, 20, 20),
    new MeshStandardMaterial({ color }),
  );
}

/**
 * Build an indexed (rows x cols) vertex-colored grid geometry: positions in
 * world space, colors from `value` via the shared coolwarm colormap against
 * `valueRange`. Used by every colored surface (bivariate, scalar field,
 * parametric).
 */
export function buildColoredGrid(
  rows: number,
  cols: number,
  point: (i: number, j: number) => [number, number, number],
  value: (i: number, j: number) => number,
  valueRange: { min: number; max: number },
): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const index = (i: number, j: number) => i * (cols + 1) + j;
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const [x, y, z] = point(i, j);
      positions.push(x, y, z);
      const [cr, cg, cb] = coolwarm(
        valueToT(value(i, j), valueRange.min, valueRange.max),
      );
      const color = new Color(cr / 255, cg / 255, cb / 255);
      colors.push(color.r, color.g, color.b);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
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
