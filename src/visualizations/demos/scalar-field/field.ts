import { lerp } from "../../core/math";
import { coolwarm, valueToT } from "../../core/colormap";
import type { Bounds2 } from "../../core/plot2d";

export type Field2DId = "sincos" | "circle" | "parabola";

export interface Field2D {
  id: Field2DId;
  label: string;
  /** Original KaTeX formula of F(x, y), e.g. `\sin x \cos y`. */
  tex: string;
  bounds: Bounds2;
  ticksX: number[];
  ticksY: number[];
  /** 3D surface height scale so every field fits the default camera. */
  zScale: number;
  /** F(x, y) - c (c is the adjustable level constant). */
  phi(x: number, y: number, c: number): number;
  gradX(x: number, y: number): number;
  gradY(x: number, y: number): number;
  hasC: boolean;
  cMin: number;
  cMax: number;
  defaultC: number;
  /** KaTeX formula of phi = F - c with c substituted. */
  texAt(c: number): string;
  /** Level equation F(x, y) = c, e.g. `x^2+y^2 = 1.50`. */
  levelTex(c: number): string;
}

const fmt = (n: number): string => n.toFixed(2);

export const FIELDS2D: Record<Field2DId, Field2D> = {
  sincos: {
    id: "sincos",
    label: "sin x cos y",
    tex: "\\sin x \\cos y",
    bounds: { xMin: -Math.PI, xMax: Math.PI, yMin: -Math.PI, yMax: Math.PI },
    ticksX: [-3, -2, -1, 1, 2, 3],
    ticksY: [-3, -2, -1, 1, 2, 3],
    zScale: 1,
    phi: (x, y, c) => Math.sin(x) * Math.cos(y) - c,
    gradX: (x, y) => Math.cos(x) * Math.cos(y),
    gradY: (x, y) => -Math.sin(x) * Math.sin(y),
    hasC: true,
    cMin: -1,
    cMax: 1,
    defaultC: 0,
    texAt: (c) =>
      Math.abs(c) < 0.005 ? "\\sin x \\cos y" : `\\sin x \\cos y-${fmt(c)}`,
    levelTex: (c) => `\\sin x \\cos y = ${fmt(c)}`,
  },
  circle: {
    id: "circle",
    label: "圆族",
    tex: "x^2+y^2",
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -2.2, yMax: 2.2 },
    ticksX: [-2, -1, 1, 2],
    ticksY: [-2, -1, 1, 2],
    zScale: 0.3,
    phi: (x, y, c) => x * x + y * y - c,
    gradX: (x, _y) => 2 * x,
    gradY: (_x, y) => 2 * y,
    hasC: true,
    cMin: 0.5,
    cMax: 6,
    defaultC: 1.5,
    texAt: (c) => (Math.abs(c) < 0.005 ? "x^2+y^2" : `x^2+y^2-${fmt(c)}`),
    levelTex: (c) => `x^2+y^2 = ${fmt(c)}`,
  },
  parabola: {
    id: "parabola",
    label: "抛物线族",
    tex: "y-x^2",
    bounds: { xMin: -2.2, xMax: 2.2, yMin: -1.4, yMax: 4.8 },
    ticksX: [-2, -1, 1, 2],
    ticksY: [1, 2, 3, 4],
    zScale: 0.32,
    phi: (x, y, c) => y - x * x - c,
    gradX: (x, _y) => -2 * x,
    gradY: (_x, _y) => 1,
    hasC: true,
    cMin: -2,
    cMax: 2,
    defaultC: 0.5,
    texAt: (c) => (Math.abs(c) < 0.005 ? "y-x^2" : `y-x^2-${fmt(c)}`),
    levelTex: (c) => `y = x^2+${fmt(c)}`,
  },
};

export interface FieldSample {
  values: Float32Array;
  min: number;
  max: number;
  nx: number;
  ny: number;
}

