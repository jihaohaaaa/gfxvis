import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera } from "three";

export function createControls(
  camera: Camera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  return controls;
}
