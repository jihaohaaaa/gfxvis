import type { Bounds2 } from "../../core/2d/plot2d";

export type Point2 = [number, number];
export type BezierDegree = number;
export type SplineDegree = 1 | 2 | 3;
export type KnotVector = readonly number[];

export const MIN_BEZIER_DEGREE = 1;
export const MAX_BEZIER_DEGREE = 8;

export interface BezierPreset {
  id: string;
  label: string;
  points: Point2[];
  bounds: Bounds2;
}

export interface KnotSpanInfo {
  index: number;
  start: number;
  end: number;
  basisIndices: number[];
}

export interface BasisSupportInfo {
  index: number;
  start: number;
  end: number;
  spanIndices: number[];
}

const EPSILON = 1e-9;

export const BEZIER_PRESETS: Record<number, BezierPreset> = {
  1: {
    id: "linear",
    label: "一次 Bézier",
    points: [
      [-3, -1.4],
      [3, 1.8],
    ],
    bounds: { xMin: -4, xMax: 4, yMin: -3, yMax: 3 },
  },
  2: {
    id: "quadratic",
    label: "二次 Bézier",
    points: [
      [-3, -1.4],
      [0, 3],
      [3, -0.9],
    ],
    bounds: { xMin: -4, xMax: 4, yMin: -3, yMax: 4 },
  },
  3: {
    id: "cubic",
    label: "三次 Bézier",
    points: [
      [-3.2, -1.4],
      [-2.2, 3],
      [2.1, 3.2],
      [3.2, -1],
    ],
    bounds: { xMin: -4, xMax: 4, yMin: -3, yMax: 4 },
  },
  4: {
    id: "quartic",
    label: "四次 Bézier",
    points: [
      [-3.4, -1.4],
      [-2.4, 2.6],
      [0, 3.6],
      [2.4, 2.6],
      [3.4, -1.4],
    ],
    bounds: { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 4.5 },
  },
  5: {
    id: "quintic",
    label: "五次 Bézier",
    points: [
      [-3.5, -1.4],
      [-2.6, 2.4],
      [-1.0, 3.8],
      [1.0, 3.8],
      [2.6, 2.4],
      [3.5, -1.4],
    ],
    bounds: { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 4.8 },
  },
  6: {
    id: "sextic",
    label: "六次 Bézier",
    points: [
      [-3.6, -1.4],
      [-2.8, 2.2],
      [-1.5, 3.8],
      [0, 3.2],
      [1.5, 3.8],
      [2.8, 2.2],
      [3.6, -1.4],
    ],
    bounds: { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 4.8 },
  },
};

export const BSPLINE_POINTS: Point2[] = [
  [-5, -1.2],
  [-3.8, 2.3],
  [-2.1, 3.3],
  [-0.3, -0.6],
  [1.7, -2.1],
  [3.5, 2.2],
  [5, 0.3],
  [6.2, -1.1],
];

export const BSPLINE_BOUNDS: Bounds2 = {
  xMin: -6,
  xMax: 7,
  yMin: -4,
  yMax: 4.5,
};

export function clonePoints(points: readonly Point2[]): Point2[] {
  return points.map(([x, y]) => [x, y]);
}

const BEZIER_LEVEL_PREFIXES = [
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
] as const;

export function getDeCasteljauLevelLabelPrefix(levelIndex: number): string {
  return BEZIER_LEVEL_PREFIXES[levelIndex] ?? `L${levelIndex}`;
}

export function getBezierLevelLabel(
  levelIndex: number,
  pointIndex: number,
  levelLength: number,
): string {
  if (levelLength === 1) return `L${levelIndex}·C(t)`;
  return `L${levelIndex}·${getDeCasteljauLevelLabelPrefix(levelIndex)}${pointIndex}`;
}

