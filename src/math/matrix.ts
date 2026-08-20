/**
 * GLM-styled Column-Major Matrix interfaces, operators, transformations, and decompositions.
 *
 * Column-Major Memory Layout (aligning with GLSL, GLM, and WebGL/Three.js):
 *
 * mat2: [col0_r0, col0_r1,  col1_r0, col1_r1]
 *       [  c0.x,    c0.y,     c1.x,    c1.y ]
 *
 * mat3: [col0_r0, col0_r1, col0_r2,  col1_r0, col1_r1, col1_r2,  col2_r0, col2_r1, col2_r2]
 *       [  c0.x,    c0.y,    c0.z,     c1.x,    c1.y,    c1.z,     c2.x,    c2.y,    c2.z  ]
 *
 * mat4: 16-element column-major flat array
 */

import { type Vec2, type Vec3, cross, normalize } from "./vector.ts";

/** 2x2 Column-Major Matrix [c0.x, c0.y, c1.x, c1.y] */
export type Mat2 = [number, number, number, number];

/** 3x3 Column-Major Matrix [c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z] */
export type Mat3 = [
  number,
  number,
  number, // Column 0 (X basis)
  number,
  number,
  number, // Column 1 (Y basis)
  number,
  number,
  number, // Column 2 (Z basis)
];

/** 4x4 Column-Major Matrix */
export type Mat4 = [
  number,
  number,
  number,
  number, // Column 0
  number,
  number,
  number,
  number, // Column 1
  number,
  number,
  number,
  number, // Column 2
  number,
  number,
  number,
  number, // Column 3
];

// --- Constructors / Identity ---

/** Construct a column-major 2x2 matrix from column entries */
export function mat2(c0x = 1, c0y = 0, c1x = 0, c1y = 1): Mat2 {
  return [c0x, c0y, c1x, c1y];
}

export function mat2FromCols(c0: Vec2, c1: Vec2): Mat2 {
  return [c0.x, c0.y, c1.x, c1.y];
}

/** Construct an identity 2x2 matrix */
export function identity2(): Mat2 {
  return [1, 0, 0, 1];
}

/** Construct a column-major 3x3 matrix from column entries */
export function mat3(
  c0x = 1,
  c0y = 0,
  c0z = 0,
  c1x = 0,
  c1y = 1,
  c1z = 0,
  c2x = 0,
  c2y = 0,
  c2z = 1,
): Mat3 {
  return [c0x, c0y, c0z, c1x, c1y, c1z, c2x, c2y, c2z];
}

export function mat3FromCols(c0: Vec3, c1: Vec3, c2: Vec3): Mat3 {
  return [c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z];
}

/** Construct an identity 3x3 matrix */
export function identity3(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function identity4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// --- Column / Row Accessors ---

export function getCol3(m: Mat3, colIndex: 0 | 1 | 2): Vec3 {
  const i = colIndex * 3;
  return { x: m[i], y: m[i + 1], z: m[i + 2] };
}

export function getRow3(m: Mat3, rowIndex: 0 | 1 | 2): Vec3 {
  return { x: m[rowIndex], y: m[3 + rowIndex], z: m[6 + rowIndex] };
}

// --- Determinant & Trace (Column-Major) ---

export function determinant2(m: Mat2): number {
  return m[0] * m[3] - m[2] * m[1];
}

export function trace2(m: Mat2): number {
  return m[0] + m[3];
}

export function determinant3(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[7] * m[5]) -
    m[3] * (m[1] * m[8] - m[7] * m[2]) +
    m[6] * (m[1] * m[5] - m[4] * m[2])
  );
}

export function trace3(m: Mat3): number {
  return m[0] + m[4] + m[8];
}

// --- Transpose ---

export function transpose2(m: Mat2): Mat2 {
  return [m[0], m[2], m[1], m[3]];
}

export function transpose3(m: Mat3): Mat3 {
  return [
    m[0],
    m[3],
    m[6], // Col 0 becomes Row 0
    m[1],
    m[4],
    m[7], // Col 1 becomes Row 1
    m[2],
    m[5],
    m[8], // Col 2 becomes Row 2
  ];
}

// --- Inverse (GLM inverse) ---

export function inverse2(m: Mat2): Mat2 | null {
  const d = determinant2(m);
  if (Math.abs(d) < 1e-12) return null;
  const invD = 1 / d;
  return [m[3] * invD, -m[1] * invD, -m[2] * invD, m[0] * invD];
}

