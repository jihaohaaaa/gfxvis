import type { Bounds2 } from "../../core/plot2d";

export type LevelFieldId = "circle" | "parabola";

export interface LevelField {
  id: LevelFieldId;
  label: string;
  cMin: number;
  cMax: number;
  defaultC: number;
  /** Original symbolic KaTeX formula, e.g. `x^2+y^2`. */
  tex: string;
  /** Level equation at c, e.g. `x^2+y^2 = 1.50`. */
  levelTex(c: number): string;
  bounds: Bounds2;
  ticksX: number[];
  ticksY: number[];
  /** Sample points on the level curve F = c (empty when no real curve). */
  levelCurve(c: number, steps: number): Array<[number, number]>;
}

export const LEVEL_FIELDS: Record<LevelFieldId, LevelField> = {
  circle: {
    id: "circle",
    label: "圆族",
    cMin: 0.2,
    cMax: 4,
    defaultC: 1.5,
    tex: "x^2+y^2",
    levelTex: (c) => `x^2+y^2 = ${c.toFixed(2)}`,
    bounds: { xMin: -2.6, xMax: 2.6, yMin: -2.6, yMax: 2.6 },
    ticksX: [-2, -1, 1, 2],
    ticksY: [-2, -1, 1, 2],
    levelCurve: (c, steps) => {
      if (c < 0) return [];
      const r = Math.sqrt(c);
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= steps; i++) {
        const t = (2 * Math.PI * i) / steps;
        pts.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      return pts;
    },
  },
  parabola: {
    id: "parabola",
    label: "抛物线族",
    cMin: -1.5,
    cMax: 1.5,
    defaultC: 0.5,
    tex: "y-x^2",
    levelTex: (c) => `y = x^2+${c.toFixed(2)}`,
    bounds: { xMin: -2.6, xMax: 2.6, yMin: -1.8, yMax: 5.8 },
    ticksX: [-2, -1, 1, 2],
    ticksY: [1, 2, 3, 4, 5],
    levelCurve: (c, steps) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= steps; i++) {
        const x = -2 + (4 * i) / steps;
        pts.push([x, x * x + c]);
      }
      return pts;
    },
  },
};
