export interface Gradient2 {
  fx: number;
  fy: number;
}

/** Central-difference gradient of a bivariate function at (x, y). */
export function numericGradient2(
  f: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-4,
): Gradient2 {
  const fx = (f(x + h, y) - f(x - h, y)) / (2 * h);
  const fy = (f(x, y + h) - f(x, y - h)) / (2 * h);
  return { fx, fy };
}

/** Central-difference divergence div F = dP/dx + dQ/dy. */
export function numericDivergence2(
  p: (x: number, y: number) => number,
  q: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-4,
): number {
  const dpdx = (p(x + h, y) - p(x - h, y)) / (2 * h);
  const dqdy = (q(x, y + h) - q(x, y - h)) / (2 * h);
  return dpdx + dqdy;
}

/** Central-difference scalar curl (2D) = dQ/dx - dP/dy. */
export function numericCurl2(
  p: (x: number, y: number) => number,
  q: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-4,
): number {
  const dqdx = (q(x + h, y) - q(x - h, y)) / (2 * h);
  const dpdy = (p(x, y + h) - p(x, y - h)) / (2 * h);
  return dqdx - dpdy;
}

export interface Bounds2Like {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GridSample {
  values: Float32Array;
  min: number;
  max: number;
  nx: number;
  ny: number;
}

/** Sample a bivariate function on an (nx+1)x(ny+1) grid over `bounds`. */
export function sampleGrid(
  bounds: Bounds2Like,
  nx: number,
  ny: number,
  fn: (x: number, y: number) => number,
): GridSample {
  const values = new Float32Array((nx + 1) * (ny + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= ny; i++) {
    const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;
    for (let j = 0; j <= nx; j++) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
      const v = fn(x, y);
      values[i * (nx + 1) + j] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { values, min, max, nx, ny };
}

/**
 * Iterate an n^3 lattice spanning [-half, half]^3 in math coordinates,
 * passing both the coordinates and the (i, j, k) indices.
 */
export function forEachCube(
  n: number,
  half: number,
  fn: (
    x: number,
    y: number,
    z: number,
    i: number,
    j: number,
    k: number,
  ) => void,
): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const x = -half + (2 * half * i) / (n - 1);
        const y = -half + (2 * half * j) / (n - 1);
        const z = -half + (2 * half * k) / (n - 1);
        fn(x, y, z, i, j, k);
      }
    }
  }
}
