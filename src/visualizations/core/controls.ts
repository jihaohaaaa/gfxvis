import { MOUSE } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera } from "three";

/** Unified OrbitControls settings so all 3D demos feel identical. */
export function createControls(
  camera: Camera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 40;
  controls.zoomSpeed = 1;
  controls.panSpeed = 0.8;
  controls.screenSpacePanning = true;
  // Left or middle drag rotates; right drag pans; wheel zooms.
  controls.mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.ROTATE,
    RIGHT: MOUSE.PAN,
  };
  return controls;
}
