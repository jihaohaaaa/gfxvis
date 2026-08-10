export type RGB = [number, number, number];

const VIRIDIS: RGB[] = [
  [68, 1, 84],
  [71, 44, 122],
  [59, 81, 139],
  [44, 113, 142],
  [33, 144, 141],
  [39, 173, 129],
  [92, 200, 99],
  [170, 220, 50],
  [253, 231, 37],
];

const COOLWARM: RGB[] = [
  [59, 76, 192],
  [96, 130, 222],
  [141, 176, 241],
  [196, 217, 250],
  [250, 250, 250],
  [247, 214, 193],
  [236, 160, 133],
  [214, 96, 77],
  [180, 4, 38],
];

function sample(stops: RGB[], t: number): RGB {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Sequential viridis colormap, t in [0, 1]. */
export function viridis(t: number): RGB {
  return sample(VIRIDIS, t);
}

/** Diverging coolwarm colormap (blue -> white -> red), t in [0, 1]. */
export function coolwarm(t: number): RGB {
  return sample(COOLWARM, t);
}

export function rgbCss(rgb: RGB, alpha = 1): string {
  return alpha >= 1
    ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/** Normalize a value into [0, 1] against a [min, max] domain. */
export function valueToT(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

/** CSS linear-gradient string for a colormap legend. */
export function colormapGradient(name: "viridis" | "coolwarm"): string {
  const stops = name === "viridis" ? VIRIDIS : COOLWARM;
  const points = stops
    .map(
      (rgb, i) =>
        `${rgbCss(rgb)} ${Math.round((i / (stops.length - 1)) * 100)}%`,
    )
    .join(", ");
  return `linear-gradient(to right, ${points})`;
}
