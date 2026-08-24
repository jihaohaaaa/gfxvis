/**
 * GLM-styled Column-Major Matrix interfaces, operators, transformations, and decompositions.
 *
 * Column-Major Memory Layout (aligning with GLSL, GLM, and WebGL/Three.js):
 *
 * Matrix2x2: [[c0_r0, c0_r1], [c1_r0, c1_r1]] -> m[col][row]
 *            [   c0.x,  c0.y], [  c1.x,  c1.y ]
 *
 * Matrix3x3: [[c0_r0, c0_r1, c0_r2], [c1_r0, c1_r1, c1_r2], [c2_r0, c2_r1, c2_r2]] -> m[col][row]
 *            [   c0.x,  c0.y,  c0.z], [  c1.x,  c1.y,  c1.z], [  c2.x,  c2.y,  c2.z ]
 *
 * Matrix4x4: 4 column tuples of 4 elements each -> m[col][row]
 */

import { type Vec2, type Vec3, cross, normalize } from "./vector";

/** 2x2 Column-Major Matrix: m[col][row] */
export type Matrix2x2 = [
  [number, number], // Column 0 (X basis)
  [number, number], // Column 1 (Y basis)
];

/** 3x3 Column-Major Matrix: m[col][row] */
export type Matrix3x3 = [
  [number, number, number], // Column 0 (X basis)
  [number, number, number], // Column 1 (Y basis)
  [number, number, number], // Column 2 (Z basis)
];

/** 4x4 Column-Major Matrix: m[col][row] */
export type Matrix4x4 = [
  [number, number, number, number], // Column 0
  [number, number, number, number], // Column 1
  [number, number, number, number], // Column 2
  [number, number, number, number], // Column 3
];

// --- Constructors / Identity ---

/** Construct a column-major 2x2 matrix from column entries: [[c00, c01], [c10, c11]] */
export function matrix2x2(c00 = 1, c01 = 0, c10 = 0, c11 = 1): Matrix2x2 {
  return [
    [c00, c01],
    [c10, c11],
  ];
}

export function matrix2x2FromColumns(c0: Vec2, c1: Vec2): Matrix2x2 {
  return [
    [c0.x, c0.y],
    [c1.x, c1.y],
  ];
}

/** Construct an identity 2x2 matrix */
export function identity2x2(): Matrix2x2 {
  return [
    [1, 0],
    [0, 1],
  ];
}

/** Construct a column-major 3x3 matrix from column entries */
export function matrix3x3(
  c00 = 1,
  c01 = 0,
  c02 = 0,
  c10 = 0,
  c11 = 1,
  c12 = 0,
  c20 = 0,
  c21 = 0,
  c22 = 1,
): Matrix3x3 {
  return [
    [c00, c01, c02],
    [c10, c11, c12],
    [c20, c21, c22],
  ];
}

export function matrix3x3FromColumns(c0: Vec3, c1: Vec3, c2: Vec3): Matrix3x3 {
  return [
    [c0.x, c0.y, c0.z],
    [c1.x, c1.y, c1.z],
    [c2.x, c2.y, c2.z],
  ];
}

/** Construct an identity 3x3 matrix */
export function identity3x3(): Matrix3x3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

/** Construct an identity 4x4 matrix */
export function identity4x4(): Matrix4x4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

export function matrix4x4(
  c00 = 1,
  c01 = 0,
  c02 = 0,
  c03 = 0,
  c10 = 0,
  c11 = 1,
  c12 = 0,
  c13 = 0,
  c20 = 0,
  c21 = 0,
  c22 = 1,
  c23 = 0,
  c30 = 0,
  c31 = 0,
  c32 = 0,
  c33 = 1,
): Matrix4x4 {
  return [
    [c00, c01, c02, c03],
    [c10, c11, c12, c13],
    [c20, c21, c22, c23],
    [c30, c31, c32, c33],
  ];
}

// --- Column / Row Accessors & Flat Array Conversions ---

export function getColumn2(m: Matrix2x2, colIndex: 0 | 1): Vec2 {
  return { x: m[colIndex][0], y: m[colIndex][1] };
}

