import * as THREE from "three";
import { createCamera } from "./camera";
import { createControls } from "./controls";
import { createRenderer } from "./renderer";

export interface Viewer3D {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: ReturnType<typeof createControls>;
  render(): void;
  dispose(): void;
}

/**
 * Shared Three.js viewer: renderer/camera/controls creation, theme-aware clear
 * color, render-on-demand, ResizeObserver (so the scene grows with an expanded
 * interaction area), and full cleanup.
 */
export function createViewer3D(
  container: HTMLElement,
  scene: THREE.Scene,
): Viewer3D {
  const renderer = createRenderer(container);
  const camera = createCamera(container.clientWidth / container.clientHeight);
  const controls = createControls(camera, renderer.domElement);

  const applyClearColor = () => {
    const styles = getComputedStyle(document.documentElement);
    const bg = styles.getPropertyValue("--gfx-bg").trim() || "#ffffff";
    renderer.setClearColor(bg, 1);
  };
  const render = () => renderer.render(scene, camera);

  // OrbitControls with damping applies motion only inside update(), so keep a
  // rAF loop: without it wheel zoom / middle dolly / rotate / pan never move.
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  applyClearColor();
  loop();

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    render();
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  const themeObserver = new MutationObserver(() => {
    applyClearColor();
    render();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return {
    renderer,
    camera,
    controls,
    render,
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
