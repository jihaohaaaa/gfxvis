import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { clamp } from "../../visualizations/core/math";
import { attachDrag3D } from "../../visualizations/core/drag3d";
import { createViewer3D } from "../../visualizations/core/viewer3d";
import {
  DOMAIN,
  SURFACE_FN,
} from "../../visualizations/demos/bivariate/surface";
import {
  createPartialDerivScene,
  type FixMode,
} from "../../visualizations/demos/bivariate/partials";
import InlineMath from "./InlineMath";
import AxesToggle from "./AxesToggle";
import ExpandableDemo from "./ExpandableDemo";

export default function PartialDerivativesDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createPartialDerivScene> | null>(
    null,
  );
  const viewerRef = useRef<ReturnType<typeof createViewer3D> | null>(null);
  const modeRef = useRef<FixMode>("x");
  const fixedRef = useRef(0.5);
  const gestureRef = useRef<"marker" | "plane" | null>(null);
  const grabYRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const [mode, setMode] = useState<FixMode>("x");
  const [fixed, setFixed] = useState(0.5);
  const [free, setFree] = useState(0.8);
  const [showAxes, setShowAxes] = useState(true);
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);
  modeRef.current = mode;
  fixedRef.current = fixed;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createPartialDerivScene();
    const viewer = createViewer3D(container, api.scene);
    sceneRef.current = api;
    viewerRef.current = viewer;
    api.setState(mode, fixed, free);
    api.setAxesVisible(showAxes);
    viewer.render();

    const detach = attachDrag3D({
      domElement: viewer.renderer.domElement,
      camera: viewer.camera,
      controls: viewer.controls,
      targets: [api.slicePlane, api.marker],
      onDragStart(hit) {
        if (hit.object === api.marker) {
          gestureRef.current = "marker";
        } else {
          gestureRef.current = "plane";
          grabYRef.current = hit.point.y;
        }
      },
      onDrag(hit, event) {
        if (gestureRef.current === "marker") {
          // Follow the pointer along the slicing plane (world x = fixed, or
          // world z = -fixed), so the marker tracks even on fast drags instead
          // of depending on hitting the small sphere.
          const rect = viewer.renderer.domElement.getBoundingClientRect();
          const ndc = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycasterRef.current.setFromCamera(ndc, viewer.camera);
          const slice = new THREE.Plane(
            modeRef.current === "x"
              ? new THREE.Vector3(1, 0, 0)
              : new THREE.Vector3(0, 0, 1),
            modeRef.current === "x" ? -fixedRef.current : fixedRef.current,
          );
          const world = new THREE.Vector3();
          if (raycasterRef.current.ray.intersectPlane(slice, world)) {
            // Invert mathToWorld: math x = world x, math y = -world z.
            const value = modeRef.current === "x" ? -world.z : world.x;
            setFree(clamp(value, -DOMAIN, DOMAIN));
          }
          return;
        }
        if (gestureRef.current !== "plane") return;
        // Plane drag: intersect the pointer ray with a horizontal plane at the
        // grab height, so the fixed coordinate follows the pointer even though
        // the slicing plane itself stays at the (moving) fixed coordinate.
        const rect = viewer.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycasterRef.current.setFromCamera(ndc, viewer.camera);
        const ground = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -grabYRef.current,
        );
        const world = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(ground, world)) {
          const value = modeRef.current === "x" ? world.x : -world.z;
          setFixed(clamp(value, -DOMAIN, DOMAIN));
        }
      },
    });

    return () => {
      detach();
      viewer.dispose();
      api.dispose();
    };
  }, []);

  useEffect(() => {
    const api = sceneRef.current;
    const viewer = viewerRef.current;
    if (!api || !viewer) return;
    api.setState(mode, fixed, free);
    api.setAxesVisible(showAxes);
    api.setSurfaceTransparent(surfaceTransparent);
    viewer.render();
  }, [mode, fixed, free, showAxes, surfaceTransparent]);

  const value = SURFACE_FN.f(fixed, free);
  const slope =
    mode === "x" ? SURFACE_FN.fy(fixed, free) : SURFACE_FN.fx(free, fixed);

  return (
    <ExpandableDemo>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">固定:</span>
            {(["x", "y"] as FixMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={
                  mode === option
                    ? "rounded-full border border-accent px-3 py-1 text-accent"
                    : "rounded-full border border-border px-3 py-1 text-muted hover:text-ink"
                }
              >
                固定 {option}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={surfaceTransparent}
              onChange={(event) => setSurfaceTransparent(event.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            曲面透明
          </label>
          <AxesToggle checked={showAxes} onChange={setShowAxes} />
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          <p>
            <InlineMath
              tex={`f(${fixed.toFixed(2)}, ${free.toFixed(2)}) = ${value.toFixed(3)}`}
            />
          </p>
          {mode === "x" ? (
            <p>
              <InlineMath
                tex={`\\frac{\\partial f}{\\partial y}(${fixed.toFixed(2)}, ${free.toFixed(2)}) = ${slope.toFixed(3)}`}
              />
            </p>
          ) : (
            <p>
              <InlineMath
                tex={`\\frac{\\partial f}{\\partial x}(${free.toFixed(2)}, ${fixed.toFixed(2)}) = ${slope.toFixed(3)}`}
              />
            </p>
          )}
          <p>
            自由变量{" "}
            <InlineMath
              tex={`${mode === "x" ? "y" : "x"} = ${free.toFixed(2)}`}
            />
          </p>
        </div>
        <p className="text-xs text-muted">
          拖拽蓝色切片平面改变固定值,拖拽红色圆点沿切片曲线移动(青色为切线);曲面默认半透明便于观察切片曲线与切线。
          左键/中键旋转 · 滚轮缩放 · 右键平移。
        </p>
      </div>
    </ExpandableDemo>
  );
}