export function getRow2(m: Matrix2x2, rowIndex: 0 | 1): Vec2 {
  return { x: m[0][rowIndex], y: m[1][rowIndex] };
}

export function getColumn3(m: Matrix3x3, colIndex: 0 | 1 | 2): Vec3 {
  return { x: m[colIndex][0], y: m[colIndex][1], z: m[colIndex][2] };
}

export function getRow3(m: Matrix3x3, rowIndex: 0 | 1 | 2): Vec3 {
  return { x: m[0][rowIndex], y: m[1][rowIndex], z: m[2][rowIndex] };
}

export function matrix2x2ToFlat(
  m: Matrix2x2,
): [number, number, number, number] {
  return [m[0][0], m[0][1], m[1][0], m[1][1]];
}

export function matrix2x2FromFlat(
  f: [number, number, number, number] | number[],
): Matrix2x2 {
  return [
    [f[0], f[1]],
    [f[2], f[3]],
  ];
}

export function matrix3x3ToFlat(m: Matrix3x3): number[] {
  return [
    m[0][0],
    m[0][1],
    m[0][2],
    m[1][0],
    m[1][1],
    m[1][2],
    m[2][0],
    m[2][1],
    m[2][2],
  ];
}

export function matrix3x3FromFlat(f: number[]): Matrix3x3 {
  return [
    [f[0], f[1], f[2]],
    [f[3], f[4], f[5]],
    [f[6], f[7], f[8]],
  ];
}

export function matrix4x4ToFlat(m: Matrix4x4): number[] {
  return [
    m[0][0],
    m[0][1],
    m[0][2],
    m[0][3],
    m[1][0],
    m[1][1],
    m[1][2],
    m[1][3],
    m[2][0],
    m[2][1],
    m[2][2],
    m[2][3],
    m[3][0],
    m[3][1],
    m[3][2],
    m[3][3],
  ];
}

// --- Determinant & Trace (Column-Major) ---

export function determinant2x2(m: Matrix2x2): number {
  return m[0][0] * m[1][1] - m[1][0] * m[0][1];
}

export function trace2x2(m: Matrix2x2): number {
  return m[0][0] + m[1][1];
}

export function determinant3x3(m: Matrix3x3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]) -
    m[1][0] * (m[0][1] * m[2][2] - m[2][1] * m[0][2]) +
    m[2][0] * (m[0][1] * m[1][2] - m[1][1] * m[0][2])
  );
}

export function trace3x3(m: Matrix3x3): number {
  return m[0][0] + m[1][1] + m[2][2];
}

// --- Transpose ---

export function transpose2x2(m: Matrix2x2): Matrix2x2 {
  return [
    [m[0][0], m[1][0]],
    [m[0][1], m[1][1]],
  ];
}

export function transpose3x3(m: Matrix3x3): Matrix3x3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

// --- Inverse ---

export function inverse2x2(m: Matrix2x2): Matrix2x2 | null {
  const d = determinant2x2(m);
  if (Math.abs(d) < 1e-12) return null;
  const invD = 1 / d;
  return [
    [m[1][1] * invD, -m[0][1] * invD],
    [-m[1][0] * invD, m[0][0] * invD],
  ];
}

export function inverse3x3(m: Matrix3x3): Matrix3x3 | null {
  const d = determinant3x3(m);
  if (Math.abs(d) < 1e-12) return null;
  const invD = 1 / d;

  return [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invD,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invD,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invD,
    ],
    [
      (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invD,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invD,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invD,
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invD,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invD,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invD,
    ],
  ];
}

// --- Multiplication ---

/** Matrix-Vector Product: M * v in column-major */
export function multiplyMatrix2x2Vector2(m: Matrix2x2, v: Vec2): Vec2 {
  return {
    x: m[0][0] * v.x + m[1][0] * v.y,
    y: m[0][1] * v.x + m[1][1] * v.y,
  };
}