export function appendExtrapolatedControlPoint(
  points: readonly Point2[],
): Point2[] {
  const next = clonePoints(points);
  if (next.length === 0) return [[0, 0]];
  if (next.length === 1) {
    next.push([next[0][0] + 1, next[0][1]]);
    return next;
  }
  const [previousX, previousY] = next[next.length - 2];
  const [lastX, lastY] = next[next.length - 1];
  next.push([lastX + (lastX - previousX), lastY + (lastY - previousY)]);
  return next;
}

export function removeLastControlPoint(points: readonly Point2[]): Point2[] {
  if (points.length <= 2) return clonePoints(points);
  return clonePoints(points.slice(0, -1));
}

export function createBezierPointsForDegree(degree: number): Point2[] {
  const clampedDegree = Math.max(
    MIN_BEZIER_DEGREE,
    Math.min(MAX_BEZIER_DEGREE, Math.round(degree)),
  );
  if (BEZIER_PRESETS[clampedDegree]) {
    return clonePoints(BEZIER_PRESETS[clampedDegree].points);
  }
  let points = clonePoints(BEZIER_PRESETS[6].points);
  while (points.length < clampedDegree + 1) {
    points = appendExtrapolatedControlPoint(points);
  }
  return points;
}

export function getPointsBounds(
  points: readonly Point2[],
  padding = 1,
): Bounds2 {
  if (points.length === 0) {
    return { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const rawXMin = Math.min(...xs);
  const rawXMax = Math.max(...xs);
  const rawYMin = Math.min(...ys);
  const rawYMax = Math.max(...ys);
  const xCenter = (rawXMin + rawXMax) / 2;
  const yCenter = (rawYMin + rawYMax) / 2;
  const xRadius = Math.max(2, (rawXMax - rawXMin) / 2 + padding);
  const yRadius = Math.max(2, (rawYMax - rawYMin) / 2 + padding);
  return {
    xMin: xCenter - xRadius,
    xMax: xCenter + xRadius,
    yMin: yCenter - yRadius,
    yMax: yCenter + yRadius,
  };
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= r; i += 1) {
    result = (result * (n - r + i)) / i;
  }
  return result;
}

export function bernsteinWeights(degree: number, t: number): number[] {
  const clampedT = Math.max(0, Math.min(1, t));
  return Array.from(
    { length: degree + 1 },
    (_, i) =>
      binomial(degree, i) * clampedT ** i * (1 - clampedT) ** (degree - i),
  );
}

export function deCasteljauLevels(
  points: readonly Point2[],
  t: number,
): Point2[][] {
  const levels: Point2[][] = [clonePoints(points)];
  const clampedT = Math.max(0, Math.min(1, t));
  let current = levels[0];

  while (current.length > 1) {
    const next: Point2[] = [];
    for (let i = 0; i < current.length - 1; i += 1) {
      const [x0, y0] = current[i];
      const [x1, y1] = current[i + 1];
      next.push([
        (1 - clampedT) * x0 + clampedT * x1,
        (1 - clampedT) * y0 + clampedT * y1,
      ]);
    }
    levels.push(next);
    current = next;
  }

  return levels;
}

export function evaluateBezier(points: readonly Point2[], t: number): Point2 {
  const finalLevel = deCasteljauLevels(points, t).at(-1);
  return finalLevel?.[0] ?? [0, 0];
}

export function sampleBezier(points: readonly Point2[], steps = 160): Point2[] {
  return Array.from({ length: steps + 1 }, (_, i) =>
    evaluateBezier(points, i / steps),
  );
}

/**
 * Create a standard, un-clamped uniform knot vector: u_i = i (e.g. [0, 1, 2, 3, 4, ...]).
 * Total knot count = controlPointCount + degree + 1 (m = n + p + 1).
 *
 * Characteristics:
 * - No repeated endpoints (no boundary clamping).
 * - Every basis function N_{i,p}(u) has identical shape, shifted along the u-axis by 1 unit.
 * - Valid evaluation domain where partition of unity sum N_i(u) = 1.0 holds: u in [degree, controlPointCount].
 * - Ideal for pure mathematical Cox-de Boor recursion and basis step evolution demonstrations.
 */
export function createStandardUniformKnotVector(
  controlPointCount: number,
  degree: number,
): number[] {
  return Array.from({ length: controlPointCount + degree + 1 }, (_, i) => i);
}

/**
 * Create an open / clamped uniform knot vector with endpoints repeated (degree + 1) times.
 * Form: [0, ..., 0 (p+1 times), 1, 2, ..., spanCount-1, spanCount, ..., spanCount (p+1 times)]
 *
 * Characteristics:
 * - Endpoints have multiplicity p + 1, forcing N_{0,p}(0) = 1 and N_{n,p}(spanCount) = 1.
 * - Curve strictly interpolates the first control point P_0 at u=0 and the last control point P_n at u=spanCount.
 * - Standard knot vector format in industrial CAD modeling (STEP).
 */
export function createClampedKnotVector(
  controlPointCount: number,
  degree: number,
): number[] {
  const spanCount = Math.max(1, controlPointCount - degree);
  const interiorCount = Math.max(0, spanCount - 1);
  const knots: number[] = [];
  for (let i = 0; i <= degree; i += 1) knots.push(0);
  for (let i = 1; i <= interiorCount; i += 1) knots.push(i);
  for (let i = 0; i <= degree; i += 1) knots.push(spanCount);
  return knots;
}

/**
 * @deprecated Use `createClampedKnotVector` for open/clamped splines, or `createStandardUniformKnotVector` for un-clamped uniform splines.
 */
export function createUniformKnotVector(
  controlPointCount: number,
  degree: number,
): number[] {
  return createClampedKnotVector(controlPointCount, degree);
}

export function createRepeatedInteriorKnotVector(
  controlPointCount: number,
  degree: number,
  multiplicity: number,
): number[] {
  const spanCount = Math.max(1, controlPointCount - degree);
  const interiorCount = Math.max(0, spanCount - 1);
  if (interiorCount === 0)
    return createClampedKnotVector(controlPointCount, degree);

  const repeatedValue = Math.max(
    1,
    Math.min(interiorCount, Math.floor(spanCount / 2)),
  );
  const repeatedCount = Math.max(1, Math.min(multiplicity, interiorCount));
  const interior: number[] = Array.from(
    { length: repeatedCount },
    () => repeatedValue,
  );
  for (
    let value = 1;
    interior.length < interiorCount && value < spanCount;
    value += 1
  ) {
    if (value === repeatedValue) continue;
    interior.push(value);
  }
  interior.sort((a, b) => a - b);
  return [
    ...Array.from({ length: degree + 1 }, () => 0),
    ...interior,
    ...Array.from({ length: degree + 1 }, () => spanCount),
  ];
}

export function findKnotSpan(
  u: number,
  degree: number,
  knots: KnotVector,
): number {
  const n = knots.length - degree - 2;
  const first = knots[degree] ?? 0;
  const last = knots[n + 1] ?? first;
  if (u >= last - EPSILON) return n;
  if (u <= first + EPSILON) return degree;

  let low = degree;
  let high = n + 1;
  let mid = Math.floor((low + high) / 2);
  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) high = mid;
    else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

export function bsplineBasis(
  index: number,
  degree: number,
  u: number,
  knots: KnotVector,
): number {
  if (index < 0 || index + degree + 1 >= knots.length) return 0;
  if (degree === 0) {
    const inHalfOpenSpan = knots[index] <= u && u < knots[index + 1];
    const isLastNonEmptySpan =
      knots[index + 1] - knots[index] > EPSILON &&
      Math.abs(knots[index + 1] - knots[knots.length - 1]) < EPSILON;
    const atFinalEndpoint =
      Math.abs(u - knots[knots.length - 1]) < EPSILON && isLastNonEmptySpan;
    return inHalfOpenSpan || atFinalEndpoint ? 1 : 0;
  }

  const leftDenominator = knots[index + degree] - knots[index];
  const rightDenominator = knots[index + degree + 1] - knots[index + 1];
  const left =
    leftDenominator > EPSILON
      ? ((u - knots[index]) / leftDenominator) *
        bsplineBasis(index, degree - 1, u, knots)
      : 0;
  const right =
    rightDenominator > EPSILON
      ? ((knots[index + degree + 1] - u) / rightDenominator) *
        bsplineBasis(index + 1, degree - 1, u, knots)
      : 0;
  return left + right;
}

export function evaluateBSpline(
  points: readonly Point2[],
  degree: number,
  u: number,
  knots: KnotVector,
): Point2 {
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i += 1) {
    const weight = bsplineBasis(i, degree, u, knots);
    x += points[i][0] * weight;
    y += points[i][1] * weight;
  }
  return [x, y];
}

