import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mathToWorld } from "./coords";
import { clamp } from "../common/math";
import { disposeObject } from "./three-utils";
import {
  computeFadeOpacity,
  FADE_DELAY_MS,
  FADE_DURATION_MS,
} from "../common/interaction";

export type Gizmo3DHandleType =
  | "center"
  | "axis_x"
  | "axis_y"
  | "axis_z"
  | "plane_xy"
  | "plane_xz"
  | "plane_yz";

export interface PlaneBounds3D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin?: number;
  zMax?: number;
}

export interface TransformGizmo3D {
  group: THREE.Group;
  setPosition(x: number, y: number, z: number): void;
  setOpacity(opacity: number): void;
  setActiveHandle(handle: Gizmo3DHandleType | null): void;
  dispose(): void;
}

export interface AttachGizmo3DOptions {
  domElement: HTMLElement;
  camera: THREE.Camera;
  controls: OrbitControls;
  gizmo: TransformGizmo3D;
  getPosition: () => { x: number; y: number; z: number };
  onPositionChange: (pos: { x: number; y: number; z: number }) => void;
  bounds?: PlaneBounds3D;
  surfaceFunc?: (x: number, y: number) => number;
  fadeDelayMs?: number;
  fadeDurationMs?: number;
  render: () => void;
}

export interface CreateTransformGizmo3DOptions {
  initialPos?: { x: number; y: number; z: number };
  mode?: "volume" | "surface";
}

/**
 * Creates a standard 3D Transform Translation Gizmo:
 * - "volume" mode: Center Sphere + 3 Axis Arrows (X/Y/Z) + 3 Plane Squares (XY/XZ/YZ)
 * - "surface" mode: Center Sphere + 2 Axis Arrows (X/Y) + 1 Plane Square (XY)
 */
