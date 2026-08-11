import {
  AmbientLight,
  ArrowHelper,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { coolwarm, valueToT } from "../../core/colormap";
import { mathToWorld } from "../../core/coords";
import { createAxesGroup } from "../../core/axes3d";
import {
  contourLevels,
  marchingSquares,
  sampleField,
  type Field2D,
} from "./field";

/** How the 3D gradient arrow is oriented: the 2D gradient (z = 0) or the
 * steepest-ascent tangent along the surface. */
export type GradientArrowMode = "horizontal" | "steepest";

export interface ScalarFieldSurfaceScene {
  scene: Scene;
  surface: Mesh;
  setField(field: Field2D): void;
  setC(c: number): void;
  setPoint(x: number, y: number): void;
  getPoint(): { x: number; y: number };
  setAxesVisible(visible: boolean): void;
  setGradientMode(mode: GradientArrowMode): void;
  setSurfaceTransparent(transparent: boolean): void;
  dispose(): void;
}

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    const candidate = child as {
      geometry?: { dispose?: () => void };
      material?: { dispose?: () => void } | Array<{ dispose?: () => void }>;
    };
    candidate.geometry?.dispose?.();
    const material = candidate.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose?.());
    } else {
      material?.dispose?.();
    }
  });
}

/** Vertex-colored surface z = (F - c) * zScale over the field bounds. */
function buildSurfaceGeometry(field: Field2D): BufferGeometry {
  const { bounds, zScale } = field;
  const res = 96;
  const sample = sampleField(field, bounds, res, res, 0);
  const { nx, ny, values, min, max } = sample;
  const positions: number[] = [];
  const colors: number[] = [];
  const index = (i: number, j: number) => i * (nx + 1) + j;
  for (let i = 0; i <= ny; i++) {
    const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;
    for (let j = 0; j <= nx; j++) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
      const z = values[index(i, j)] * zScale;
      const [wx, wy, wz] = mathToWorld(x, y, z);
      positions.push(wx, wy, wz);
      const [cr, cg, cb] = coolwarm(valueToT(values[index(i, j)], min, max));
      const color = new Color(cr / 255, cg / 255, cb / 255);
      colors.push(color.r, color.g, color.b);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < ny; i++) {
    for (let j = 0; j < nx; j++) {
      const a = index(i, j);
      const b = index(i, j + 1);
      const c = index(i + 1, j);
      const d = index(i + 1, j + 1);
      indices.push(a, b, d, a, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Lift the 2D marching-squares iso-lines onto the surface as contours. */
function buildContourGeometry(field: Field2D): BufferGeometry {
  const { bounds, zScale } = field;
  const sample = sampleField(field, bounds, 160, 160, 0);
  const levels = contourLevels(sample.min, sample.max, 9);
  const points: number[] = [];
  for (const level of levels) {
    const segments = marchingSquares(
      sample.values,
      sample.nx,
      sample.ny,
      bounds,
      level,
    );
    for (const segment of segments) {
      const [p0, p1] = segment;
      const z0 = field.phi(p0[0], p0[1], 0) * zScale;
      const z1 = field.phi(p1[0], p1[1], 0) * zScale;
      const [wx0, wy0, wz0] = mathToWorld(p0[0], p0[1], z0);
      const [wx1, wy1, wz1] = mathToWorld(p1[0], p1[1], z1);
      points.push(wx0, wy0, wz0, wx1, wy1, wz1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

/**
 * 3D view of a 2D scalar field family: colored surface z = (F - c) * zScale,
 * lifted contour lines, a draggable probe marker and a gradient arrow. The
 * field F and the level constant c are both adjustable.
 */
export function createScalarFieldSurfaceScene(
  field: Field2D,
): ScalarFieldSurfaceScene {
  const scene = new Scene();

  scene.add(new AmbientLight(0xffffff, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 8, 3);
  scene.add(sun);

  // Fixed grid/axes sized to fit every field.
  scene.add(new GridHelper(7, 16, 0x64748b, 0x475569));

  const axesGroup = createAxesGroup(3.6);
  scene.add(axesGroup);

  const surfaceMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0,
    side: DoubleSide,
    // Semi-transparent by default (depthWrite off) so the gradient arrow and
    // probe marker stay visible through the surface; toggleable.
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const surface = new Mesh(buildSurfaceGeometry(field), surfaceMaterial);

  const contourLines = new LineSegments(
    buildContourGeometry(field),
    new LineBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.45,
    }),
  );

  const surfaceGroup = new Group();
  surfaceGroup.add(surface, contourLines);
  scene.add(surfaceGroup);

  const marker = new Mesh(
    new SphereGeometry(0.09, 20, 20),
    new MeshStandardMaterial({ color: 0xef4444 }),
  );
  scene.add(marker);

  const gradientArrow = new ArrowHelper(
    new Vector3(0, 1, 0),
    new Vector3(),
    1.1,
    0x3b82f6,
    0.25,
    0.16,
  );
  scene.add(gradientArrow);

  let currentField = field;
  let c = 0;
  let gradientMode: GradientArrowMode = "horizontal";
  const point = { x: 0.6, y: 0.6 };

  function update(): void {
    const { x, y } = point;
    const z = currentField.phi(x, y, c) * currentField.zScale;
    const [wx, wy, wz] = mathToWorld(x, y, z);
    marker.position.set(wx, wy, wz);
    const gx = currentField.gradX(x, y);
    const gy = currentField.gradY(x, y);
    const mag = Math.hypot(gx, gy);
    if (mag > 1e-4) {
      // horizontal: the 2D gradient (z = 0); steepest: the surface tangent
      // (gx, gy, |grad|^2 * zScale), whose horizontal projection is the 2D
      // gradient.
      const dz =
        gradientMode === "steepest"
          ? (gx * gx + gy * gy) * currentField.zScale
          : 0;
      const [dx, dy, ddz] = mathToWorld(gx, gy, dz);
      gradientArrow.visible = true;
      gradientArrow.position.copy(marker.position);
      gradientArrow.setDirection(new Vector3(dx, dy, ddz).normalize());
    } else {
      gradientArrow.visible = false;
    }
  }

  function setField(next: Field2D): void {
    currentField = next;
    c = 0;
    const sGeo = buildSurfaceGeometry(next);
    surface.geometry.dispose();
    surface.geometry = sGeo;
    const cGeo = buildContourGeometry(next);
    contourLines.geometry.dispose();
    contourLines.geometry = cGeo;
    surfaceGroup.position.y = 0;
    update();
  }

  function setC(next: number): void {
    c = next;
    surfaceGroup.position.y = -c * currentField.zScale;
    update();
  }

  function setPoint(x: number, y: number): void {
    point.x = x;
    point.y = y;
    update();
  }

  function getPoint(): { x: number; y: number } {
    return { ...point };
  }

  function setAxesVisible(visible: boolean): void {
    axesGroup.visible = visible;
  }

  function setGradientMode(mode: GradientArrowMode): void {
    gradientMode = mode;
    update();
  }

  function setSurfaceTransparent(transparent: boolean): void {
    surfaceMaterial.transparent = transparent;
    surfaceMaterial.opacity = transparent ? 0.55 : 1;
    surfaceMaterial.depthWrite = !transparent;
    surfaceMaterial.needsUpdate = true;
  }

  function dispose(): void {
    disposeObject(scene);
  }

  update();
  return {
    scene,
    surface,
    setField,
    setC,
    setPoint,
    getPoint,
    setAxesVisible,
    setGradientMode,
    setSurfaceTransparent,
    dispose,
  };
}
