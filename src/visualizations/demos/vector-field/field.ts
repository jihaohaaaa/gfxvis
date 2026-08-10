import type { Bounds2 } from "../../core/plot2d";

export type FieldPresetId = "rotation" | "radial" | "shear";

export interface VectorFieldPreset {
  id: FieldPresetId;
  label: string;
  p: (x: number, y: number) => number;
  q: (x: number, y: number) => number;
  /** Analytic constant divergence div F = dP/dx + dQ/dy. */
  div: number;
  /** Analytic constant scalar curl = dQ/dx - dP/dy. */
  curl: number;
}

export const VECTOR_PRESETS: VectorFieldPreset[] = [
  {
    id: "rotation",
    label: "旋转场 (−y, x)",
    p: (_x, y) => -y,
    q: (x, _y) => x,
    div: 0,
    curl: 2,
  },
  {
    id: "radial",
    label: "径向场 (x, y)",
    p: (x, _y) => x,
    q: (_x, y) => y,
    div: 2,
    curl: 0,
  },
  {
    id: "shear",
    label: "剪切场 (0, x)",
    p: () => 0,
    q: (x) => x,
    div: 0,
    curl: -1,
  },
];

export interface VectorSample {
  x: number;
  y: number;
  px: number;
  py: number;
  mag: number;
}

export function sampleVectorGrid(
  preset: VectorFieldPreset,
  bounds: Bounds2,
  nx: number,
  ny: number,
): VectorSample[] {
  const samples: VectorSample[] = [];
  for (let i = 0; i <= ny; i++) {
    const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;
    for (let j = 0; j <= nx; j++) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
      const px = preset.p(x, y);
      const py = preset.q(x, y);
      samples.push({ x, y, px, py, mag: Math.hypot(px, py) });
    }
  }
  return samples;
}
