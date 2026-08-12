import {
  BufferGeometry,
  DoubleSide,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/axes3d";
import { mathToWorld } from "../../core/coords";
import {
  addGroundGrid,
  addStandardLights,
  applySurfaceTransparency,
  createMarker,
  createSurfaceMaterial,
  disposeObject,
} from "../../core/three-utils";
import { buildSurfaceGeometry, DOMAIN, SURFACE_FN } from "./surface";

export type FixMode = "x" | "y";

export interface PartialDerivScene {
  scene: Scene;
  slicePlane: Mesh;
  marker: Mesh;
  setState(mode: FixMode, fixed: number, free: number): void;
  setAxesVisible(visible: boolean): void;
  setSurfaceTransparent(transparent: boolean): void;
  dispose(): void;
}

const SLICE_STEP = 0.04;
const LIFT = 0.02;

/**
 * 3D partial-derivative demo: pick a fixed variable (x or y), show the slicing
 * plane and the slice curve on the surface; the marker slides along the curve
 * and the tangent slope equals the partial derivative.
 */
export function createPartialDerivScene(): PartialDerivScene {
  const scene = new Scene();

  addStandardLights(scene);
  addGroundGrid(scene, 2 * DOMAIN);

  // Math axes (x red, y green, z blue) via mathToWorld; toggleable.
  const axesGroup = createAxesGroup(3);
  scene.add(axesGroup);

  const surfaceMaterial = createSurfaceMaterial();
  const surface = new Mesh(buildSurfaceGeometry(96), surfaceMaterial);
  scene.add(surface);

  const slicePlane = new Mesh(
    new PlaneGeometry(2 * DOMAIN, 5.6),
    new MeshBasicMaterial({
      color: 0x4cc2ff,
      transparent: true,
      opacity: 0.32,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  slicePlane.renderOrder = 1;
  scene.add(slicePlane);

  const sliceCurve = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xfacc15 }),
  );
  const tangentLine = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0x22d3ee }),
  );
  scene.add(sliceCurve, tangentLine);

  const marker = createMarker(0xff6b6b, 0.09);
  marker.renderOrder = 2;
  scene.add(marker);

  let current = { mode: "x" as FixMode, fixed: 0.5, free: 0.8 };

  function update(): void {
    const { mode, fixed, free } = current;
    const points: Vector3[] = [];
    let markerPos: Vector3;
    let tangentDir: Vector3;
    if (mode === "x") {
      slicePlane.position.set(fixed, 0, 0);
      slicePlane.rotation.set(0, Math.PI / 2, 0);
      for (let y = -DOMAIN; y <= DOMAIN + 1e-9; y += SLICE_STEP) {
        const [wx, wy, wz] = mathToWorld(fixed, y, SURFACE_FN.f(fixed, y));
        points.push(new Vector3(wx, wy + LIFT, wz));
      }
      const [mx, my, mz] = mathToWorld(fixed, free, SURFACE_FN.f(fixed, free));
      markerPos = new Vector3(mx, my + LIFT, mz);
      const slope = SURFACE_FN.fy(fixed, free);
      const [tx, ty, tz] = mathToWorld(0, 1, slope);
      tangentDir = new Vector3(tx, ty, tz).normalize();
    } else {
      slicePlane.position.set(0, 0, -fixed);
      slicePlane.rotation.set(0, 0, 0);
      for (let x = -DOMAIN; x <= DOMAIN + 1e-9; x += SLICE_STEP) {
        const [wx, wy, wz] = mathToWorld(x, fixed, SURFACE_FN.f(x, fixed));
        points.push(new Vector3(wx, wy + LIFT, wz));
      }
      const [mx, my, mz] = mathToWorld(free, fixed, SURFACE_FN.f(free, fixed));
      markerPos = new Vector3(mx, my + LIFT, mz);
      const slope = SURFACE_FN.fx(free, fixed);
      const [tx, ty, tz] = mathToWorld(1, 0, slope);
      tangentDir = new Vector3(tx, ty, tz).normalize();
    }

    sliceCurve.geometry.setFromPoints(points);
    marker.position.copy(markerPos);
    const half = 0.9;
    tangentLine.geometry.setFromPoints([
      markerPos.clone().addScaledVector(tangentDir, -half),
      markerPos.clone().addScaledVector(tangentDir, half),
    ]);
  }

  function setState(mode: FixMode, fixed: number, free: number): void {
    current = { mode, fixed, free };
    update();
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function setSurfaceTransparent(transparent: boolean): void {
    applySurfaceTransparency(surfaceMaterial, transparent);
  }

  function dispose(): void {
    disposeObject(scene);
  }

  update();
  return {
    scene,
    slicePlane,
    marker,
    setState,
    setAxesVisible,
    setSurfaceTransparent,
    dispose,
  };
}
