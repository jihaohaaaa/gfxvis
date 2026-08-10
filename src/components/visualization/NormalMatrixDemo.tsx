import { useEffect, useRef } from "react";
import { createCamera } from "../../visualizations/core/camera";
import { createControls } from "../../visualizations/core/controls";
import { createRenderer } from "../../visualizations/core/renderer";
import { createNormalMatrixScene } from "../../visualizations/demos/normal-matrix/createScene";

export default function NormalMatrixDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = createRenderer(container);
    const camera = createCamera(container.clientWidth / container.clientHeight);
    const controls = createControls(camera, renderer.domElement);
    const { scene, update, dispose } = createNormalMatrixScene();

    let elapsed = 0;
    let last = performance.now();
    let frame = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      elapsed += (now - last) / 1000;
      last = now;
      update(elapsed);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-xl border border-border bg-surface"
    />
  );
}
