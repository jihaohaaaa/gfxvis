import {
  ArrowHelper,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Scene,
  Vector3,
} from "three";
import { createAxesGroup } from "../../core/3d/axes3d";
import { mathToWorld } from "../../core/3d/coords";
import {
  addGroundGrid,
  addStandardLights,
  applySurfaceTransparency,
  buildColoredGrid,
  createMarker,
  createSurfaceMaterial,
  disposeObject,
} from "../../core/3d/three-utils";
import {
  contourLevels,
  marchingSquares,
  sampleField,
  type Field2D,
} from "./scalar-field-2d";

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

/** Vertex-colored surface z = (F - c) * zScale over the field bounds. */
function buildSurfaceGeometry(field: Field2D): BufferGeometry {
  const { bounds, zScale } = field;
  const res = 96;
  const sample = sampleField(field, bounds, res, res, 0);
  const { nx, ny, values, min, max } = sample;
  return buildColoredGrid(
    ny,
    nx,
    (i, j) => {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * j) / nx;
      const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / ny;
      return mathToWorld(x, y, values[i * (nx + 1) + j] * zScale);
    },
    (i, j) => values[i * (nx + 1) + j],
    { min, max },
  );
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

  addStandardLights(scene);

  // Fixed grid/axes sized to fit every field.
  addGroundGrid(scene, 7);

  const axesGroup = createAxesGroup(3.6);
  scene.add(axesGroup);

  const surfaceMaterial = createSurfaceMaterial();
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

  const marker = createMarker();
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
    applySurfaceTransparency(surfaceMaterial, transparent);
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
