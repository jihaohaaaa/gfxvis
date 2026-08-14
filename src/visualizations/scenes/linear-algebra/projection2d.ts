import type { Bounds2 } from "../../core/2d/plot2d";

export type ProjectionModeId = "orthogonal" | "oblique";
export type ProjectionTargetId = "x-axis" | "line-yx";

export interface ProjectionMode {
  id: ProjectionModeId;
  label: string;
  /** KaTeX matrix of P. */
  tex: string;
  /** KaTeX formula of Px in terms of x, y. */
  texPx: string;
  /** KaTeX formula of (I - P)x in terms of x, y. */
  texResidual: string;
  project(x: number, y: number): [number, number];
}

export interface ProjectionTarget {
  id: ProjectionTargetId;
  label: string;
  /** KaTeX of the target line, e.g. y = 0 or y = x. */
  tex: string;
  modes: Record<ProjectionModeId, ProjectionMode>;
}

/**
 * 2D projections onto a target line: the x-axis (y = 0) or y = x, each in an
 * orthogonal mode and an oblique mode (x-axis: along (1, -1); y = x: along (1, 0)).
 */
export const PROJECTION_TARGETS: Record<ProjectionTargetId, ProjectionTarget> =
  {
    "x-axis": {
      id: "x-axis",
      label: "x 轴",
      tex: "y = 0",
      modes: {
        orthogonal: {
          id: "orthogonal",
          label: "正交投影",
          tex: "\\begin{pmatrix}1&0\\\\0&0\\end{pmatrix}",
          texPx: "(x,\\,0)",
          texResidual: "(0,\\,y)",
          project: (x, _y) => [x, 0],
        },
        oblique: {
          id: "oblique",
          label: "斜投影",
          tex: "\\begin{pmatrix}1&1\\\\0&0\\end{pmatrix}",
          texPx: "(x+y,\\,0)",
          texResidual: "(-y,\\,y)",
          project: (x, y) => [x + y, 0],
        },
      },
    },
    "line-yx": {
      id: "line-yx",
      label: "y = x",
      tex: "y = x",
      modes: {
        orthogonal: {
          id: "orthogonal",
          label: "正交投影",
          tex: "\\frac{1}{2}\\begin{pmatrix}1&1\\\\1&1\\end{pmatrix}",
          texPx: "(\\frac{x+y}{2},\\,\\frac{x+y}{2})",
          texResidual: "(\\frac{x-y}{2},\\,\\frac{y-x}{2})",
          project: (x, y) => [(x + y) / 2, (x + y) / 2],
        },
        oblique: {
          id: "oblique",
          label: "斜投影",
          tex: "\\begin{pmatrix}0&1\\\\0&1\\end{pmatrix}",
          texPx: "(y,\\,y)",
          texResidual: "(x-y,\\,0)",
          project: (_x, y) => [y, y],
        },
      },
    },
  };

/** Canvas world bounds (room for the oblique Px = x + y to stay visible). */
export const PROJECTION_BOUNDS: Bounds2 = {
  xMin: -6,
  xMax: 6,
  yMin: -4,
  yMax: 4,
};

/** Slider range for the vector components (keeps Px on canvas). */
export const PROBE_CLAMP = { xMin: -3, xMax: 3, yMin: -2.5, yMax: 2.5 };

export const DEFAULT_X = { x: 2.5, y: 1.5 };
