import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
} from "three";
import { coolwarm, valueToT } from "../../core/colormap";
import { mathToWorld } from "../../core/coords";
import { createAxesGroup } from "../../core/axes3d";

export const FIELD3D = {
  f: (x: number, y: number, z: number) => x * x + y * y - z * z,
};

export const CUBE_HALF = 2;
export const TEXTURE_RES = 128;

export type SliceAxis = "x" | "y" | "z";

export interface SliceScene {
  scene: Scene;
  setSlice(axis: SliceAxis, position: number): void;
  getStats(): { min: number; max: number };
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

function sampleOnSlice(
  axis: SliceAxis,
  pos: number,
  a: number,
  b: number,
): number {
  // a/b are the two in-plane coordinates in [-CUBE_HALF, CUBE_HALF].
  switch (axis) {
    case "z":
      return FIELD3D.f(a, b, pos);
    case "y":
      return FIELD3D.f(a, pos, b);
    case "x":
      return FIELD3D.f(pos, a, b);
  }
}

function makeSliceTexture(
  axis: SliceAxis,
  pos: number,
  res: number,
  stats: { min: number; max: number },
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const image = ctx.createImageData(res, res);
  for (let i = 0; i < res; i++) {
    const t = 1 - i / (res - 1); // row 0 -> positive second coordinate (top)
    const b = -CUBE_HALF + t * 2 * CUBE_HALF;
    for (let j = 0; j < res; j++) {
      const s = j / (res - 1);
      const a = -CUBE_HALF + s * 2 * CUBE_HALF;
      const value = sampleOnSlice(axis, pos, a, b);
      const [r, g, blue] = coolwarm(valueToT(value, stats.min, stats.max));
      const idx = (i * res + j) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = blue;
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeSliceMesh(
  axis: SliceAxis,
  pos: number,
  res: number,
  stats: { min: number; max: number },
  opacity: number,
): { mesh: Mesh; texture: CanvasTexture } {
  const texture = makeSliceTexture(axis, pos, res, stats);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    side: DoubleSide,
    depthWrite: false,
  });
  const mesh = new Mesh(
    new PlaneGeometry(2 * CUBE_HALF, 2 * CUBE_HALF),
    material,
  );
  // Place the plane via mathToWorld: math (x,y,z) -> world (x, z, -y).
  const [ox, oy, oz] = mathToWorld(
    axis === "x" ? pos : 0,
    axis === "y" ? pos : 0,
    axis === "z" ? pos : 0,
  );
  mesh.position.set(ox, oy, oz);
  if (axis === "x") {
    mesh.rotation.y = Math.PI / 2; // face world +X
  } else if (axis === "z") {
    mesh.rotation.x = -Math.PI / 2; // face world +Y (horizontal z-slice)
  }
  // y-slice keeps the default PlaneGeometry orientation (XY plane facing +Z).
  return { mesh, texture };
}

function computeStats(): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  const n = 40;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      for (let k = 0; k <= n; k++) {
        const x = -CUBE_HALF + (2 * CUBE_HALF * i) / n;
        const y = -CUBE_HALF + (2 * CUBE_HALF * j) / n;
        const z = -CUBE_HALF + (2 * CUBE_HALF * k) / n;
        const v = FIELD3D.f(x, y, z);
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  return { min, max };
}

export function createSliceScene(): SliceScene {
  const scene = new Scene();
  const stats = computeStats();
  const textures: CanvasTexture[] = [];

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

  // Three faint reference slices at the origin (one per axis).
  const axes: SliceAxis[] = ["x", "y", "z"];
  for (const axis of axes) {
    const { mesh, texture } = makeSliceMesh(axis, 0, TEXTURE_RES, stats, 0.35);
    textures.push(texture);
    scene.add(mesh);
  }

  // Movable slice, default z = 0.5.
  let movable: { mesh: Mesh; texture: CanvasTexture } | null = null;

  function setSlice(axis: SliceAxis, position: number): void {
    if (movable) {
      scene.remove(movable.mesh);
      disposeObject(movable.mesh);
      textures.splice(textures.indexOf(movable.texture), 1);
      movable.texture.dispose();
    }
    movable = makeSliceMesh(axis, position, TEXTURE_RES, stats, 0.95);
    textures.push(movable.texture);
    scene.add(movable.mesh);
  }

  function dispose(): void {
    disposeObject(scene);
    textures.forEach((texture) => texture.dispose());
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  setSlice("z", 0.5);
  return { scene, setSlice, getStats: () => stats, setAxesVisible, dispose };
}
