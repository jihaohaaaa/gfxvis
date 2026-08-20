/**
 * GLM-styled 2D, 3D, and 4D Vector interfaces, constructors, and geometric operations.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export type Vec2Tuple = [number, number];
export type Vec3Tuple = [number, number, number];
export type Vec4Tuple = [number, number, number, number];

// --- GLM Constructors / Factory Functions ---

export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function vec4(x = 0, y = 0, z = 0, w = 0): Vec4 {
  return { x, y, z, w };
}

// --- Tuple conversions ---

export function vec2ToTuple(v: Vec2): Vec2Tuple {
  return [v.x, v.y];
}

export function tupleToVec2(t: Vec2Tuple): Vec2 {
  return { x: t[0], y: t[1] };
}

export function vec3ToTuple(v: Vec3): Vec3Tuple {
  return [v.x, v.y, v.z];
}

export function tupleToVec3(t: Vec3Tuple): Vec3 {
  return { x: t[0], y: t[1], z: t[2] };
}

export function vec4ToTuple(v: Vec4): Vec4Tuple {
  return [v.x, v.y, v.z, v.w];
}

export function tupleToVec4(t: Vec4Tuple): Vec4 {
  return { x: t[0], y: t[1], z: t[2], w: t[3] };
}

// --- Basic Vector Arithmetic (GLM style pure functions) ---

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function scale2(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

export function negate2(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

// --- Dot & Cross Products ---

/** 3D Euclidean Dot Product: dot(a, b) = a · b */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** 2D Euclidean Dot Product: dot2(a, b) = a · b */
export function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** 3D Cross Product: cross(a, b) = a × b */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** 2D Cross Product (Perp Dot / Scalar 2D Cross): a.x * b.y - a.y * b.x */
export function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

// --- Length & Distance (GLM style length & distance) ---

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function length2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function lengthSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function lengthSq2(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(
  v: Vec3,
  fallback: Vec3 = { x: 0, y: 0, z: 1 },
): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z);
  if (l < 1e-10) return { ...fallback };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function normalize2(v: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const l = Math.hypot(v.x, v.y);
  if (l < 1e-10) return { ...fallback };
  return { x: v.x / l, y: v.y / l };
}

// --- Geometric Projections, Reflections & Angles ---

/** Project vector v onto target direction vector */
export function project(v: Vec3, target: Vec3): Vec3 {
  const d = dot(target, target);
  if (d < 1e-12) return { x: 0, y: 0, z: 0 };
  const scalar = dot(v, target) / d;
  return scale(target, scalar);
}

/** GLM reflect: I - 2.0 * dot(N, I) * N */
export function reflect(I: Vec3, N: Vec3): Vec3 {
  const d = dot(N, I);
  return {
    x: I.x - 2.0 * d * N.x,
    y: I.y - 2.0 * d * N.y,
    z: I.z - 2.0 * d * N.z,
  };
}

/** Angle in radians between two 3D vectors */
export function angle(a: Vec3, b: Vec3): number {
  const d = dot(a, b);
  const l = length(a) * length(b);
  if (l < 1e-12) return 0;
  const cosTheta = Math.max(-1, Math.min(1, d / l));
  return Math.acos(cosTheta);
}

/** Angle in radians between two 2D vectors */
export function angle2(a: Vec2, b: Vec2): number {
  const d = dot2(a, b);
  const l = length2(a) * length2(b);
  if (l < 1e-12) return 0;
  const cosTheta = Math.max(-1, Math.min(1, d / l));
  return Math.acos(cosTheta);
}

/** GLM mix for vectors */
export function mixVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function mixVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
