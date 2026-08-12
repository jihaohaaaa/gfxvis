import {
  ArrowHelper,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/axes3d";
import { coolwarm, valueToT } from "../../core/colormap";
import { mathToWorld } from "../../core/coords";
import { clamp, forEachCube } from "../../core/math";
import { disposeObject } from "../../core/three-utils";

export const FIELD3D = {
  f: (x: number, y: number, z: number) => x * x + y * y - z * z,
  gradX: (x: number) => 2 * x,
  gradY: (y: number) => 2 * y,
  gradZ: (z: number) => -2 * z,
};

export const CUBE_HALF = 2;
/** Density range: points per axis (n^3 points fill the box). */
export const GRID_MIN = 4;
export const GRID_MAX = 14;
export const GRID_DEFAULT = 8;

export interface CloudScene {
  scene: Scene;
  getStats(): { min: number; max: number };
  setDensity(n: number): void;
  setAxesVisible(visible: boolean): void;
  setArrowsVisible(visible: boolean): void;
  dispose(): void;
}

/** Radial-gradient sprite so Points render as round dots instead of squares. */
function makePointSprite(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.65, "rgba(255,255,255,0.95)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** n^3 lattice of color-by-value points, colored with the shared [min, max]. */
function buildCloud(
  stats: { min: number; max: number },
  n: number,
  sprite: CanvasTexture,
): Points {
  const positions: number[] = [];
  const colors: number[] = [];
  forEachCube(n, CUBE_HALF, (x, y, z) => {
    const value = FIELD3D.f(x, y, z);
    positions.push(...mathToWorld(x, y, z));
    const [r, g, b] = coolwarm(valueToT(value, stats.min, stats.max));
    const color = new Color(r / 255, g / 255, b / 255);
    colors.push(color.r, color.g, color.b);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  // Dot size follows the lattice spacing so the cloud looks consistent at any
  // density (capped so sparse clouds do not get huge dots).
  const spacing = (2 * CUBE_HALF) / (n - 1);
  const material = new PointsMaterial({
    size: clamp(0.4 * spacing, 0.08, 0.22),
    map: sprite,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.05,
    sizeAttenuation: true,
    depthWrite: true,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/** Gradient arrows at every `stride`-th lattice point (direction = nabla phi). */
function buildArrows(n: number, stride: number): Group {
  const group = new Group();
  forEachCube(n, CUBE_HALF, (x, y, z, i, j, k) => {
    if (i % stride !== 0 || j % stride !== 0 || k % stride !== 0) return;
    const gx = FIELD3D.gradX(x);
    const gy = FIELD3D.gradY(y);
    const gz = FIELD3D.gradZ(z);
    const mag = Math.hypot(gx, gy, gz);
    if (mag < 1e-4) return; // zero gradient at the origin
    const [ox, oy, oz] = mathToWorld(x, y, z);
    const [dx, dy, dz] = mathToWorld(gx, gy, gz);
    const direction = new Vector3(dx, dy, dz).normalize();
    const length = clamp(0.15 * mag, 0.25, 0.9);
    group.add(
      new ArrowHelper(
        direction,
        new Vector3(ox, oy, oz),
        length,
        0x3b82f6,
        length * 0.22,
        length * 0.14,
      ),
    );
  });
  return group;
}

function computeStats(): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  forEachCube(40, CUBE_HALF, (x, y, z) => {
    const v = FIELD3D.f(x, y, z);
    if (v < min) min = v;
    if (v > max) max = v;
  });
  return { min, max };
}

/**
 * 3D scalar field as a discrete point cloud (color = value) plus gradient
 * arrows (direction = nabla phi). Density (points per axis) is adjustable and
 * rebuilds the cloud and arrows on demand.
 */
export function createCloudScene(): CloudScene {
  const scene = new Scene();
  const stats = computeStats();
  const sprite = makePointSprite();

  // Bounding box edges.
  const box = new LineSegments(
    new EdgesGeometry(
      new BoxGeometry(2 * CUBE_HALF, 2 * CUBE_HALF, 2 * CUBE_HALF),
    ),
    new LineBasicMaterial({ color: 0x94a3b8 }),
  );
  scene.add(box);

  // Math axes (x red, y green, z blue), toggleable.
  const axesGroup = createAxesGroup(2.6);
  scene.add(axesGroup);

  let currentN = GRID_DEFAULT;
  let arrowsVisible = true;
  let points: Points | null = null;
  let arrowGroup: Group | null = null;

  function rebuild(n: number): void {
    if (points) {
      scene.remove(points);
      disposeObject(points);
      points = null;
    }
    if (arrowGroup) {
      scene.remove(arrowGroup);
      disposeObject(arrowGroup);
      arrowGroup = null;
    }
    points = buildCloud(stats, n, sprite);
    scene.add(points);
    // Keep the arrow grid at roughly 3-4 per axis regardless of density.
    const stride = Math.max(1, Math.round(n / 4));
    arrowGroup = buildArrows(n, stride);
    arrowGroup.visible = arrowsVisible;
    scene.add(arrowGroup);
  }

  function setDensity(n: number): void {
    const clamped = clamp(Math.round(n), GRID_MIN, GRID_MAX);
    if (clamped !== currentN) {
      currentN = clamped;
      rebuild(currentN);
    }
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function setArrowsVisible(visible: boolean): void {
    arrowsVisible = visible;
    if (arrowGroup) arrowGroup.visible = visible;
  }

  function dispose(): void {
    disposeObject(scene);
    sprite.dispose();
  }

  rebuild(currentN);
  return {
    scene,
    getStats: () => stats,
    setDensity,
    setAxesVisible,
    setArrowsVisible,
    dispose,
  };
}