/** Matrix-Vector Product: M * v in column-major */
export function multiplyMatrix3x3Vector3(m: Matrix3x3, v: Vec3): Vec3 {
  return {
    x: m[0][0] * v.x + m[1][0] * v.y + m[2][0] * v.z,
    y: m[0][1] * v.x + m[1][1] * v.y + m[2][1] * v.z,
    z: m[0][2] * v.x + m[1][2] * v.y + m[2][2] * v.z,
  };
}

/** Matrix-Matrix Product: A * B in column-major */
export function multiplyMatrix2x2(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
  return [
    [
      a[0][0] * b[0][0] + a[1][0] * b[0][1],
      a[0][1] * b[0][0] + a[1][1] * b[0][1],
    ],
    [
      a[0][0] * b[1][0] + a[1][0] * b[1][1],
      a[0][1] * b[1][0] + a[1][1] * b[1][1],
    ],
  ];
}

/** Matrix-Matrix Product: A * B in column-major */
export function multiplyMatrix3x3(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const res: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      res[c][r] = a[0][r] * b[c][0] + a[1][r] * b[c][1] + a[2][r] * b[c][2];
    }
  }
  return res;
}

/** Matrix-Matrix Product: 4x4 */
export function multiplyMatrix4x4(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
  const res: Matrix4x4 = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      res[c][r] =
        a[0][r] * b[c][0] +
        a[1][r] * b[c][1] +
        a[2][r] * b[c][2] +
        a[3][r] * b[c][3];
    }
  }
  return res;
}

// --- GLM Transform Matrix Constructors (Column-Major) ---

export function rotation2D(radians: number): Matrix2x2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    [c, s],
    [-s, c],
  ];
}

export function rotationX3x3(radians: number): Matrix3x3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    [1, 0, 0],
    [0, c, s],
    [0, -s, c],
  ];
}

export function rotationY3x3(radians: number): Matrix3x3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    [c, 0, -s],
    [0, 1, 0],
    [s, 0, c],
  ];
}

export function rotationZ3x3(radians: number): Matrix3x3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    [c, s, 0],
    [-s, c, 0],
    [0, 0, 1],
  ];
}

/** GLM lookAt (Right-Handed LookAt View Matrix in Column-Major Matrix3x3) */
export function lookAt3x3(eye: Vec3, target: Vec3, up: Vec3): Matrix3x3 {
  const f = normalize({
    x: target.x - eye.x,
    y: target.y - eye.y,
    z: target.z - eye.z,
  });
  const r = normalize(cross(f, up));
  const u = cross(r, f);

  return [
    [r.x, u.x, -f.x],
    [r.y, u.y, -f.y],
    [r.z, u.z, -f.z],
  ];
}

// --- Analytical 2x2 Eigendecomposition & SVD (Column-Major) ---

export interface EigenResult2 {
  isComplex: boolean;
  lambda1: number;
  lambda2: number;
  v1: Vec2 | null;
  v2: Vec2 | null;
}

export function eigen2x2(m: Matrix2x2): EigenResult2 {
  const a = m[0][0]; // r0, c0
  const c = m[0][1]; // r1, c0
  const b = m[1][0]; // r0, c1
  const d = m[1][1]; // r1, c1

  const tr = a + d;
  const dt = a * d - b * c;
  const discriminant = tr * tr - 4 * dt;

  if (discriminant < -1e-7) {
    return {
      isComplex: true,
      lambda1: tr / 2,
      lambda2: tr / 2,
      v1: null,
      v2: null,
    };
  }

  const sqrtDisc = Math.sqrt(Math.max(0, discriminant));
  const lambda1 = (tr + sqrtDisc) / 2;
  const lambda2 = (tr - sqrtDisc) / 2;

  function findEigenvector(lambda: number): Vec2 {
    const r1x = a - lambda;
    const r1y = b;
    const r2x = c;
    const r2y = d - lambda;
    let vx: number;
    let vy: number;

    if (Math.abs(r1y) > 1e-7) {
      vx = -r1y;
      vy = r1x;
    } else if (Math.abs(r2x) > 1e-7) {
      vx = -r2y;
      vy = r2x;
    } else if (Math.abs(r1x) > 1e-7) {
      vx = 0;
      vy = 1;
    } else if (Math.abs(r2y) > 1e-7) {
      vx = 1;
      vy = 0;
    } else {
      vx = 1;
      vy = 0;
    }
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  }

  return {
    isComplex: false,
    lambda1,
    lambda2,
    v1: findEigenvector(lambda1),
    v2: findEigenvector(lambda2),
  };
}

