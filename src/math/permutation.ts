import { type Matrix3x3, multiplyMatrix3x3 } from "./matrix";

export type { Matrix3x3 };

export interface PermutationInfo {
  id: string;
  name: string;
  nameEn: string;
  cycleNotation: string;
  array: number[]; // 0-indexed permutation e.g. [1, 0, 2] for swapping 0 and 1
  matrix: Matrix3x3;
  inversions: number;
  parity: "even" | "odd";
  det: 1 | -1;
  geometricType: "identity" | "reflection" | "rotation";
  geometricDesc: string;
}

/**
 * All 6 permutations of the Symmetric Group S_3 on {0, 1, 2} (or {1, 2, 3}).
 */
export const S3_PERMUTATIONS: PermutationInfo[] = [
  {
    id: "e",
    name: "恒等置换 (e)",
    nameEn: "Identity",
    cycleNotation: "()",
    array: [0, 1, 2],
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    inversions: 0,
    parity: "even",
    det: 1,
    geometricType: "identity",
    geometricDesc: "无变换（保持原始基底与手性）",
  },
  {
    id: "t12",
    name: "对换 (1 2)",
    nameEn: "Transposition (1 2)",
    cycleNotation: "(1 2)",
    array: [1, 0, 2],
    matrix: [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    inversions: 1,
    parity: "odd",
    det: -1,
    geometricType: "reflection",
    geometricDesc: "关于平面 x = y 的镜像反射（手性翻转）",
  },
  {
    id: "t13",
    name: "对换 (1 3)",
    nameEn: "Transposition (1 3)",
    cycleNotation: "(1 3)",
    array: [2, 1, 0],
    matrix: [
      [0, 0, 1],
      [0, 1, 0],
      [1, 0, 0],
    ],
    inversions: 3,
    parity: "odd",
    det: -1,
    geometricType: "reflection",
    geometricDesc: "关于平面 x = z 的镜像反射（手性翻转）",
  },
  {
    id: "t23",
    name: "对换 (2 3)",
    nameEn: "Transposition (2 3)",
    cycleNotation: "(2 3)",
    array: [0, 2, 1],
    matrix: [
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ],
    inversions: 1,
    parity: "odd",
    det: -1,
    geometricType: "reflection",
    geometricDesc: "关于平面 y = z 的镜像反射（手性翻转）",
  },
  {
    id: "c123",
    name: "3-循环 (1 2 3)",
    nameEn: "3-Cycle (1 2 3)",
    cycleNotation: "(1 2 3)",
    array: [1, 2, 0],
    matrix: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    inversions: 2,
    parity: "even",
    det: 1,
    geometricType: "rotation",
    geometricDesc: "绕主对角轴 (1, 1, 1) 逆时针旋转 120°（手性保持）",
  },
  {
    id: "c132",
    name: "3-循环 (1 3 2)",
    nameEn: "3-Cycle (1 3 2)",
    cycleNotation: "(1 3 2)",
    array: [2, 0, 1],
    matrix: [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ],
    inversions: 2,
    parity: "even",
    det: 1,
    geometricType: "rotation",
    geometricDesc: "绕主对角轴 (1, 1, 1) 顺时针旋转 120°（手性保持）",
  },
];

/**
 * Compute the number of inversions in a permutation array.
 */
export function countInversions(p: number[]): number {
  let inv = 0;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      if (p[i] > p[j]) {
        inv++;
      }
    }
  }
  return inv;
}

/**
 * Construct a permutation matrix from a 0-indexed permutation array p.
 * For row replacement: P[i][p[i]] = 1.
 */
export function createPermutationMatrix(p: number[]): number[][] {
  const n = p.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    mat[i][p[i]] = 1;
  }
  return mat;
}

/**
 * Convert 0-indexed permutation array into standard disjoint cycle notation.
 * e.g. [1, 2, 0] -> "(1 2 3)", [1, 0, 2] -> "(1 2)"
 */
export function toCycleNotation(p: number[]): string {
  const visited = new Set<number>();
  const cycles: number[][] = [];

  for (let i = 0; i < p.length; i++) {
    if (visited.has(i)) continue;
    const cycle: number[] = [];
    let curr = i;
    while (!visited.has(curr)) {
      visited.add(curr);
      cycle.push(curr + 1); // 1-based index for human notation
      curr = p[curr];
    }
    if (cycle.length > 1) {
      cycles.push(cycle);
    }
  }

  if (cycles.length === 0) return "()";
  return cycles.map((c) => `(${c.join(" ")})`).join("");
}

/**
 * Multiply 3x3 matrix by 3D vector (column-major m[col][row]).
 */
export function multiplyMat3Vec3(
  m: Matrix3x3,
  v: [number, number, number],
): [number, number, number] {
  return [
    m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
    m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
    m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
  ];
}

/**
 * Multiply two 3x3 matrices.
 */
export function multiplyMat3Mat3(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  return multiplyMatrix3x3(a, b);
}
