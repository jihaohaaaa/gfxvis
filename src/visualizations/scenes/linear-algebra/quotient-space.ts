import {
  Scene,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  RingGeometry,
  Line,
  LineSegments,
  LineBasicMaterial,
  LineDashedMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  DoubleSide,
} from "three";
import { createAxesGroup } from "../../core/3d/axes3d";
import { mathToWorld } from "../../core/3d/coords";
import {
  addGroundGrid,
  addStandardLights,
  disposeObject,
} from "../../core/3d/three-utils";
import {
  createTransformGizmo3D,
  type TransformGizmo3D,
} from "../../core/3d/gizmo3d";

export type QuotientMode = "line" | "plane";

export interface QuotientSpaceScene {
  scene: Scene;
  gizmo: TransformGizmo3D;
  setMode(mode: QuotientMode): void;
  setDirection(thetaDeg: number, phiDeg: number): void;
  setVector(x: number, y: number, z: number): void;
  setCollapse(t: number): void;
  setAxesVisible(visible: boolean): void;
  getPointWorldPos(): Vector3;
  getQuotientWorldPos(): Vector3;
  getOrthogonalDecomposition(): {
    u: [number, number, number];
    parallel: [number, number, number];
    perp: [number, number, number];
  };
  dispose(): void;
}

/** Compute an orthonormal basis in math coordinates { u, e1, e2 } */
function computeOrthonormalBasis(dir: Vector3): {
  u: Vector3;
  e1: Vector3;
  e2: Vector3;
} {
  const u = dir.clone().normalize();
  let ref = new Vector3(0, 0, 1);
  if (Math.abs(u.dot(ref)) > 0.92) {
    ref = new Vector3(1, 0, 0);
  }
  const e1 = new Vector3().crossVectors(u, ref).normalize();
  const e2 = new Vector3().crossVectors(u, e1).normalize();
  return { u, e1, e2 };
}

/** Convert math vector to world Vector3 */
function toWorldVec(m: Vector3): Vector3 {
  const [x, y, z] = mathToWorld(m.x, m.y, m.z);
  return new Vector3(x, y, z);
}