export interface SvdResult2 {
  U: Matrix2x2;
  sigma1: number;
  sigma2: number;
  V: Matrix2x2;
  u1: Vec2;
  u2: Vec2;
  v1: Vec2;
  v2: Vec2;
}

export function svd2x2(m: Matrix2x2): SvdResult2 {
  const a = m[0][0]; // r0, c0
  const c = m[0][1]; // r1, c0
  const b = m[1][0]; // r0, c1
  const d = m[1][1]; // r1, c1

  const p = a * a + c * c;
  const q = a * b + c * d;
  const s = b * b + d * d;

  const tr = p + s;
  const diff = p - s;
  const disc = Math.sqrt(Math.max(0, diff * diff + 4 * q * q));

  const lambda1 = Math.max(0, (tr + disc) / 2);
  const lambda2 = Math.max(0, (tr - disc) / 2);

  const sigma1 = Math.sqrt(lambda1);
  const sigma2 = Math.sqrt(lambda2);

  let v1: Vec2;
  let v2: Vec2;

  if (Math.abs(q) > 1e-8) {
    const vx = lambda1 - s;
    const vy = q;
    const len = Math.hypot(vx, vy);
    v1 = { x: vx / len, y: vy / len };
    v2 = { x: -v1.y, y: v1.x };
  } else if (p >= s) {
    v1 = { x: 1, y: 0 };
    v2 = { x: 0, y: 1 };
  } else {
    v1 = { x: 0, y: 1 };
    v2 = { x: 1, y: 0 };
  }

  let u1: Vec2;
  let u2: Vec2;

  if (sigma1 > 1e-7) {
    const Av1 = multiplyMatrix2x2Vector2(m, v1);
    u1 = { x: Av1.x / sigma1, y: Av1.y / sigma1 };
  } else {
    u1 = { x: 1, y: 0 };
  }

  if (sigma2 > 1e-7) {
    const Av2 = multiplyMatrix2x2Vector2(m, v2);
    u2 = { x: Av2.x / sigma2, y: Av2.y / sigma2 };
  } else {
    u2 = { x: -u1.y, y: u1.x };
  }

  if (u1.x * u2.y - u1.y * u2.x < 0) {
    u2 = { x: -u2.x, y: -u2.y };
  }
  if (v1.x * v2.y - v1.y * v2.x < 0) {
    v2 = { x: -v2.x, y: -v2.y };
  }

  return {
    U: [
      [u1.x, u1.y],
      [u2.x, u2.y],
    ],
    sigma1,
    sigma2,
    V: [
      [v1.x, v1.y],
      [v2.x, v2.y],
    ],
    u1,
    u2,
    v1,
    v2,
  };
}

// --- Additional Analytical 2x2 Matrix Decompositions (Column-Major) ---

export interface LuResult2 {
  L: Matrix2x2;
  U: Matrix2x2;
  P: Matrix2x2; // Permutation matrix
  hasPermutation: boolean;
}

/**
 * 2x2 LU Decomposition with partial pivoting: P * A = L * U
 */
export function lu2x2(m: Matrix2x2): LuResult2 {
  let a = m[0][0];
  let c = m[0][1];
  let b = m[1][0];
  let d = m[1][1];
  let hasPermutation = false;
  let P: Matrix2x2 = [
    [1, 0],
    [0, 1],
  ];

  if (Math.abs(c) > Math.abs(a)) {
    // Swap row 0 and row 1
    hasPermutation = true;
    P = [
      [0, 1],
      [1, 0],
    ];
    const tempA = a;
    a = c;
    c = tempA;
    const tempB = b;
    b = d;
    d = tempB;
  }

  const u00 = a;
  const u01 = b;
  const l10 = Math.abs(a) > 1e-12 ? c / a : 0;
  const u10 = 0;
  const u11 = d - l10 * b;

  return {
    L: [
      [1, l10],
      [0, 1],
    ],
    U: [
      [u00, u10],
      [u01, u11],
    ],
    P,
    hasPermutation,
  };
}