export function sampleField(
  field: Field2D,
  bounds: Bounds2,
  nx: number,
  ny: number,
  c = 0,
): FieldSample {
  const values = new Float32Array((nx + 1) * (ny + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= ny; i++) {
    const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;
    for (let j = 0; j <= nx; j++) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
      const v = field.phi(x, y, c);
      values[i * (nx + 1) + j] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { values, min, max, nx, ny };
}

export type Segment = [[number, number], [number, number]];

// Marching-squares segment table: case -> pairs of edges.
// Edges: 0 = bottom (a-b), 1 = right (b-c), 2 = top (d-c), 3 = left (a-d).
// Corners: a = bottom-left, b = bottom-right, c = top-right, d = top-left.
const SEGMENT_TABLE: number[][][] = [
  [], // 0
  [[3, 0]], // 1
  [[0, 1]], // 2
  [[3, 1]], // 3
  [[1, 2]], // 4
  [
    [3, 0],
    [1, 2],
  ], // 5 (saddle)
  [[0, 2]], // 6
  [[3, 2]], // 7
  [[2, 3]], // 8
  [[0, 1]], // 9
  [
    [0, 1],
    [2, 3],
  ], // 10 (saddle)
  [[1, 2]], // 11
  [[0, 3]], // 12
  [[0, 1]], // 13
  [[0, 3]], // 14
  [], // 15
];

function cellValue(
  values: Float32Array,
  nx: number,
  i: number,
  j: number,
): number {
  return values[i * (nx + 1) + j];
}

/** Extract iso-line segments at a given level via marching squares. */
export function marchingSquares(
  values: Float32Array,
  nx: number,
  ny: number,
  bounds: Bounds2,
  level: number,
): Segment[] {
  const segments: Segment[] = [];
  const xAt = (j: number) =>
    bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
  const yAt = (i: number) =>
    bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;

  const lerpX = (j0: number, j1: number, v0: number, v1: number) => {
    const t = v1 === v0 ? 0.5 : (level - v0) / (v1 - v0);
    return lerp(xAt(j0), xAt(j1), t);
  };
  const lerpY = (i0: number, i1: number, v0: number, v1: number) => {
    const t = v1 === v0 ? 0.5 : (level - v0) / (v1 - v0);
    return lerp(yAt(i0), yAt(i1), t);
  };

  const edgePoint = (i: number, j: number, edge: number): [number, number] => {
    const v00 = cellValue(values, nx, i, j);
    const v10 = cellValue(values, nx, i, j + 1);
    const v11 = cellValue(values, nx, i + 1, j + 1);
    const v01 = cellValue(values, nx, i + 1, j);
    switch (edge) {
      case 0:
        return [lerpX(j, j + 1, v00, v10), yAt(i)]; // bottom
      case 1:
        return [xAt(j + 1), lerpY(i, i + 1, v10, v11)]; // right
      case 2:
        return [lerpX(j, j + 1, v01, v11), yAt(i + 1)]; // top
      default:
        return [xAt(j), lerpY(i, i + 1, v00, v01)]; // left
    }
  };

  for (let i = 0; i < ny; i++) {
    for (let j = 0; j < nx; j++) {
      const v00 = cellValue(values, nx, i, j);
      const v10 = cellValue(values, nx, i, j + 1);
      const v11 = cellValue(values, nx, i + 1, j + 1);
      const v01 = cellValue(values, nx, i + 1, j);
      const idx =
        (v00 >= level ? 1 : 0) |
        ((v10 >= level ? 1 : 0) << 1) |
        ((v11 >= level ? 1 : 0) << 2) |
        ((v01 >= level ? 1 : 0) << 3);
      for (const [e0, e1] of SEGMENT_TABLE[idx]) {
        segments.push([edgePoint(i, j, e0), edgePoint(i, j, e1)]);
      }
    }
  }
  return segments;
}

/** A spread of level values across [min, max]. */
export function contourLevels(min: number, max: number, count = 9): number[] {
  const levels: number[] = [];
  for (let k = 1; k <= count; k++) {
    levels.push(min + ((max - min) * k) / (count + 1));
  }
  return levels;
}

/** Render the sampled field as an offscreen canvas (row 0 = yMin). */
export function buildFieldImage(field: FieldSample): HTMLCanvasElement {
  const { nx, ny, values, min, max } = field;
  const canvas = document.createElement("canvas");
  canvas.width = nx + 1;
  canvas.height = ny + 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const image = ctx.createImageData(nx + 1, ny + 1);
  for (let i = 0; i <= ny; i++) {
    for (let j = 0; j <= nx; j++) {
      const v = values[i * (nx + 1) + j];
      const [r, g, b] = coolwarm(valueToT(v, min, max));
      const idx = (i * (nx + 1) + j) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