export function inverse3(m: Mat3): Mat3 | null {
  const d = determinant3(m);
  if (Math.abs(d) < 1e-12) return null;
  const invD = 1 / d;

  return [
    (m[4] * m[8] - m[5] * m[7]) * invD,
    (m[2] * m[7] - m[1] * m[8]) * invD,
    (m[1] * m[5] - m[2] * m[4]) * invD,

    (m[5] * m[6] - m[3] * m[8]) * invD,
    (m[0] * m[8] - m[2] * m[6]) * invD,
    (m[2] * m[3] - m[0] * m[5]) * invD,

    (m[3] * m[7] - m[4] * m[6]) * invD,
    (m[1] * m[6] - m[0] * m[7]) * invD,
    (m[0] * m[4] - m[1] * m[3]) * invD,
  ];
}

// --- Multiplication: Matrix * Vector & Matrix * Matrix (Column-Major) ---

/** Matrix-Vector Product: M * v in column-major */
export function mat2Vec(m: Mat2, v: Vec2): Vec2 {
  return {
    x: m[0] * v.x + m[2] * v.y,
    y: m[1] * v.x + m[3] * v.y,
  };
}

/** Matrix-Vector Product: M * v in column-major */
export function mat3Vec(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[3] * v.y + m[6] * v.z,
    y: m[1] * v.x + m[4] * v.y + m[7] * v.z,
    z: m[2] * v.x + m[5] * v.y + m[8] * v.z,
  };
}

/** Matrix-Matrix Product: A * B in column-major */
export function mat2Mul(a: Mat2, b: Mat2): Mat2 {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
  ];
}

/** Matrix-Matrix Product: A * B in column-major */
export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const res: number[] = new Array(9);
  for (let c = 0; c < 3; c++) {
    const bx = b[c * 3 + 0];
    const by = b[c * 3 + 1];
    const bz = b[c * 3 + 2];
    res[c * 3 + 0] = a[0] * bx + a[3] * by + a[6] * bz;
    res[c * 3 + 1] = a[1] * bx + a[4] * by + a[7] * bz;
    res[c * 3 + 2] = a[2] * bx + a[5] * by + a[8] * bz;
  }
  return res as Mat3;
}

// --- GLM Transform Matrix Constructors (Column-Major) ---

export function rotation2D(radians: number): Mat2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, -s, c];
}

export function rotationX(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [1, 0, 0, 0, c, s, 0, -s, c];
}

export function rotationY(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, 0, -s, 0, 1, 0, s, 0, c];
}

export function rotationZ(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/** GLM lookAt (Right-Handed LookAt View Matrix in Column-Major) */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat3 {
  const f = normalize({
    x: target.x - eye.x,
    y: target.y - eye.y,
    z: target.z - eye.z,
  });
  const r = normalize(cross(f, up));
  const u = cross(r, f);

  return [r.x, u.x, -f.x, r.y, u.y, -f.y, r.z, u.z, -f.z];
}

// --- Analytical 2x2 Eigendecomposition & SVD (Column-Major) ---

export interface EigenResult2 {
  isComplex: boolean;
  lambda1: number;
  lambda2: number;
  v1: Vec2 | null;
  v2: Vec2 | null;
}

export function eigen2x2(m: Mat2): EigenResult2 {
  const a = m[0]; // r0, c0
  const c = m[1]; // r1, c0
  const b = m[2]; // r0, c1
  const d = m[3]; // r1, c1

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
  U: Mat2;
  sigma1: number;
  sigma2: number;
  V: Mat2;
  u1: Vec2;
  u2: Vec2;
  v1: Vec2;
  v2: Vec2;
}

export function svd2x2(m: Mat2): SvdResult2 {
  const a = m[0]; // r0, c0
  const c = m[1]; // r1, c0
  const b = m[2]; // r0, c1
  const d = m[3]; // r1, c1

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
    const Av1 = mat2Vec(m, v1);
    u1 = { x: Av1.x / sigma1, y: Av1.y / sigma1 };
  } else {
    u1 = { x: 1, y: 0 };
  }

  if (sigma2 > 1e-7) {
    const Av2 = mat2Vec(m, v2);
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
    U: [u1.x, u1.y, u2.x, u2.y],
    sigma1,
    sigma2,
    V: [v1.x, v1.y, v2.x, v2.y],
    u1,
    u2,
    v1,
    v2,
  };
}
