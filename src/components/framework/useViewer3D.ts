import { useEffect, useRef, type RefObject } from "react";
import type { Scene } from "three";
import {
  createViewer3D,
  type Viewer3D,
} from "../../visualizations/core/3d/viewer3d";

export interface UseViewer3DSetup<T> {
  api: T;
  viewer: Viewer3D;
}

export interface UseViewer3DResult<T> {
  containerRef: RefObject<HTMLDivElement | null>;
  apiRef: RefObject<T | null>;
  viewerRef: RefObject<Viewer3D | null>;
}

/**
 * Mounts a Three scene (factory -> api) plus the shared viewer (createViewer3D)
 * once, runs an optional setup hook (e.g. attachDrag3D, initial state, first
 * render), and fully cleans up on unmount. SSR-safe: everything happens inside
 * the effect. Components read `apiRef` / `viewerRef` in their own effects.
 */
export function useViewer3D<T extends { scene: Scene; dispose(): void }>(
  factory: () => T,
  onUpdate?: (ctx: UseViewer3DSetup<T>) => (() => void) | void,
  deps?: unknown[],
): UseViewer3DResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<T | null>(null);
  const viewerRef = useRef<Viewer3D | null>(null);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = factoryRef.current();
    const viewer = createViewer3D(container, api.scene);
    apiRef.current = api;
    viewerRef.current = viewer;
    const detach = onUpdateRef.current?.({ api, viewer });
    return () => {
      detach?.();
      viewer.dispose();
      api.dispose();
      apiRef.current = null;
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (deps && apiRef.current && viewerRef.current) {
      onUpdateRef.current?.({ api: apiRef.current, viewer: viewerRef.current });
      viewerRef.current.render();
    }
  }, deps ?? []);

  return { containerRef, apiRef, viewerRef };
}
