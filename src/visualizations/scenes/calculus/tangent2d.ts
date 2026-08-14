export function f(x: number): number {
  return Math.sin(x);
}

export function fprime(x: number): number {
  return Math.cos(x);
}

export interface CurvePoint {
  x: number;
  y: number;
}

export function sampleCurve(
  xMin: number,
  xMax: number,
  steps: number,
): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    points.push({ x, y: f(x) });
  }
  return points;
}

/** Value of the tangent line y = f(a) + f'(a)(x - a) at x. */
export function tangentLineAt(a: number, x: number): number {
  return f(a) + fprime(a) * (x - a);
}

/** Slope of the secant through (a, f(a)) and (b, f(b)); equals f'(a) when a === b. */
export function secantSlope(a: number, b: number): number {
  return a === b ? fprime(a) : (f(b) - f(a)) / (b - a);
}
