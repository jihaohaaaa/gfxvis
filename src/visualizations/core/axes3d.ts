import {
  ArrowHelper,
  CanvasTexture,
  Group,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { mathToWorld } from "./coords";

function makeLabel(text: string, color: string): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.font = "bold 44px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 32, 34);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(
    new SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(0.55, 0.55, 1);
  return sprite;
}

/**
 * Colored math axes with arrowheads and labels (x red, y green, z blue),
 * placed via mathToWorld: math +x -> world +x, math +y -> world -z,
 * math +z -> world +y.
 */
export function createAxesGroup(length = 2.4): Group {
  const group = new Group();
  const axes: Array<[number, number, number, number, string]> = [
    [1, 0, 0, 0xff4d4d, "X"],
    [0, 1, 0, 0x4dff4d, "Y"],
    [0, 0, 1, 0x4d9fff, "Z"],
  ];
  for (const [mx, my, mz, color, label] of axes) {
    const [dx, dy, dz] = mathToWorld(mx, my, mz);
    const dir = new Vector3(dx, dy, dz).normalize();
    group.add(
      new ArrowHelper(
        dir,
        new Vector3(),
        length,
        color,
        length * 0.14,
        length * 0.08,
      ),
    );
    const sprite = makeLabel(label, `#${color.toString(16).padStart(6, "0")}`);
    sprite.position.copy(dir.clone().multiplyScalar(length + 0.4));
    group.add(sprite);
  }
  return group;
}
