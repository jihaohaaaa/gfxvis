import {
  AmbientLight,
  ArrowHelper,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  Group,
  Line,
  Mesh,
  MeshStandardMaterial,
  Points,
  Scene,
  TorusKnotGeometry,
  Vector3,
} from "three";

export interface NormalMatrixScene {
  scene: Scene;
  update: (elapsed: number) => void;
  dispose: () => void;
}

const NORMAL_ARROW_COUNT = 12;
const NORMAL_ARROW_LENGTH = 0.4;

export function createNormalMatrixScene(): NormalMatrixScene {
  const scene = new Scene();

  scene.add(new GridHelper(10, 20, 0x3b82f6, 0x1f2937));
  scene.add(new AxesHelper(3));

  scene.add(new AmbientLight(0xffffff, 0.5));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 6, 4);
  scene.add(sun);

  const geometry = new TorusKnotGeometry(1, 0.32, 128, 24);
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      color: 0x4cc2ff,
      roughness: 0.35,
      metalness: 0.1,
    }),
  );

  const group = new Group();
  group.add(mesh);

  // Sample a few vertex normals and visualize them as arrows.
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const step = Math.max(1, Math.floor(position.count / NORMAL_ARROW_COUNT));
  for (let i = 0; i < NORMAL_ARROW_COUNT; i++) {
    const index = i * step;
    const origin = new Vector3().fromBufferAttribute(position, index);
    const direction = new Vector3()
      .fromBufferAttribute(normal, index)
      .normalize();
    group.add(
      new ArrowHelper(
        direction,
        origin,
        NORMAL_ARROW_LENGTH,
        0xff6b6b,
        0.12,
        0.08,
      ),
    );
  }

  scene.add(group);

  return {
    scene,
    update(elapsed: number) {
      group.rotation.y = elapsed * 0.3;
    },
    dispose() {
      geometry.dispose();
      group.traverse((object) => {
        if (
          object instanceof Mesh ||
          object instanceof Line ||
          object instanceof Points
        ) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
    },
  };
}