export interface QrResult2 {
  Q: Matrix2x2;
  R: Matrix2x2;
}

/**
 * 2x2 QR Decomposition via Gram-Schmidt / Householder: A = Q * R
 * Q is orthogonal (rotation/reflection), R is upper triangular.
 */
export function qr2x2(m: Matrix2x2): QrResult2 {
  const a1x = m[0][0];
  const a1y = m[0][1];
  const a2x = m[1][0];
  const a2y = m[1][1];

  const r00 = Math.hypot(a1x, a1y);
  let q1x = 1;
  let q1y = 0;
  if (r00 > 1e-12) {
    q1x = a1x / r00;
    q1y = a1y / r00;
  }

  // Projection of a2 onto q1
  const r01 = q1x * a2x + q1y * a2y;

  // Orthogonal component u2 = a2 - r01 * q1
  const u2x = a2x - r01 * q1x;
  const u2y = a2y - r01 * q1y;
  const r11 = Math.hypot(u2x, u2y);

  let q2x = -q1y;
  let q2y = q1x;
  if (r11 > 1e-12) {
    q2x = u2x / r11;
    q2y = u2y / r11;
  }

  return {
    Q: [
      [q1x, q1y],
      [q2x, q2y],
    ],
    R: [
      [r00, 0],
      [r01, r11],
    ],
  };
}

/**
 * 2x2 Cholesky Decomposition: A = L * L^T
 * Applicable only for symmetric positive definite (SPD) matrices.
 * Returns null if matrix is not positive definite.
 */
export function cholesky2x2(m: Matrix2x2): Matrix2x2 | null {
  const a = m[0][0]; // (0,0)
  const b = m[0][1]; // (1,0) = (0,1) for symmetric
  const d = m[1][1]; // (1,1)

  if (a <= 1e-12) return null;
  const l00 = Math.sqrt(a);
  const l10 = b / l00;
  const dMinusL10Sq = d - l10 * l10;
  if (dMinusL10Sq <= 1e-12) return null;
  const l11 = Math.sqrt(dMinusL10Sq);

  return [
    [l00, l10],
    [0, l11],
  ];
}

export interface PolarResult2 {
  Q: Matrix2x2; // Orthogonal factor (pure rotation/reflection)
  P: Matrix2x2; // Symmetric positive semi-definite stretch factor
}

/**
 * 2x2 Polar Decomposition: A = Q * P (Right Polar Decomposition)
 */
export function polar2x2(m: Matrix2x2): PolarResult2 {
  const svd = svd2x2(m);
  const { U, sigma1, sigma2, V } = svd;

  // Q = U * V^T
  const VT = transpose2x2(V);
  const Q = multiplyMatrix2x2(U, VT);

  // P = V * Sigma * V^T
  const Sigma: Matrix2x2 = [
    [sigma1, 0],
    [0, sigma2],
  ];
  const P = multiplyMatrix2x2(V, multiplyMatrix2x2(Sigma, VT));

  return { Q, P };
}

// --- Least Squares Fitting & Subspace Projections ---

export interface LeastSquaresResult2D {
  c: number;
  d: number;
  xHat: [number, number];
  residuals: number[];
  residualNormSq: number;
  A: Array<[number, number]>;
  b: number[];
  bHat: number[];
  AtA: Matrix2x2;
  Atb: [number, number];
  sigma1: number;
  sigma2: number;
  condA: number;
  condAtA: number;
  method: "normal" | "qr" | "svd" | "ridge";
  lambda: number;
}

