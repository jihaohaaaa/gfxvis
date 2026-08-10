import { PerspectiveCamera } from "three";

export function createCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(3, 2.5, 4);
  camera.lookAt(0, 0, 0);
  return camera;
}