export function sampleBSpline(
  points: readonly Point2[],
  degree: number,
  knots: KnotVector,
  stepsPerSpan = 48,
): Point2[] {
  const spans = getNonEmptyKnotSpans(degree, knots);
  if (spans.length === 0) return [];
  const result: Point2[] = [];
  spans.forEach((span, spanIndex) => {
    for (let step = 0; step <= stepsPerSpan; step += 1) {
      if (spanIndex > 0 && step === 0) continue;
      const ratio = step / stepsPerSpan;
      result.push(
        evaluateBSpline(
          points,
          degree,
          span.start + (span.end - span.start) * ratio,
          knots,
        ),
      );
    }
  });
  return result;
}

export function getNonEmptyKnotSpans(
  degree: number,
  knots: KnotVector,
): KnotSpanInfo[] {
  const n = knots.length - degree - 2;
  const spans: KnotSpanInfo[] = [];
  for (let index = degree; index <= n; index += 1) {
    const start = knots[index];
    const end = knots[index + 1];
    if (start === undefined || end === undefined || end - start <= EPSILON) {
      continue;
    }
    spans.push({
      index,
      start,
      end,
      basisIndices: getBasisIndicesForSpan(index, degree, knots),
    });
  }
  return spans;
}

export function getBasisIndicesForSpan(
  spanIndex: number,
  degree: number,
  knots: KnotVector,
): number[] {
  const controlPointCount = knots.length - degree - 1;
  const first = Math.max(0, spanIndex - degree);
  const last = Math.min(controlPointCount - 1, spanIndex);
  const indices: number[] = [];
  for (let index = first; index <= last; index += 1) indices.push(index);
  return indices;
}

