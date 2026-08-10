export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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
