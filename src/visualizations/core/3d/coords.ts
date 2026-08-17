/**
 * Math coordinates are right-handed with z up; Three.js world coordinates are
 * right-handed with y up. This is the single mapping between them:
 *
 *   (x, y, z)_math -> (x, z, -y)_world
 *
 * The mapping matrix has det = +1, so handedness is preserved and math +z (up)
 * becomes world +y (up). Use it for both points and direction vectors; do not
 * hand-write equivalent coordinates in 3D scenes.
 */
export function mathToWorld(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [x, z, -y];
}

/**
 * Inverse mapping from Three.js world coordinates back to right-handed z-up math coordinates:
 *
 *   (x, y, z)_world -> (x, -z, y)_math
 */
export function worldToMath(
  wx: number,
  wy: number,
  wz: number,
): [number, number, number] {
  return [wx, -wz, wy];
}
