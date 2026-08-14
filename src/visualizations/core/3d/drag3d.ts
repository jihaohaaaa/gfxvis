import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface Drag3DOptions {
  domElement: HTMLElement;
  camera: THREE.Camera;
  controls: OrbitControls;
  /** Objects that can be grabbed with a left-drag. */
  targets: THREE.Object3D[];
  /** Called when a drag gesture starts (pointer down on a target). */
  onDragStart?(hit: THREE.Intersection, event: PointerEvent): void;
  /** Called while dragging; hit is null when the ray no longer hits a target. */
  onDrag(hit: THREE.Intersection | null, event: PointerEvent): void;
  /** Optional per-hit rejection. */
  canStart?(hit: THREE.Intersection): boolean;
  /** Hover (pointer move with no buttons): e.g. place a probe under the mouse. */
  onHover?(hit: THREE.Intersection | null, event: PointerEvent): void;
}

/**
 * Generic raycast drag for 3D scenes: left-press on a target starts a drag,
 * during which OrbitControls is disabled so the pointer moves the object.
 * Returns a detach function.
 */
export function attachDrag3D(options: Drag3DOptions): () => void {
  const {
    domElement,
    camera,
    controls,
    targets,
    onDrag,
    onDragStart,
    canStart,
    onHover,
  } = options;
  let dragging = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const setPointer = (e: PointerEvent) => {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };
  const pick = (e: PointerEvent): THREE.Intersection | null => {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0] : null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const hit = pick(e);
    if (hit && (canStart?.(hit) ?? true)) {
      dragging = true;
      controls.enabled = false;
      domElement.setPointerCapture(e.pointerId);
      onDragStart?.(hit, e);
      onDrag(hit, e);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging) {
      // Keep dragging even when the ray misses (e.g. the grabbed object moved).
      const hit = pick(e);
      onDrag(hit, e);
      return;
    }
    // Hover placement: only when no button is held, so rotating/panning
    // does not move the probe.
    if (e.buttons === 0) {
      onHover?.(pick(e), e);
    }
  };
  const onPointerUp = () => {
    if (dragging) {
      dragging = false;
      controls.enabled = true;
    }
  };

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);

  return () => {
    domElement.removeEventListener("pointerdown", onPointerDown);
    domElement.removeEventListener("pointermove", onPointerMove);
    domElement.removeEventListener("pointerup", onPointerUp);
    domElement.removeEventListener("pointercancel", onPointerUp);
  };
}