export function fitLeastSquaresLinear2D(
  points: Array<{ x: number; y: number }>,
  options?: {
    method?: "normal" | "qr" | "svd" | "ridge";
    lambda?: number;
  },
): LeastSquaresResult2D {
  const method = options?.method ?? "normal";
  const lambda = options?.lambda ?? 0;

  const A: Array<[number, number]> = points.map((p) => [1, p.x]);
  const b: number[] = points.map((p) => p.y);

  let sum1 = 0;
  let sumX = 0;
  let sumX2 = 0;
  let sumY = 0;
  let sumXY = 0;

  for (let i = 0; i < points.length; i++) {
    const px = points[i].x;
    const py = points[i].y;
    sum1 += 1;
    sumX += px;
    sumX2 += px * px;
    sumY += py;
    sumXY += px * py;
  }

  const AtA: Matrix2x2 = [
    [sum1, sumX],
    [sumX, sumX2],
  ];
  const Atb: [number, number] = [sumY, sumXY];

  const eig = eigen2x2(AtA);
  const sigma1 = Math.sqrt(Math.max(eig.lambda1, 0));
  const sigma2 = Math.sqrt(Math.max(eig.lambda2, 0));
  const condA = sigma2 > 1e-12 ? sigma1 / sigma2 : 1e9;
  const condAtA = condA * condA;

  let c = 0;
  let d = 0;

  if (method === "ridge" || lambda > 0) {
    const regAtA: Matrix2x2 = [
      [sum1 + lambda, sumX],
      [sumX, sumX2 + lambda],
    ];
    const inv = inverse2x2(regAtA);
    if (inv) {
      const sol = multiplyMatrix2x2Vector2(inv, { x: Atb[0], y: Atb[1] });
      c = sol.x;
      d = sol.y;
    }
  } else if (method === "svd") {
    const svd = svd2x2(AtA);
    const s1 = svd.sigma1;
    const s2 = svd.sigma2;
    const invS1 = s1 > 1e-6 ? 1 / s1 : 0;
    const invS2 = s2 > 1e-6 ? 1 / s2 : 0;
    const VT = transpose2x2(svd.V);
    const SigmaInv: Matrix2x2 = [
      [invS1, 0],
      [0, invS2],
    ];
    const pinv = multiplyMatrix2x2(svd.V, multiplyMatrix2x2(SigmaInv, VT));
    const sol = multiplyMatrix2x2Vector2(pinv, { x: Atb[0], y: Atb[1] });
    c = sol.x;
    d = sol.y;
  } else if (method === "qr") {
    const r00 = Math.sqrt(sum1);
    const r01 = sumX / r00;
    let q1NormSq = 0;
    const q1Unnorm: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const val = points[i].x - r01 / r00;
      q1Unnorm.push(val);
      q1NormSq += val * val;
    }
    const r11 = Math.sqrt(q1NormSq);

    if (r11 > 1e-8) {
      const qty0 = sumY / r00;
      let qty1Unnorm = 0;
      for (let i = 0; i < points.length; i++) {
        qty1Unnorm += q1Unnorm[i] * points[i].y;
      }
      const qty1 = qty1Unnorm / r11;

      d = qty1 / r11;
      c = (qty0 - r01 * d) / r00;
    } else {
      c = sumY / sum1;
      d = 0;
    }
  } else {
    const inv = inverse2x2(AtA);
    if (inv) {
      const sol = multiplyMatrix2x2Vector2(inv, { x: Atb[0], y: Atb[1] });
      c = sol.x;
      d = sol.y;
    } else {
      c = sumY / (sum1 || 1);
      d = 0;
    }
  }

  if (Math.abs(c) < 1e-7) c = 0;
  if (Math.abs(d) < 1e-7) d = 0;

  const bHat: number[] = points.map((p) => c + d * p.x);
  const residuals: number[] = points.map((p, i) => p.y - bHat[i]);
  const residualNormSq = residuals.reduce((sum, r) => sum + r * r, 0);

  return {
    c,
    d,
    xHat: [c, d],
    residuals,
    residualNormSq,
    A,
    b,
    bHat,
    AtA,
    Atb,
    sigma1,
    sigma2,
    condA,
    condAtA,
    method,
    lambda,
  };
}
