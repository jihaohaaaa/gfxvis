import { clamp } from "../../core/common/math";
import type { Bounds2 } from "../../core/2d/plot2d";

export type Curve2DId = "circle" | "parabola";

export interface Curve2D {
  id: Curve2DId;
  label: string;
  tMin: number;
  tMax: number;
  defaultT: number;
  bounds: Bounds2;
  ticksX: number[];
  ticksY: number[];
  point(t: number): [number, number];
  tangent(t: number): [number, number];
  /** Recover t from a point near the curve (for dragging the marker). */
  invert(x: number, y: number): number;
  /** Original symbolic KaTeX formula, e.g. `(\cos t, \sin t)`. */
  tex: string;
  texTangent: string;
  /** Sample the curve as a polyline. */
  sample(steps: number): Array<[number, number]>;
}

export const CURVES2D: Record<Curve2DId, Curve2D> = {
  circle: {
    id: "circle",
    label: "圆",
    tMin: 0,
    tMax: 2 * Math.PI,
    defaultT: 1.0,
    bounds: { xMin: -1.8, xMax: 1.8, yMin: -1.8, yMax: 1.8 },
    ticksX: [-1, 1],
    ticksY: [-1, 1],
    point: (t) => [Math.cos(t), Math.sin(t)],
    tangent: (t) => [-Math.sin(t), Math.cos(t)],
    invert: (x, y) => {
      const t = Math.atan2(y, x);
      return t < 0 ? t + 2 * Math.PI : t;
    },
    tex: "(\\cos t, \\sin t)",
    texTangent: "(-\\sin t, \\cos t)",
    sample: (steps) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= steps; i++) {
        const t = (2 * Math.PI * i) / steps;
        pts.push([Math.cos(t), Math.sin(t)]);
      }
      return pts;
    },
  },
  parabola: {
    id: "parabola",
    label: "抛物线",
    tMin: -2,
    tMax: 2,
    defaultT: 0.8,
    bounds: { xMin: -2.6, xMax: 2.6, yMin: -0.6, yMax: 4.6 },
    ticksX: [-2, -1, 1, 2],
    ticksY: [1, 2, 3, 4],
    point: (t) => [t, t * t],
    tangent: (t) => [1, 2 * t],
    invert: (x: number, _y: number) => clamp(x, -2, 2),
    tex: "(t, t^2)",
    texTangent: "(1, 2t)",
    sample: (steps) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= steps; i++) {
        const t = -2 + (4 * i) / steps;
        pts.push([t, t * t]);
      }
      return pts;
    },
  },
};