export function getBasisSupportInterval(
  basisIndex: number,
  degree: number,
  knots: KnotVector,
): [number, number] {
  return [knots[basisIndex] ?? 0, knots[basisIndex + degree + 1] ?? 0];
}

export function getSupportSpansForBasis(
  basisIndex: number,
  degree: number,
  knots: KnotVector,
): number[] {
  const [supportStart, supportEnd] = getBasisSupportInterval(
    basisIndex,
    degree,
    knots,
  );
  return getNonEmptyKnotSpans(degree, knots)
    .filter(
      (span) =>
        Math.min(span.end, supportEnd) - Math.max(span.start, supportStart) >
        EPSILON,
    )
    .map((span) => span.index);
}

export function getBasisSupportInfo(
  basisIndex: number,
  degree: number,
  knots: KnotVector,
): BasisSupportInfo {
  const [start, end] = getBasisSupportInterval(basisIndex, degree, knots);
  return {
    index: basisIndex,
    start,
    end,
    spanIndices: getSupportSpansForBasis(basisIndex, degree, knots),
  };
}

export function sumBasisAt(
  u: number,
  degree: number,
  knots: KnotVector,
): number {
  const controlPointCount = knots.length - degree - 1;
  let sum = 0;
  for (let i = 0; i < controlPointCount; i += 1) {
    sum += bsplineBasis(i, degree, u, knots);
  }
  return sum;
}

export function getContinuityForMultiplicity(
  degree: number,
  multiplicity: number,
): number {
  return multiplicity >= degree + 1 ? -1 : degree - multiplicity;
}