export function createTransformGizmo3D(
  optionsOrPos:
    { x: number; y: number; z: number } | CreateTransformGizmo3DOptions = {
    x: 0,
    y: 0,
    z: 0,
  },
): {
  gizmo: TransformGizmo3D;
  handleObjects: THREE.Object3D[];
} {
  const isPos = "x" in optionsOrPos;
  const initialPos = isPos
    ? optionsOrPos
    : (optionsOrPos.initialPos ?? { x: 0, y: 0, z: 0 });
  const mode = isPos ? "volume" : (optionsOrPos.mode ?? "volume");
  const isSurface = mode === "surface";

  const group = new THREE.Group();
  const handleObjects: THREE.Object3D[] = [];

  // Track root position
  const [wx, wy, wz] = mathToWorld(initialPos.x, initialPos.y, initialPos.z);
  group.position.set(wx, wy, wz);

  const registerHandle = (
    obj: THREE.Object3D,
    handleType: Gizmo3DHandleType,
  ) => {
    obj.userData = { handleType };
    handleObjects.push(obj);
  };

  // 1. Center Sphere (Free 3D / Screen-Plane Drag) - Permanently visible
  const centerGeom = new THREE.SphereGeometry(0.12, 20, 20);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.1,
  });
  const centerMesh = new THREE.Mesh(centerGeom, centerMat);
  registerHandle(centerMesh, "center");
  group.add(centerMesh);

  // Invisible larger hit sphere for center
  const centerHitGeom = new THREE.SphereGeometry(0.22, 12, 12);
  const centerHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const centerHitMesh = new THREE.Mesh(centerHitGeom, centerHitMat);
  registerHandle(centerHitMesh, "center");
  group.add(centerHitMesh);

  // Overlay Group containing axis arrows and plane quads (fades in on hover, out on leave)
  const overlayGroup = new THREE.Group();
  group.add(overlayGroup);

  // Track handle definitions for brightness modulation
  const arrowHandles: Array<{
    type: Gizmo3DHandleType;
    group: THREE.Group;
    mat: THREE.MeshStandardMaterial;
    baseColor: number;
  }> = [];

  const planeHandles: Array<{
    type: Gizmo3DHandleType;
    quadMat: THREE.MeshBasicMaterial;
    lineMat: THREE.LineBasicMaterial;
    baseColor: number;
  }> = [];

  // Helper to build 3D Arrow (Cylinder shaft + Cone tip)
  const buildArrow = (
    color: number,
    dir: THREE.Vector3,
    handleType: Gizmo3DHandleType,
  ) => {
    const arrowGroup = new THREE.Group();
    const shaftLen = 0.55;
    const shaftRadius = 0.022;
    const headLen = 0.2;
    const headRadius = 0.065;

    const shaftGeom = new THREE.CylinderGeometry(
      shaftRadius,
      shaftRadius,
      shaftLen,
      12,
    );
    shaftGeom.translate(0, shaftLen / 2 + 0.1, 0);

    const headGeom = new THREE.ConeGeometry(headRadius, headLen, 16);
    headGeom.translate(0, shaftLen + headLen / 2 + 0.1, 0);

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      transparent: true,
    });

    const shaft = new THREE.Mesh(shaftGeom, mat);
    const head = new THREE.Mesh(headGeom, mat);
    arrowGroup.add(shaft);
    arrowGroup.add(head);

    // Large hit corridor
    const hitGeom = new THREE.CylinderGeometry(
      0.09,
      0.09,
      shaftLen + headLen,
      8,
    );
    hitGeom.translate(0, (shaftLen + headLen) / 2 + 0.1, 0);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeom, hitMat);
    arrowGroup.add(hitMesh);

    // Orient arrow along direction
    const defaultDir = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      defaultDir,
      dir.clone().normalize(),
    );
    arrowGroup.quaternion.copy(quat);

    registerHandle(shaft, handleType);
    registerHandle(head, handleType);
    registerHandle(hitMesh, handleType);
    overlayGroup.add(arrowGroup);

    arrowHandles.push({
      type: handleType,
      group: arrowGroup,
      mat,
      baseColor: color,
    });
  };

  // Math X -> World (+1, 0, 0)
  buildArrow(0xef4444, new THREE.Vector3(1, 0, 0), "axis_x");
  // Math Y -> World (0, 0, -1)
  buildArrow(0x10b981, new THREE.Vector3(0, 0, -1), "axis_y");
  // Math Z -> World (0, 1, 0) (Only for volume mode)
  if (!isSurface) {
    buildArrow(0x3b82f6, new THREE.Vector3(0, 1, 0), "axis_z");
  }

  // Helper to build 2D Plane Drag Square (offset quad with border)
  const buildPlaneQuad = (
    color: number,
    uDir: THREE.Vector3,
    vDir: THREE.Vector3,
    handleType: Gizmo3DHandleType,
  ) => {
    const size = 0.28;
    const offset = 0.16;

    // 4 Corners of quad in world space
    const p0 = uDir
      .clone()
      .multiplyScalar(offset)
      .add(vDir.clone().multiplyScalar(offset));
    const p1 = uDir
      .clone()
      .multiplyScalar(offset + size)
      .add(vDir.clone().multiplyScalar(offset));
    const p2 = uDir
      .clone()
      .multiplyScalar(offset + size)
      .add(vDir.clone().multiplyScalar(offset + size));
    const p3 = uDir
      .clone()
      .multiplyScalar(offset)
      .add(vDir.clone().multiplyScalar(offset + size));

    const quadGeom = new THREE.BufferGeometry();
    const positions = new Float32Array([
      p0.x,
      p0.y,
      p0.z,
      p1.x,
      p1.y,
      p1.z,
      p2.x,
      p2.y,
      p2.z,
      p0.x,
      p0.y,
      p0.z,
      p2.x,
      p2.y,
      p2.z,
      p3.x,
      p3.y,
      p3.z,
    ]);
    quadGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    quadGeom.computeVertexNormals();

    const quadMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const quadMesh = new THREE.Mesh(quadGeom, quadMat);

    // Outline border
    const lineGeom = new THREE.BufferGeometry();
    const linePos = new Float32Array([
      p0.x,
      p0.y,
      p0.z,
      p1.x,
      p1.y,
      p1.z,
      p1.x,
      p1.y,
      p1.z,
      p2.x,
      p2.y,
      p2.z,
      p2.x,
      p2.y,
      p2.z,
      p3.x,
      p3.y,
      p3.z,
      p3.x,
      p3.y,
      p3.z,
      p0.x,
      p0.y,
      p0.z,
    ]);
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      linewidth: 1.5,
    });
    const lineMesh = new THREE.LineSegments(lineGeom, lineMat);

    registerHandle(quadMesh, handleType);
    overlayGroup.add(quadMesh);
    overlayGroup.add(lineMesh);

    planeHandles.push({
      type: handleType,
      quadMat,
      lineMat,
      baseColor: color,
    });
  };

  // Math XY Plane: Math X (World +X) & Math Y (World -Z)
  buildPlaneQuad(
    0x06b6d4,
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
    "plane_xy",
  );
  // Math XZ and YZ Planes (Only for volume mode)
  if (!isSurface) {
    buildPlaneQuad(
      0x10b981,
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      "plane_xz",
    );
    buildPlaneQuad(
      0xef4444,
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 1, 0),
      "plane_yz",
    );
  }

  let currentOpacity = 1.0;
  let currentActiveHandle: Gizmo3DHandleType | null = null;

  const updateHandleVisuals = () => {
    const alpha = currentOpacity;
    const h = currentActiveHandle;

    // Center handle highlight
    if (h === "center") {
      centerMat.emissive.setHex(0xfef08a);
      centerMat.emissiveIntensity = 1.0;
      centerMesh.scale.setScalar(1.2);
    } else if (h !== null) {
      centerMat.emissive.setHex(0xd97706);
      centerMat.emissiveIntensity = 0.35;
      centerMesh.scale.setScalar(1.0);
    } else {
      centerMat.emissive.setHex(0xd97706);
      centerMat.emissiveIntensity = 0.6;
      centerMesh.scale.setScalar(1.0);
    }

    // Axis Arrows
    for (const a of arrowHandles) {
      const isMatch = h === a.type;
      if (isMatch) {
        a.mat.opacity = 1.0;
        a.mat.emissive.setHex(0xfacc15);
        a.mat.emissiveIntensity = 1.0;
        a.group.scale.setScalar(1.15);
      } else if (h !== null) {
        a.mat.opacity = 0.4 * alpha;
        a.mat.emissive.setHex(a.baseColor);
        a.mat.emissiveIntensity = 0.15;
        a.group.scale.setScalar(1.0);
      } else {
        a.mat.opacity = alpha;
        a.mat.emissive.setHex(a.baseColor);
        a.mat.emissiveIntensity = 0.4;
        a.group.scale.setScalar(1.0);
      }
    }

    // Plane Quads
    for (const p of planeHandles) {
      const isMatch = h === p.type;
      if (isMatch) {
        p.quadMat.color.setHex(0xfacc15);
        p.quadMat.opacity = 0.8;
        p.lineMat.color.setHex(0xfef08a);
        p.lineMat.opacity = 1.0;
      } else if (h !== null) {
        p.quadMat.color.setHex(p.baseColor);
        p.quadMat.opacity = 0.12 * alpha;
        p.lineMat.color.setHex(p.baseColor);
        p.lineMat.opacity = 0.3 * alpha;
      } else {
        p.quadMat.color.setHex(p.baseColor);
        p.quadMat.opacity = 0.35 * alpha;
        p.lineMat.color.setHex(p.baseColor);
        p.lineMat.opacity = 0.8 * alpha;
      }
    }
  };

  const setPosition = (x: number, y: number, z: number) => {
    const [wX, wY, wZ] = mathToWorld(x, y, z);
    group.position.set(wX, wY, wZ);
  };

  const setOpacity = (op: number) => {
    currentOpacity = Math.max(0, Math.min(1, op));
    overlayGroup.visible = currentOpacity > 0.001;
    updateHandleVisuals();
  };

  const setActiveHandle = (handle: Gizmo3DHandleType | null) => {
    if (currentActiveHandle !== handle) {
      currentActiveHandle = handle;
      updateHandleVisuals();
    }
  };

  const dispose = () => {
    disposeObject(group);
    centerMat.dispose();
    centerHitMat.dispose();
    for (const a of arrowHandles) {
      a.mat.dispose();
    }
    for (const p of planeHandles) {
      p.quadMat.dispose();
      p.lineMat.dispose();
    }
  };

  return {
    gizmo: {
      group,
      setPosition,
      setOpacity,
      setActiveHandle,
      dispose,
    },
    handleObjects,
  };
}

