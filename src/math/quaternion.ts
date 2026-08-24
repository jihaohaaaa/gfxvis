/**
 * GLM-styled Quaternion interface, operations, transformations, and SLERP.
 */

import { type Vec3, normalize } from "./vector";
import type { Matrix3x3 } from "./matrix";

export interface Quat {
  w: number;
  x: number;
  y: number;
  z: number;
}

export function quat(w = 1, x = 0, y = 0, z = 0): Quat {
  return { w, x, y, z };
}

export function quatIdentity(): Quat {
  return { w: 1, x: 0, y: 0, z: 0 };
}

export function quatLength(q: Quat): number {
  return Math.hypot(q.w, q.x, q.y, q.z);
}

export function quatNormalize(q: Quat): Quat {
  const l = quatLength(q);
  if (l < 1e-12) return quatIdentity();
  return { w: q.w / l, x: q.x / l, y: q.y / l, z: q.z / l };
}

export function quatConjugate(q: Quat): Quat {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

export function quatInverse(q: Quat): Quat {
  const nSq = q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z;
  if (nSq < 1e-12) return quatIdentity();
  return {
    w: q.w / nSq,
    x: -q.x / nSq,
    y: -q.y / nSq,
    z: -q.z / nSq,
  };
}

/** Quaternion multiplication: q1 * q2 (GLM operator*) */
export function quatMultiply(q1: Quat, q2: Quat): Quat {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/** Axis-Angle in degrees to unit Quaternion (GLM angleAxis) */
export function axisAngleToQuat(axis: Vec3, angleDeg: number): Quat {
  const u = normalize(axis);
  const rad = (angleDeg * Math.PI) / 180.0;
  const halfAngle = rad / 2.0;
  const s = Math.sin(halfAngle);
  return {
    w: Math.cos(halfAngle),
    x: u.x * s,
    y: u.y * s,
    z: u.z * s,
  };
}

/** Quaternion to Axis-Angle in degrees */
export function quatToAxisAngle(q: Quat): { axis: Vec3; angleDeg: number } {
  const nq = quatNormalize(q);
  const angleRad = 2.0 * Math.acos(Math.max(-1, Math.min(1, nq.w)));
  const s = Math.sin(angleRad / 2.0);
  let axis: Vec3;
  if (s < 1e-6) {
    axis = { x: 0, y: 0, z: 1 };
  } else {
    axis = { x: nq.x / s, y: nq.y / s, z: nq.z / s };
  }
  return {
    axis: normalize(axis),
    angleDeg: (angleRad * 180.0) / Math.PI,
  };
}

/** Convert unit quaternion to 3x3 Column-Major rotation matrix */
export function quatToMatrix3x3(q: Quat): Matrix3x3 {
  const { w, x, y, z } = quatNormalize(q);
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/** Rotate a 3D vector by a unit quaternion: v' = q * v * q^(-1) */
export function quatRotateVec3(q: Quat, v: Vec3): Vec3 {
  const qv: Quat = { w: 0, x: v.x, y: v.y, z: v.z };
  const qConj = quatConjugate(q);
  const qRes = quatMultiply(quatMultiply(q, qv), qConj);
  return { x: qRes.x, y: qRes.y, z: qRes.z };
}

/** Spherical linear interpolation between two unit quaternions (GLM slerp) */
export function slerp(q1: Quat, q2: Quat, t: number): Quat {
  let cosTheta = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
  let target = q2;

  if (cosTheta < 0) {
    cosTheta = -cosTheta;
    target = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
  }

  if (cosTheta > 0.9995) {
    return quatNormalize({
      w: q1.w + (target.w - q1.w) * t,
      x: q1.x + (target.x - q1.x) * t,
      y: q1.y + (target.y - q1.y) * t,
      z: q1.z + (target.z - q1.z) * t,
    });
  }

  const theta = Math.acos(cosTheta);
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;

  return {
    w: w1 * q1.w + w2 * target.w,
    x: w1 * q1.x + w2 * target.x,
    y: w1 * q1.y + w2 * target.y,
    z: w1 * q1.z + w2 * target.z,
  };
}
