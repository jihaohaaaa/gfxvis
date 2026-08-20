import { useRef, useState } from "react";
import * as THREE from "three";
import { clamp } from "@math";
import { attachDrag3D } from "../../visualizations/core/3d/drag3d";
import {
  DOMAIN,
  SURFACE_FN,
} from "../../visualizations/scenes/calculus/bivariate-surface";
import {
  createPartialDerivScene,
  type FixMode,
} from "../../visualizations/scenes/calculus/bivariate-partials";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useViewer3D } from "../framework/useViewer3D";

const MODE_OPTIONS: { id: FixMode; label: string }[] = [
  { id: "x", label: "固定 x" },
  { id: "y", label: "固定 y" },
];

export default function PartialDerivativesDemo({
  height,
}: {
  height?: string;
}) {
  const [mode, setMode] = useState<FixMode>("x");
  const [fixed, setFixed] = useState(0.5);
  const [free, setFree] = useState(0.8);
  const showAxes = true;
  const [surfaceTransparent, setSurfaceTransparent] = useState(true);
  const modeRef = useRef<FixMode>("x");
  const fixedRef = useRef(0.5);
  const gestureRef = useRef<"marker" | "plane" | null>(null);
  const grabYRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  modeRef.current = mode;
  fixedRef.current = fixed;

  const { containerRef } = useViewer3D(
    () => createPartialDerivScene(),
    ({ api, viewer }) => {
      api.setState(mode, fixed, free);
      api.setAxesVisible(showAxes);
      api.setSurfaceTransparent(surfaceTransparent);

      return attachDrag3D({
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
              const value = modeRef.current === "x" ? -world.z : world.x;
              setFree(clamp(value, -DOMAIN, DOMAIN));
            }
            return;
          }
          if (gestureRef.current !== "plane") return;
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
    },
    [mode, fixed, free, showAxes, surfaceTransparent],
  );

  const value = SURFACE_FN.f(fixed, free);
  const slope =
    mode === "x" ? SURFACE_FN.fy(fixed, free) : SURFACE_FN.fx(free, fixed);

  return (
    <ExpandableDemo id="partial-derivatives" height={height}>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,28rem)] w-full overflow-hidden rounded-xl border border-border"
        >
          <CanvasToolbar />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CapsuleTabs
              options={MODE_OPTIONS}
              value={mode}
              onChange={(id: FixMode) => setMode(id)}
              label="固定:"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              label="曲面透明"
              checked={surfaceTransparent}
              onChange={setSurfaceTransparent}
            />
          </div>
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