/**
 * Attaches interactive raycasting and zero-jump constrained dragging to the 3D Transform Gizmo
 * with 1.2s delay + 0.5s RAF smooth fade out.
 */
export function attachGizmo3D(options: AttachGizmo3DOptions): () => void {
  const {
    domElement,
    camera,
    controls,
    gizmo,
    getPosition,
    onPositionChange,
    bounds,
    surfaceFunc,
    fadeDelayMs = FADE_DELAY_MS,
    fadeDurationMs = FADE_DURATION_MS,
    render,
  } = options;

  let activeHandle: Gizmo3DHandleType | null = null;
  let isHovered = false;
  let opacity = 1.0;
  let lastActiveTime = performance.now();
  let rafId: number | null = null;

  const dragPlane = new THREE.Plane();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const planeIntersection = new THREE.Vector3();

  // Drag start snapshots for zero-jump relative displacement
  let dragStartPos = { x: 0, y: 0, z: 0 };
  const dragStartWorldHit = new THREE.Vector3();

  const setPointer = (e: PointerEvent) => {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const startFadeLoop = () => {
    if (rafId !== null) return;

    const tick = () => {
      const now = performance.now();
      let hasAnimating = false;

      if (isHovered || activeHandle !== null) {
        opacity = 1.0;
      } else if (opacity > 0.001) {
        const elapsed = now - lastActiveTime;
        opacity = computeFadeOpacity(elapsed, fadeDelayMs, fadeDurationMs);
        if (opacity > 0.001) {
          hasAnimating = true;
        }
      }

      gizmo.setOpacity(opacity);
      render();

      if (hasAnimating) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(tick);
  };

  const pickHandle = (
    e: PointerEvent,
  ): { handle: Gizmo3DHandleType; hit: THREE.Intersection } | null => {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(gizmo.group.children, true);
    for (const h of hits) {
      let cur: THREE.Object3D | null = h.object;
      while (cur && cur !== gizmo.group) {
        if (cur.userData?.handleType) {
          return {
            handle: cur.userData.handleType as Gizmo3DHandleType,
            hit: h,
          };
        }
        cur = cur.parent;
      }
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const res = pickHandle(e);
    if (!res) return;

    activeHandle = res.handle;
    gizmo.setActiveHandle(activeHandle);
    controls.enabled = false;
    domElement.setPointerCapture(e.pointerId);
    domElement.style.cursor = "grabbing";

    dragStartPos = { ...getPosition() };
    const [wx, wy, wz] = mathToWorld(
      dragStartPos.x,
      dragStartPos.y,
      dragStartPos.z,
    );
    const rootWorldPos = new THREE.Vector3(wx, wy, wz);

    // Setup appropriate drag plane based on handle type
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir).negate();

    if (activeHandle === "center") {
      dragPlane.setFromNormalAndCoplanarPoint(cameraDir, rootWorldPos);
    } else if (activeHandle === "axis_x") {
      // Line along world X (+1, 0, 0): project plane perpendicular to camera that contains line
      const normal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(1, 0, 0), cameraDir)
        .cross(new THREE.Vector3(1, 0, 0))
        .normalize();
      dragPlane.setFromNormalAndCoplanarPoint(
        normal.lengthSq() > 0.01 ? normal : cameraDir,
        rootWorldPos,
      );
    } else if (activeHandle === "axis_y") {
      // Line along world -Z (0, 0, -1)
      const normal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 0, -1), cameraDir)
        .cross(new THREE.Vector3(0, 0, -1))
        .normalize();
      dragPlane.setFromNormalAndCoplanarPoint(
        normal.lengthSq() > 0.01 ? normal : cameraDir,
        rootWorldPos,
      );
    } else if (activeHandle === "axis_z") {
      // Line along world +Y (0, 1, 0)
      const normal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), cameraDir)
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize();
      dragPlane.setFromNormalAndCoplanarPoint(
        normal.lengthSq() > 0.01 ? normal : cameraDir,
        rootWorldPos,
      );
    } else if (activeHandle === "plane_xy") {
      // Math XY plane: World Y = wy
      dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        rootWorldPos,
      );
    } else if (activeHandle === "plane_xz") {
      // Math XZ plane: World Z = wz
      dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1),
        rootWorldPos,
      );
    } else if (activeHandle === "plane_yz") {
      // Math YZ plane: World X = wx
      dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(1, 0, 0),
        rootWorldPos,
      );
    }

    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
      dragStartWorldHit.copy(planeIntersection);
    } else {
      dragStartWorldHit.copy(rootWorldPos);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (activeHandle !== null) {
      setPointer(e);
      raycaster.setFromCamera(pointer, camera);

      if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
        const deltaWorld = planeIntersection.clone().sub(dragStartWorldHit);
        // Math coords: deltaMath = (deltaWorld.x, -deltaWorld.z, deltaWorld.y)
        const nextPos = { ...dragStartPos };

        if (activeHandle === "center") {
          nextPos.x = dragStartPos.x + deltaWorld.x;
          nextPos.y = dragStartPos.y - deltaWorld.z;
          if (!surfaceFunc) {
            nextPos.z = dragStartPos.z + deltaWorld.y;
          }
        } else if (activeHandle === "axis_x") {
          nextPos.x = dragStartPos.x + deltaWorld.x;
        } else if (activeHandle === "axis_y") {
          nextPos.y = dragStartPos.y - deltaWorld.z;
        } else if (activeHandle === "axis_z") {
          nextPos.z = dragStartPos.z + deltaWorld.y;
        } else if (activeHandle === "plane_xy") {
          nextPos.x = dragStartPos.x + deltaWorld.x;
          nextPos.y = dragStartPos.y - deltaWorld.z;
        } else if (activeHandle === "plane_xz") {
          nextPos.x = dragStartPos.x + deltaWorld.x;
          nextPos.z = dragStartPos.z + deltaWorld.y;
        } else if (activeHandle === "plane_yz") {
          nextPos.y = dragStartPos.y - deltaWorld.z;
          nextPos.z = dragStartPos.z + deltaWorld.y;
        }

        if (bounds) {
          nextPos.x = clamp(nextPos.x, bounds.xMin, bounds.xMax);
          nextPos.y = clamp(nextPos.y, bounds.yMin, bounds.yMax);
          if (bounds.zMin !== undefined && bounds.zMax !== undefined) {
            nextPos.z = clamp(nextPos.z, bounds.zMin, bounds.zMax);
          }
        }

        if (surfaceFunc) {
          nextPos.z = surfaceFunc(nextPos.x, nextPos.y);
        }

        onPositionChange(nextPos);
        gizmo.setPosition(nextPos.x, nextPos.y, nextPos.z);
        render();
      }
      return;
    }

    if (e.buttons === 0) {
      const res = pickHandle(e);
      const wasHovered = isHovered;
      isHovered = res !== null;
      domElement.style.cursor = isHovered ? "grab" : "";
      gizmo.setActiveHandle(res ? res.handle : null);

      if (isHovered) {
        opacity = 1.0;
        lastActiveTime = performance.now();
        gizmo.setOpacity(1.0);
        render();
      } else if (wasHovered) {
        lastActiveTime = performance.now();
        render();
      }
      startFadeLoop();
    }
  };

  const onPointerUp = () => {
    if (activeHandle !== null) {
      activeHandle = null;
      controls.enabled = true;
      lastActiveTime = performance.now();
      domElement.style.cursor = isHovered ? "grab" : "";
      gizmo.setActiveHandle(null);
      render();
      startFadeLoop();
    }
  };

  const onPointerLeave = () => {
    if (activeHandle === null && isHovered) {
      isHovered = false;
      lastActiveTime = performance.now();
      gizmo.setActiveHandle(null);
      render();
      startFadeLoop();
    }
  };

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerleave", onPointerLeave);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);

  gizmo.setOpacity(1.0);
  render();

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    domElement.removeEventListener("pointerdown", onPointerDown);
    domElement.removeEventListener("pointermove", onPointerMove);
    domElement.removeEventListener("pointerleave", onPointerLeave);
    domElement.removeEventListener("pointerup", onPointerUp);
    domElement.removeEventListener("pointercancel", onPointerUp);
  };
}