export function createQuotientSpaceScene(): QuotientSpaceScene {
  const scene = new Scene();
  addStandardLights(scene);
  addGroundGrid(scene, 7, 14);

  const axesGroup = createAxesGroup(3.2);
  scene.add(axesGroup);

  let currentMode: QuotientMode = "line";
  let curX = 1.4;
  let curY = 1.0;
  let curZ = 1.5;
  let collapseT = 0; // 0 = 3D original, 1 = quotient space
  let azimuthDeg = 45;
  let elevationDeg = 35;

  const { gizmo } = createTransformGizmo3D({
    initialPos: { x: curX, y: curY, z: curZ },
    mode: "volume",
  });
  scene.add(gizmo.group);

  // Dynamic root groups
  const dynamicGroup = new Group();
  scene.add(dynamicGroup);

  const subspaceGroup = new Group();
  const quotientSpaceGroup = new Group();
  const fiberBundleGroup = new Group();
  const activeCosetGroup = new Group();
  dynamicGroup.add(subspaceGroup);
  dynamicGroup.add(quotientSpaceGroup);
  dynamicGroup.add(fiberBundleGroup);
  dynamicGroup.add(activeCosetGroup);

  // Materials
  const subspaceLineMat = new LineBasicMaterial({
    color: 0x06b6d4, // Cyan
    linewidth: 3,
  });
  const subspacePlaneMat = new MeshStandardMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.22,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.5,
  });
  const quotientPlaneMat = new MeshStandardMaterial({
    color: 0x6366f1, // Indigo
    transparent: true,
    opacity: 0.3,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.4,
  });
  const quotientRingMat = new LineBasicMaterial({
    color: 0x818cf8,
    linewidth: 2,
  });
  const quotientLineMat = new LineBasicMaterial({
    color: 0x6366f1,
    linewidth: 3,
  });
  const fiberLineMat = new LineBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.22,
  });
  const fiberPlaneMat = new MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.12,
    side: DoubleSide,
    depthWrite: false,
    wireframe: true,
  });
  const activeCosetLineMat = new LineBasicMaterial({
    color: 0xf59e0b, // Amber
    linewidth: 3,
  });
  const activeCosetPlaneMat = new MeshStandardMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.35,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.4,
  });

  // Vector v sphere
  const pointGeo = new SphereGeometry(0.08, 20, 20);
  const pointMat = new MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const pointMesh = new Mesh(pointGeo, pointMat);
  dynamicGroup.add(pointMesh);

  // Quotient class representative [v] sphere
  const quotientPointGeo = new SphereGeometry(0.09, 20, 20);
  const quotientPointMat = new MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  const quotientPointMesh = new Mesh(quotientPointGeo, quotientPointMat);
  dynamicGroup.add(quotientPointMesh);

  // Connecting dashed line between v(t) and [v]
  const projLineGeo = new BufferGeometry();
  projLineGeo.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
  );
  const projLineMat = new LineDashedMaterial({
    color: 0xf43f5e, // Rose
    dashSize: 0.12,
    gapSize: 0.08,
  });
  const projLine = new Line(projLineGeo, projLineMat);
  dynamicGroup.add(projLine);

  function getDirectionVector(): Vector3 {
    const theta = (azimuthDeg * Math.PI) / 180;
    const phi = (elevationDeg * Math.PI) / 180;
    return new Vector3(
      Math.cos(phi) * Math.cos(theta),
      Math.cos(phi) * Math.sin(theta),
      Math.sin(phi),
    ).normalize();
  }

  function alignMeshWithNormal(mesh: Mesh, mathNormal: Vector3) {
    const wNorm = toWorldVec(mathNormal).normalize();
    const defaultNormal = new Vector3(0, 0, 1);
    mesh.quaternion.setFromUnitVectors(defaultNormal, wNorm);
  }

  // Build static components of subspace and quotient space based on mode & direction
  function rebuildSubspace() {
    // Clean old objects
    while (subspaceGroup.children.length > 0) {
      const obj = subspaceGroup.children[0];
      subspaceGroup.remove(obj);
      disposeObject(obj);
    }
    while (quotientSpaceGroup.children.length > 0) {
      const obj = quotientSpaceGroup.children[0];
      quotientSpaceGroup.remove(obj);
      disposeObject(obj);
    }

    const u = getDirectionVector();

    if (currentMode === "line") {
      // Subspace U is line along u passing through origin
      const lineLen = 3.6;
      const p1 = toWorldVec(u.clone().multiplyScalar(-lineLen));
      const p2 = toWorldVec(u.clone().multiplyScalar(lineLen));
      const uLineGeo = new BufferGeometry().setFromPoints([p1, p2]);
      const uLine = new Line(uLineGeo, subspaceLineMat);
      subspaceGroup.add(uLine);

      // Quotient space is the plane U^perp through origin with normal u
      const radius = 3.2;
      const planeGeo = new CylinderGeometry(radius, radius, 0.01, 32);
      const planeMesh = new Mesh(planeGeo, quotientPlaneMat);
      // Cylinder defaults to oriented along Y in Three.js
      const wU = toWorldVec(u).normalize();
      planeMesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), wU);
      quotientSpaceGroup.add(planeMesh);

      // Border ring on quotient plane
      const ringGeo = new RingGeometry(radius - 0.02, radius + 0.02, 32);
      const ringMesh = new Mesh(ringGeo, quotientRingMat);
      alignMeshWithNormal(ringMesh, u);
      quotientSpaceGroup.add(ringMesh);
    } else {
      // Subspace U is the plane through origin with normal u
      const radius = 3.2;
      const planeGeo = new CylinderGeometry(radius, radius, 0.01, 32);
      const planeMesh = new Mesh(planeGeo, subspacePlaneMat);
      const wU = toWorldVec(u).normalize();
      planeMesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), wU);
      subspaceGroup.add(planeMesh);

      // Quotient space U^perp is the 1D normal line passing through origin
      const lineLen = 3.6;
      const p1 = toWorldVec(u.clone().multiplyScalar(-lineLen));
      const p2 = toWorldVec(u.clone().multiplyScalar(lineLen));
      const qLineGeo = new BufferGeometry().setFromPoints([p1, p2]);
      const qLine = new Line(qLineGeo, quotientLineMat);
      quotientSpaceGroup.add(qLine);
    }
  }

  // Update dynamic elements (fibers, coset, points, gizmo)
  function update() {
    const u = getDirectionVector();
    const v = new Vector3(curX, curY, curZ);

    const scale = 1 - collapseT; // 1 at t=0, 0 at t=1

    // Clear dynamic fibers and active coset
    while (fiberBundleGroup.children.length > 0) {
      const obj = fiberBundleGroup.children[0];
      fiberBundleGroup.remove(obj);
      disposeObject(obj);
    }
    while (activeCosetGroup.children.length > 0) {
      const obj = activeCosetGroup.children[0];
      activeCosetGroup.remove(obj);
      disposeObject(obj);
    }

    if (currentMode === "line") {
      // Orthogonal decomposition:
      // v_|| = (v . u) u
      // v_perp = v - v_||
      const s = v.dot(u);
      const vParallel = u.clone().multiplyScalar(s);
      const vPerp = v.clone().sub(vParallel);

      // Collapsed point: v(t) = (1 - t) v_|| + v_perp
      const vT = vParallel.clone().multiplyScalar(scale).add(vPerp);
      const wVT = toWorldVec(vT);
      pointMesh.position.copy(wVT);
      gizmo.setPosition(curX, curY, curZ);

      // Quotient point [v] = v_perp (strictly on quotient plane U^perp)
      const wVPerp = toWorldVec(vPerp);
      quotientPointMesh.position.copy(wVPerp);

      // Connecting line between v(t) and [v]
      const posAttr = projLine.geometry.attributes
        .position as Float32BufferAttribute;
      posAttr.setXYZ(0, wVT.x, wVT.y, wVT.z);
      posAttr.setXYZ(1, wVPerp.x, wVPerp.y, wVPerp.z);
      posAttr.needsUpdate = true;
      projLine.computeLineDistances();
      projLine.visible = collapseT < 0.98;

      // Active coset line: passing through vPerp along u, length scaled by (1 - t)
      if (scale > 0.02) {
        const halfLen = 2.8 * scale;
        const c1 = toWorldVec(vPerp.clone().addScaledVector(u, -halfLen));
        const c2 = toWorldVec(vPerp.clone().addScaledVector(u, halfLen));
        const activeGeo = new BufferGeometry().setFromPoints([c1, c2]);
        const activeLine = new Line(activeGeo, activeCosetLineMat);
        activeCosetGroup.add(activeLine);
      }

      // Background fibers: grid in U^perp
      if (scale > 0.02) {
        const { e1, e2 } = computeOrthonormalBasis(u);
        const fiberPoints: Vector3[] = [];
        const halfLen = 2.4 * scale;
        const steps = [-1.6, -0.8, 0, 0.8, 1.6];
        for (const i of steps) {
          for (const j of steps) {
            // Base point in U^perp
            const base = e1.clone().multiplyScalar(i).addScaledVector(e2, j);
            const p1 = toWorldVec(base.clone().addScaledVector(u, -halfLen));
            const p2 = toWorldVec(base.clone().addScaledVector(u, halfLen));
            fiberPoints.push(p1, p2);
          }
        }
        const fibersGeo = new BufferGeometry().setFromPoints(fiberPoints);
        const fibers = new LineSegments(fibersGeo, fiberLineMat);
        fiberBundleGroup.add(fibers);
      }
    } else {
      // 2D Plane Mode (U is normal to u)
      // v_perp = (v . u) u in U^perp
      // v_|| = v - v_perp in U
      const h = v.dot(u);
      const vPerp = u.clone().multiplyScalar(h);
      const vParallel = v.clone().sub(vPerp);

      // Collapsed point: v(t) = (1 - t) v_|| + v_perp
      const vT = vParallel.clone().multiplyScalar(scale).add(vPerp);
      const wVT = toWorldVec(vT);
      pointMesh.position.copy(wVT);
      gizmo.setPosition(curX, curY, curZ);

      // Quotient point [v] = v_perp (strictly on 1D normal axis U^perp)
      const wVPerp = toWorldVec(vPerp);
      quotientPointMesh.position.copy(wVPerp);

      // Connecting line between v(t) and [v]
      const posAttr = projLine.geometry.attributes
        .position as Float32BufferAttribute;
      posAttr.setXYZ(0, wVT.x, wVT.y, wVT.z);
      posAttr.setXYZ(1, wVPerp.x, wVPerp.y, wVPerp.z);
      posAttr.needsUpdate = true;
      projLine.computeLineDistances();
      projLine.visible = collapseT < 0.98;

      // Active coset plane: centered at vPerp, normal u, radius scaled by (1 - t)
      if (scale > 0.02) {
        const radius = 2.2 * scale;
        const planeGeo = new CylinderGeometry(radius, radius, 0.01, 28);
        const planeMesh = new Mesh(planeGeo, activeCosetPlaneMat);
        const wU = toWorldVec(u).normalize();
        planeMesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), wU);
        planeMesh.position.copy(wVPerp);
        activeCosetGroup.add(planeMesh);
      }

      // Background parallel planes along normal u
      if (scale > 0.02) {
        const heights = [-1.8, -0.9, 0.9, 1.8];
        const radius = 1.8 * scale;
        const wU = toWorldVec(u).normalize();
        for (const ht of heights) {
          const planeGeo = new CylinderGeometry(radius, radius, 0.008, 20);
          const pMesh = new Mesh(planeGeo, fiberPlaneMat);
          pMesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), wU);
          const center = toWorldVec(u.clone().multiplyScalar(ht));
          pMesh.position.copy(center);
          fiberBundleGroup.add(pMesh);
        }
      }
    }
  }

  rebuildSubspace();
  update();

  return {
    scene,
    gizmo,
    setMode(mode: QuotientMode) {
      if (currentMode !== mode) {
        currentMode = mode;
        rebuildSubspace();
        update();
      }
    },
    setDirection(thetaDeg: number, phiDeg: number) {
      azimuthDeg = thetaDeg;
      elevationDeg = phiDeg;
      rebuildSubspace();
      update();
    },
    setVector(x: number, y: number, z: number) {
      curX = x;
      curY = y;
      curZ = z;
      update();
    },
    setCollapse(t: number) {
      collapseT = Math.max(0, Math.min(1, t));
      update();
    },
    setAxesVisible(visible: boolean) {
      axesGroup.visible = visible;
    },
    getPointWorldPos(): Vector3 {
      return pointMesh.position.clone();
    },
    getQuotientWorldPos(): Vector3 {
      return quotientPointMesh.position.clone();
    },
    getOrthogonalDecomposition() {
      const u = getDirectionVector();
      const v = new Vector3(curX, curY, curZ);
      if (currentMode === "line") {
        const s = v.dot(u);
        const vPar = u.clone().multiplyScalar(s);
        const vPerp = v.clone().sub(vPar);
        return {
          u: [u.x, u.y, u.z] as [number, number, number],
          parallel: [vPar.x, vPar.y, vPar.z] as [number, number, number],
          perp: [vPerp.x, vPerp.y, vPerp.z] as [number, number, number],
        };
      } else {
        const h = v.dot(u);
        const vPerp = u.clone().multiplyScalar(h);
        const vPar = v.clone().sub(vPerp);
        return {
          u: [u.x, u.y, u.z] as [number, number, number],
          parallel: [vPar.x, vPar.y, vPar.z] as [number, number, number],
          perp: [vPerp.x, vPerp.y, vPerp.z] as [number, number, number],
        };
      }
    },
    dispose() {
      disposeObject(scene);
    },
  };
}
