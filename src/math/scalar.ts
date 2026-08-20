/**
 * GLSL / GLM style scalar mathematics utilities.
 */

export function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.min(maxVal, Math.max(minVal, value));
}

/** Linear interpolation: x * (1 - a) + y * a */
export function mix(x: number, y: number, a: number): number {
  return x + (y - x) * a;
}

/** Inverse linear interpolation: returns t in [0, 1] */
export function inverseLerp(edge0: number, edge1: number, x: number): number {
  if (Math.abs(edge1 - edge0) < 1e-12) return 0;
  return (x - edge0) / (edge1 - edge0);
}

/** Step function: 0.0 if x < edge, else 1.0 */
export function step(edge: number, x: number): number {
  return x < edge ? 0.0 : 1.0;
}

/** Smoothstep function: Hermite interpolation between edge0 and edge1 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/** Convert degrees to radians (GLM radians) */
export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/** Convert radians to degrees (GLM degrees) */
export function degrees(radians: number): number {
  return (radians * 180.0) / Math.PI;
}

/** Approximate equality check */
export function approxEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

/** Check if scalar is near zero */
export function isZero(val: number, eps = 1e-6): boolean {
  return Math.abs(val) <= eps;
}

/** Format number cleanly for UI display */
export function formatNumber(n: number, digits = 2): string {
  const v = Math.abs(n) < 1e-7 ? 0 : n;
  return v.toFixed(digits);
}
