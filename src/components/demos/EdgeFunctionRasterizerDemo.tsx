import { AutoMath } from "../framework/AutoMath";
import { useEffect, useRef, useState } from "react";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeGroupBox from "../framework/KdeGroupBox";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import ExpandableDemo from "../framework/ExpandableDemo";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";
import KdeWindowShell from "../framework/KdeWindowShell";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import {
  computeNiceTicks,
  drawArrow,
  drawAxes,
  type Bounds2,
  type Plot2D,
  type ThemeColors,
} from "../../visualizations/core/2d/plot2d";

type DemoMode = "probe" | "coverage";
type MsaaRate = 1 | 2 | 4 | 8 | 16;
type Vec2 = { x: number; y: number };
type VertexIndex = 0 | 1 | 2;

interface TriangleState {
  id: string;
  vertices: [Vec2, Vec2, Vec2];
  depth: number;
}

interface TriangleAnalysis {
  determinant: number;
  edgeFunctions: [number, number, number];
  weights: [number, number, number] | null;
  degenerate: boolean;
  inside: boolean;
}

interface PixelCell {
  x: number;
  y: number;
}

interface PointSelection {
  kind: "vertex" | "probe";
  triangleId?: string;
  vertexIndex?: VertexIndex;
}

type ProbeHighlight =
  "D" | "E0" | "E1" | "E2" | "lambda0" | "lambda1" | "lambda2" | null;

interface CoordinateDraft {
  x: string;
  y: string;
}

interface ProbeViewState {
  triangle: TriangleState;
  point: Vec2;
  selectedPoint: PointSelection | null;
  draft: CoordinateDraft;
  highlight: ProbeHighlight;
  bounds: Bounds2;
}

interface CoverageViewState {
  triangles: TriangleState[];
  selectedTriangleId: string;
  selectedPoint: PointSelection | null;
  draft: CoordinateDraft;
  rate: MsaaRate;
  hoveredCell: PixelCell | null;
  pinnedCell: PixelCell | null;
  bounds: Bounds2;
}

type DragTarget = PointSelection;

const VIEW_BOUNDS: Bounds2 = {
  xMin: -3,
  xMax: 3,
  yMin: -3,
  yMax: 3,
};
const GRID_COLUMNS = 6;
const GRID_ROWS = 6;
const TRIANGLE_LIMIT = 6;
const DEGENERATE_RELATIVE_EPSILON = 1e-2;

const VIEW_OPTIONS: readonly KdeTabOption<DemoMode>[] = [
  { id: "probe", label: "几何探针", badge: "PROBE" },
  { id: "coverage", label: "MSAA 覆盖", badge: "MSAA" },
];

const RATE_OPTIONS: readonly KdeTabOption<string>[] = [
  { id: "1", label: "1×" },
  { id: "2", label: "2×" },
  { id: "4", label: "4×" },
  { id: "8", label: "8×" },
  { id: "16", label: "16×" },
];

const INITIAL_TRIANGLES: TriangleState[] = [
  {
    id: "T0",
    vertices: [
      { x: -2, y: -1 },
      { x: 2, y: -1 },
      { x: 0, y: 2 },
    ],
    depth: 0.3,
  },
  {
    id: "T1",
    vertices: [
      { x: -1.8, y: 1.2 },
      { x: 1.8, y: 1.2 },
      { x: 0, y: -1.8 },
    ],
    depth: 0.5,
  },
  {
    id: "T2",
    vertices: [
      { x: -1.5, y: -1.5 },
      { x: 1.5, y: -1.5 },
      { x: 0, y: 1.5 },
    ],
    depth: 0.7,
  },
];

function generateAdaptiveRandomDepth(
  existingDepths: readonly number[],
): number {
  const minBound = 0.05;
  const maxBound = 0.95;
  const step = 0.05;

  const sorted = Array.from(new Set(existingDepths)).sort((a, b) => a - b);
  const existingSet = new Set(existingDepths.map((d) => Math.round(d * 100)));

  if (sorted.length === 0) return 0.5;

  // 收集所有深度区间（含边界）
  const intervals: { start: number; end: number; gap: number }[] = [];
  const boundaries = [minBound, ...sorted, maxBound];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]!;
    const end = boundaries[i + 1]!;
    if (end > start) {
      intervals.push({ start, end, gap: end - start });
    }
  }

  // 优先选取最大空隙区间（间隙相同时随机）
  intervals.sort((a, b) => b.gap - a.gap || Math.random() - 0.5);

  for (const interval of intervals) {
    const candidates: number[] = [];
    const minStep = Math.ceil(Math.round((interval.start + 1e-4) / step));
    const maxStep = Math.floor(Math.round((interval.end - 1e-4) / step));

    for (let s = minStep; s <= maxStep; s++) {
      const val = Number((s * step).toFixed(2));
      const key = Math.round(val * 100);
      if (val >= minBound && val <= maxBound && !existingSet.has(key)) {
        candidates.push(val);
      }
    }

    if (candidates.length > 0) {
      const mid = (interval.start + interval.end) / 2;
      candidates.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      return candidates[0]!;
    }
  }

  // 兜底：搜索任意未被占用的 0.05 步长
  for (
    let s = Math.round(minBound / step);
    s <= Math.round(maxBound / step);
    s++
  ) {
    const val = Number((s * step).toFixed(2));
    if (!existingSet.has(Math.round(val * 100))) {
      return val;
    }
  }

  return Number((Math.random() * (maxBound - minBound) + minBound).toFixed(2));
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function analyzeTriangle(
  triangle: TriangleState,
  point: Vec2,
): TriangleAnalysis {
  const [p0, p1, p2] = triangle.vertices;
  const determinant = cross(subtract(p1, p0), subtract(p2, p0));
  const edges = [subtract(p1, p0), subtract(p2, p1), subtract(p0, p2)];
  const maxEdgeLengthSquared = Math.max(
    ...edges.map((edge) => edge.x * edge.x + edge.y * edge.y),
  );
  const edgeFunctions: [number, number, number] = [
    cross(subtract(p2, p1), subtract(point, p1)),
    cross(subtract(p0, p2), subtract(point, p2)),
    cross(subtract(p1, p0), subtract(point, p0)),
  ];
  const degenerate =
    maxEdgeLengthSquared === 0 ||
    Math.abs(determinant) <= DEGENERATE_RELATIVE_EPSILON * maxEdgeLengthSquared;

  if (degenerate) {
    return {
      determinant,
      edgeFunctions,
      weights: null,
      degenerate: true,
      inside: false,
    };
  }

  const weights: [number, number, number] = [
    edgeFunctions[0] / determinant,
    edgeFunctions[1] / determinant,
    edgeFunctions[2] / determinant,
  ];

  return {
    determinant,
    edgeFunctions,
    weights,
    degenerate: false,
    inside: weights.every((weight) => weight >= -1e-9),
  };
}

function sampleOffsets(rate: MsaaRate): Vec2[] {
  if (rate === 1) return [{ x: 0.5, y: 0.5 }];

  const columns = rate === 2 ? 2 : rate === 4 ? 2 : 4;
  const rows = rate / columns;
  const samples: Vec2[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      samples.push({
        x: (column + 0.5) / columns,
        y: (row + 0.5) / rows,
      });
    }
  }

  return samples;
}

function samplePixel(triangles: TriangleState[], point: Vec2): string | null {
  let winner: string | null = null;
  let depthBuffer = Number.POSITIVE_INFINITY;

  for (const triangle of triangles) {
    const analysis = analyzeTriangle(triangle, point);
    if (!analysis.inside || analysis.degenerate) continue;
    if (triangle.depth < depthBuffer) {
      depthBuffer = triangle.depth;
      winner = triangle.id;
    }
  }

  return winner;
}

function pixelCoverage(
  triangles: TriangleState[],
  rate: MsaaRate,
  cell: PixelCell,
  bounds: Bounds2,
) {
  const offsets = sampleOffsets(rate);
  const cellWidth = (bounds.xMax - bounds.xMin) / GRID_COLUMNS;
  const cellHeight = (bounds.yMax - bounds.yMin) / GRID_ROWS;
  const triangleMasks = new Map<string, boolean[]>();
  const winnerMasks = new Map<string, boolean[]>();

  for (const triangle of triangles) {
    triangleMasks.set(triangle.id, []);
    winnerMasks.set(triangle.id, []);
  }

  const winners: (string | null)[] = [];
  for (const offset of offsets) {
    const point = {
      x: bounds.xMin + (cell.x + offset.x) * cellWidth,
      y: bounds.yMin + (cell.y + offset.y) * cellHeight,
    };
    let winner: string | null = null;
    let depthBuffer = Number.POSITIVE_INFINITY;

    for (const triangle of triangles) {
      const analysis = analyzeTriangle(triangle, point);
      const covered = analysis.inside && !analysis.degenerate;
      triangleMasks.get(triangle.id)?.push(covered);

      if (covered && triangle.depth < depthBuffer) {
        depthBuffer = triangle.depth;
        winner = triangle.id;
      }
    }

    winners.push(winner);
    for (const triangle of triangles) {
      winnerMasks.get(triangle.id)?.push(winner === triangle.id);
    }
  }

  return { offsets, triangleMasks, winnerMasks, winners };
}

function formatNumber(value: number): string {
  const rounded = value.toFixed(2);
  return rounded === "-0.00" ? "0.00" : rounded;
}

function formatMask(bits: boolean[]): string {
  let mask = 0;
  bits.forEach((covered, index) => {
    if (covered) mask |= 1 << index;
  });
  return "0b" + mask.toString(2).padStart(bits.length, "0");
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function rgbHue(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => value / 255);
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const delta = high - low;
  if (delta === 0) return 210;

  const hue =
    high === r
      ? ((g - b) / delta) % 6
      : high === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function triangleColor(
  id: string,
  theme: ThemeColors,
  indexOffset = 0,
): string {
  const accentRgb = hexToRgb(theme.accent);
  const backgroundRgb = hexToRgb(theme.bg);
  const hue = accentRgb ? rgbHue(accentRgb) : 210;
  const backgroundIsLight = backgroundRgb
    ? backgroundRgb.reduce((sum, value) => sum + value, 0) / 3 > 127
    : true;
  const idNumber = Number(id.replace("T", "")) || 0;
  const colorIndex = (idNumber + indexOffset * 2) % TRIANGLE_LIMIT;
  const shiftedHue = (hue + colorIndex * 60) % 360;
  const lightness = backgroundIsLight ? 43 : 67;
  return "hsl(" + shiftedHue.toFixed(0) + " 76% " + lightness + "%)";
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  background: string,
  foreground: string,
  border: string,
): void {
  ctx.save();
  ctx.font = "11px ui-monospace, SFMono-Regular, monospace";
  const width = ctx.measureText(text).width + 10;
  const height = 18;
  ctx.fillStyle = background;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = foreground;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawVertexHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  theme: ThemeColors,
  selected = false,
): void {
  ctx.save();
  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, selected ? 6 : 5.5, 0, Math.PI * 2);
  ctx.fillStyle = theme.bg;
  ctx.fill();
  ctx.strokeStyle = selected ? theme.accent : color;
  ctx.lineWidth = selected ? 2.5 : 2;
  ctx.stroke();
  drawBadge(
    ctx,
    x + 18,
    y - 13,
    label,
    theme.bg,
    selected ? theme.accent : color,
    selected ? theme.accent : theme.border,
  );
  ctx.restore();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  triangle: TriangleState,
  theme: ThemeColors,
  selected: boolean,
  selectedVertexIndex: VertexIndex | null = null,
): void {
  const color = triangleColor(triangle.id, theme);
  const points = triangle.vertices.map((vertex) => ({
    x: plot.toScreenX(vertex.x),
    y: plot.toScreenY(vertex.y),
  }));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = selected ? 0.12 : 0.055;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 2.4 : 1.5;
  ctx.setLineDash(selected ? [] : [5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.font = selected
    ? "bold 12px ui-sans-serif, system-ui"
    : "11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    triangle.id,
    points[0].x * 0.25 + points[1].x * 0.25 + points[2].x * 0.5,
    points[0].y * 0.25 + points[1].y * 0.25 + points[2].y * 0.5,
  );

  points.forEach((point, index) => {
    drawVertexHandle(
      ctx,
      point.x,
      point.y,
      "P" + index,
      color,
      theme,
      selectedVertexIndex === index,
    );
  });
  ctx.restore();
}

function drawVectorArrow(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  from: Vec2,
  to: Vec2,
  color: string,
  alpha = 1,
  lineWidth = 1.8,
): void {
  const startX = plot.toScreenX(from.x);
  const startY = plot.toScreenY(from.y);
  const targetX = plot.toScreenX(to.x);
  const targetY = plot.toScreenY(to.y);
  const dx = targetX - startX;
  const dy = targetY - startY;
  const length = Math.hypot(dx, dy);
  if (length < 8) return;
  const inset = Math.min(10, length * 0.3);
  const endX = targetX - (dx / length) * inset;
  const endY = targetY - (dy / length) * inset;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawArrow(
    ctx,
    startX,
    startY,
    endX - startX,
    endY - startY,
    color,
    9,
    11,
    lineWidth,
  );
  ctx.restore();
}

function highlightIndex(highlight: ProbeHighlight): number | null {
  if (!highlight || highlight === "D") return null;
  if (highlight.startsWith("E")) return Number(highlight.slice(1));
  if (highlight.startsWith("lambda")) return Number(highlight.slice(6));
  return null;
}

function drawGeometryProbe(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  triangle: TriangleState,
  probe: Vec2,
  selectedPoint: PointSelection | null,
  highlight: ProbeHighlight,
): void {
  const vertices = triangle.vertices;
  const color = triangleColor(triangle.id, theme);
  const probeScreen = {
    x: plot.toScreenX(probe.x),
    y: plot.toScreenY(probe.y),
  };
  const edgePairs: [[number, number], [number, number], [number, number]] = [
    [1, 2],
    [2, 0],
    [0, 1],
  ];
  const selectedIndex = highlightIndex(highlight);
  const selectedVertexIndex =
    selectedPoint?.kind === "vertex"
      ? (selectedPoint.vertexIndex ?? null)
      : null;

  drawTriangle(ctx, plot, triangle, theme, true, selectedVertexIndex);

  if (highlight === "D") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(plot.toScreenX(vertices[0].x), plot.toScreenY(vertices[0].y));
    ctx.lineTo(plot.toScreenX(vertices[1].x), plot.toScreenY(vertices[1].y));
    ctx.lineTo(plot.toScreenX(vertices[2].x), plot.toScreenY(vertices[2].y));
    ctx.closePath();
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.17;
    ctx.fill();
    ctx.restore();

    for (let index = 0; index < 3; index += 1) {
      drawVectorArrow(
        ctx,
        plot,
        vertices[index],
        vertices[(index + 1) % 3],
        theme.accent,
        1,
        2.5,
      );
    }
    ctx.save();
    ctx.setLineDash([4, 3]);
    drawVectorArrow(
      ctx,
      plot,
      vertices[0],
      vertices[2],
      theme.accent,
      0.9,
      1.7,
    );
    ctx.restore();
  } else if (
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < 3
  ) {
    const [edgeStart, edgeEnd] = edgePairs[selectedIndex];
    const a = vertices[edgeStart];
    const b = vertices[edgeEnd];
    const translatedEnd = { x: b.x + probe.x - a.x, y: b.y + probe.y - a.y };
    const regionColor = triangleColor(triangle.id, theme, selectedIndex + 1);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(plot.toScreenX(a.x), plot.toScreenY(a.y));
    ctx.lineTo(plot.toScreenX(b.x), plot.toScreenY(b.y));
    ctx.lineTo(
      plot.toScreenX(translatedEnd.x),
      plot.toScreenY(translatedEnd.y),
    );
    ctx.lineTo(probeScreen.x, probeScreen.y);
    ctx.closePath();
    ctx.fillStyle = regionColor;
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Keep arrows on the probe triangle's three sides; translated edges stay unarrowed.
    drawVectorArrow(ctx, plot, a, b, theme.accent, 1, 2.6);
    const centroid = {
      x: (a.x + b.x + translatedEnd.x + probe.x) / 4,
      y: (a.y + b.y + translatedEnd.y + probe.y) / 4,
    };
    const label = highlight?.startsWith("lambda")
      ? "λ" + selectedIndex
      : "E" + selectedIndex;
    drawBadge(
      ctx,
      plot.toScreenX(centroid.x),
      plot.toScreenY(centroid.y),
      label,
      theme.bg,
      theme.accent,
      theme.accent,
    );
  }

  vertices.forEach((vertex, index) => {
    const relevant =
      selectedIndex === null || edgePairs[selectedIndex]?.includes(index);
    drawVectorArrow(
      ctx,
      plot,
      vertex,
      probe,
      triangleColor(triangle.id, theme, index + 1),
      relevant ? 0.9 : 0.34,
      relevant ? 2 : 1.2,
    );
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(probeScreen.x, probeScreen.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = theme.bg;
  ctx.fill();
  ctx.strokeStyle = selectedPoint?.kind === "probe" ? theme.accent : color;
  ctx.lineWidth = selectedPoint?.kind === "probe" ? 3.2 : 2.5;
  ctx.stroke();
  drawBadge(
    ctx,
    probeScreen.x + 19,
    probeScreen.y - 17,
    "P",
    theme.bg,
    theme.accent,
    theme.border,
  );
  ctx.restore();

  vertices.forEach((vertex, index) => {
    drawVertexHandle(
      ctx,
      plot.toScreenX(vertex.x),
      plot.toScreenY(vertex.y),
      "P" + index,
      color,
      theme,
      selectedVertexIndex === index,
    );
  });

  const analysis = analyzeTriangle(triangle, probe);
  if (analysis.degenerate) {
    ctx.save();
    ctx.fillStyle = theme.muted;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      "退化三角形：重心坐标未定义",
      plot.margin + 8,
      plot.margin + 16,
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      analysis.inside ? "P 在三角形内" : "P 在三角形外",
      plot.margin + 8,
      plot.margin + 16,
    );
    ctx.restore();
  }
}

function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
  triangles: TriangleState[],
  rate: MsaaRate,
  hoveredCell: PixelCell | null,
  pinnedCell: PixelCell | null,
  bounds: Bounds2,
  selectedPoint: PointSelection | null,
  selectedTriangleId: string,
): void {
  const cellWidth = (bounds.xMax - bounds.xMin) / GRID_COLUMNS;
  const cellHeight = (bounds.yMax - bounds.yMin) / GRID_ROWS;

  ctx.save();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.85;
  for (let column = 0; column <= GRID_COLUMNS; column += 1) {
    const x = bounds.xMin + column * cellWidth;
    ctx.beginPath();
    ctx.moveTo(plot.toScreenX(x), plot.toScreenY(bounds.yMin));
    ctx.lineTo(plot.toScreenX(x), plot.toScreenY(bounds.yMax));
    ctx.stroke();
  }
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const y = bounds.yMin + row * cellHeight;
    ctx.beginPath();
    ctx.moveTo(plot.toScreenX(bounds.xMin), plot.toScreenY(y));
    ctx.lineTo(plot.toScreenX(bounds.xMax), plot.toScreenY(y));
    ctx.stroke();
  }
  ctx.restore();

  for (const triangle of triangles) {
    const selectedVertexIndex =
      selectedPoint?.kind === "vertex" &&
      selectedPoint.triangleId === triangle.id
        ? (selectedPoint.vertexIndex ?? null)
        : null;
    drawTriangle(
      ctx,
      plot,
      triangle,
      theme,
      triangle.id === selectedTriangleId,
      selectedVertexIndex,
    );
  }

  const offsets = sampleOffsets(rate);
  const sampleRadius = Math.max(1.7, 4.3 - rate / 8);

  for (let cellY = 0; cellY < GRID_ROWS; cellY += 1) {
    for (let cellX = 0; cellX < GRID_COLUMNS; cellX += 1) {
      for (const offset of offsets) {
        const point = {
          x: bounds.xMin + (cellX + offset.x) * cellWidth,
          y: bounds.yMin + (cellY + offset.y) * cellHeight,
        };
        const winner = samplePixel(triangles, point);
        const sampleColor = winner ? triangleColor(winner, theme) : theme.muted;
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          plot.toScreenX(point.x),
          plot.toScreenY(point.y),
          sampleRadius,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = sampleColor;
        ctx.globalAlpha = winner ? 0.95 : 0.38;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 绘制悬停格（若存在且不是锁定格）
  if (
    hoveredCell &&
    (!pinnedCell ||
      pinnedCell.x !== hoveredCell.x ||
      pinnedCell.y !== hoveredCell.y)
  ) {
    const x0 = plot.toScreenX(bounds.xMin + hoveredCell.x * cellWidth);
    const x1 = plot.toScreenX(bounds.xMin + (hoveredCell.x + 1) * cellWidth);
    const y0 = plot.toScreenY(bounds.yMin + (hoveredCell.y + 1) * cellHeight);
    const y1 = plot.toScreenY(bounds.yMin + hoveredCell.y * cellHeight);
    ctx.save();
    ctx.strokeStyle = theme.accent;
    if (pinnedCell) {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
    } else {
      ctx.lineWidth = 2.2;
    }
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }

  // 绘制锁定格（显式实线高亮框）
  if (pinnedCell) {
    const x0 = plot.toScreenX(bounds.xMin + pinnedCell.x * cellWidth);
    const x1 = plot.toScreenX(bounds.xMin + (pinnedCell.x + 1) * cellWidth);
    const y0 = plot.toScreenY(bounds.yMin + (pinnedCell.y + 1) * cellHeight);
    const y1 = plot.toScreenY(bounds.yMin + pinnedCell.y * cellHeight);
    ctx.save();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.6;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }
}

function pixelGridBounds(plot: Plot2D): Bounds2 {
  return {
    xMin: plot.toWorldX(plot.margin),
    xMax: plot.toWorldX(plot.width - plot.margin),
    yMin: plot.toWorldY(plot.height - plot.margin),
    yMax: plot.toWorldY(plot.margin),
  };
}

function pointFromPointer(
  e: PointerEvent,
  canvas: HTMLCanvasElement | null,
  plot: Plot2D,
): Vec2 {
  const el =
    canvas ??
    (e.currentTarget as HTMLElement | null) ??
    (e.target as HTMLElement | null);
  const rect = el?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: plot.toWorldX(e.clientX - rect.left),
    y: plot.toWorldY(e.clientY - rect.top),
  };
}

function closestVertex(
  point: Vec2,
  triangles: TriangleState[],
  plot: Plot2D,
): DragTarget | null {
  const pointerX = plot.toScreenX(point.x);
  const pointerY = plot.toScreenY(point.y);
  for (
    let triangleIndex = triangles.length - 1;
    triangleIndex >= 0;
    triangleIndex -= 1
  ) {
    const triangle = triangles[triangleIndex];
    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const vertex = triangle.vertices[vertexIndex];
      const distance = Math.hypot(
        plot.toScreenX(vertex.x) - pointerX,
        plot.toScreenY(vertex.y) - pointerY,
      );
      if (distance <= 14) {
        return {
          kind: "vertex",
          triangleId: triangle.id,
          vertexIndex: vertexIndex as VertexIndex,
        };
      }
    }
  }
  return null;
}

function isNearPoint(point: Vec2, target: Vec2, plot: Plot2D): boolean {
  return (
    Math.hypot(
      plot.toScreenX(point.x) - plot.toScreenX(target.x),
      plot.toScreenY(point.y) - plot.toScreenY(target.y),
    ) <= 14
  );
}

function cellFromPoint(point: Vec2, bounds: Bounds2): PixelCell | null {
  if (
    point.x < bounds.xMin ||
    point.x >= bounds.xMax ||
    point.y < bounds.yMin ||
    point.y >= bounds.yMax
  ) {
    return null;
  }
  const x = Math.floor(
    ((point.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * GRID_COLUMNS,
  );
  const y = Math.floor(
    ((point.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * GRID_ROWS,
  );
  return { x, y };
}

function cloneTriangle(triangle: TriangleState): TriangleState {
  return {
    ...triangle,
    vertices: triangle.vertices.map((vertex) => ({ ...vertex })) as [
      Vec2,
      Vec2,
      Vec2,
    ],
  };
}

function expandBoundsToInclude(bounds: Bounds2, points: Vec2[]): Bounds2 {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (finitePoints.length === 0) return bounds;

  const paddingX = Math.max(1, (bounds.xMax - bounds.xMin) * 0.04);
  const paddingY = Math.max(1, (bounds.yMax - bounds.yMin) * 0.04);
  let xMin = bounds.xMin;
  let xMax = bounds.xMax;
  let yMin = bounds.yMin;
  let yMax = bounds.yMax;

  for (const point of finitePoints) {
    if (point.x < xMin) xMin = point.x - paddingX;
    if (point.x > xMax) xMax = point.x + paddingX;
    if (point.y < yMin) yMin = point.y - paddingY;
    if (point.y > yMax) yMax = point.y + paddingY;
  }

  if (
    xMin === bounds.xMin &&
    xMax === bounds.xMax &&
    yMin === bounds.yMin &&
    yMax === bounds.yMax
  ) {
    return bounds;
  }
  return { xMin, xMax, yMin, yMax };
}

function formatInputValue(value: number): string {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
}

function parseCoordinate(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function samePointSelection(
  a: PointSelection | null,
  b: PointSelection | null,
): boolean {
  return (
    a?.kind === b?.kind &&
    a?.triangleId === b?.triangleId &&
    a?.vertexIndex === b?.vertexIndex
  );
}

function pointAtProbeSelection(
  state: ProbeViewState,
  selection: PointSelection | null,
): Vec2 | null {
  if (!selection) return null;
  if (selection.kind === "probe") return state.point;
  if (selection.triangleId !== state.triangle.id) return null;
  return state.triangle.vertices[selection.vertexIndex ?? 0];
}

function pointAtCoverageSelection(
  state: CoverageViewState,
  selection: PointSelection | null,
): Vec2 | null {
  if (!selection || selection.kind !== "vertex") return null;
  const triangle = state.triangles.find(
    (candidate) => candidate.id === selection.triangleId,
  );
  return triangle?.vertices[selection.vertexIndex ?? 0] ?? null;
}

function updateProbeGeometry(
  state: ProbeViewState,
  selection: PointSelection,
  point: Vec2,
): ProbeViewState {
  if (selection.kind === "probe") return { ...state, point };
  if (selection.triangleId !== state.triangle.id) return state;
  const vertices = [...state.triangle.vertices] as [Vec2, Vec2, Vec2];
  vertices[selection.vertexIndex ?? 0] = point;
  return { ...state, triangle: { ...state.triangle, vertices } };
}

function updateCoverageGeometry(
  state: CoverageViewState,
  selection: PointSelection,
  point: Vec2,
): CoverageViewState {
  if (selection.kind !== "vertex") return state;
  return {
    ...state,
    triangles: state.triangles.map((triangle) => {
      if (triangle.id !== selection.triangleId) return triangle;
      const vertices = [...triangle.vertices] as [Vec2, Vec2, Vec2];
      vertices[selection.vertexIndex ?? 0] = point;
      return { ...triangle, vertices };
    }),
  };
}

function pointSelectionLabel(
  selection: PointSelection,
  view: DemoMode,
): string {
  if (selection.kind === "probe") return "采样点 P";
  if (view === "probe") return "顶点 P" + (selection.vertexIndex ?? 0);
  return (
    (selection.triangleId ?? "三角形") +
    " 顶点 P" +
    (selection.vertexIndex ?? 0)
  );
}

function probePoints(state: ProbeViewState): Vec2[] {
  return [...state.triangle.vertices, state.point];
}

function coveragePoints(state: CoverageViewState): Vec2[] {
  return state.triangles.flatMap((triangle) => triangle.vertices);
}

function clampToPlot(point: Vec2, plot: Plot2D): Vec2 {
  const left = plot.toWorldX(0);
  const right = plot.toWorldX(plot.width);
  const bottom = plot.toWorldY(plot.height);
  const top = plot.toWorldY(0);
  return {
    x: Math.max(
      Math.min(left, right),
      Math.min(Math.max(left, right), point.x),
    ),
    y: Math.max(
      Math.min(bottom, top),
      Math.min(Math.max(bottom, top), point.y),
    ),
  };
}

function drawPlotAxes(
  ctx: CanvasRenderingContext2D,
  plot: Plot2D,
  theme: ThemeColors,
): void {
  const bounds = pixelGridBounds(plot);
  drawAxes(
    ctx,
    plot,
    theme,
    computeNiceTicks(bounds.xMin, bounds.xMax, 6),
    computeNiceTicks(bounds.yMin, bounds.yMax, 6),
  );
}

interface ProbeCanvasProps {
  active: boolean;
  state: ProbeViewState;
  onSelectPoint(selection: PointSelection): void;
  onMovePoint(selection: PointSelection, point: Vec2): void;
}

function ProbeCanvas({
  active,
  state,
  onSelectPoint,
  onMovePoint,
}: ProbeCanvasProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const dragTargetRef = useRef<PointSelection | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const { containerRef, canvasRef, setBounds } = useCanvas2D(
    {
      initialBounds: state.bounds,
      draw(ctx, plot, theme) {
        const current = stateRef.current;
        drawPlotAxes(ctx, plot, theme);
        drawGeometryProbe(
          ctx,
          plot,
          theme,
          current.triangle,
          current.point,
          current.selectedPoint,
          current.highlight,
        );
      },
      onLeftDown(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const point = pointFromPointer(e, canvas, plot);
        const vertex = closestVertex(point, [stateRef.current.triangle], plot);
        const target =
          vertex ??
          (isNearPoint(point, stateRef.current.point, plot)
            ? { kind: "probe" as const }
            : null);
        if (!target) return false;
        dragTargetRef.current = target;
        onSelectPoint(target);
        if (canvas) canvas.style.cursor = "grabbing";
        return true;
      },
      onLeftMove(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const target = dragTargetRef.current;
        if (!target) return;
        onMovePoint(
          target,
          clampToPlot(pointFromPointer(e, canvas, plot), plot),
        );
      },
      onLeftUp() {
        dragTargetRef.current = null;
        const canvas = canvasElementRef.current ?? canvasRef.current;
        if (canvas) canvas.style.cursor = "";
      },
      onHover(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const point = pointFromPointer(e, canvas, plot);
        const canGrab =
          closestVertex(point, [stateRef.current.triangle], plot) !== null ||
          isNearPoint(point, stateRef.current.point, plot);
        if (canvas) canvas.style.cursor = canGrab ? "grab" : "";
      },
      onPointerLeave() {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        if (!dragTargetRef.current && canvas) {
          canvas.style.cursor = "";
        }
      },
    },
    [state],
  );

  useEffect(() => {
    canvasElementRef.current = canvasRef.current;
  }, [canvasRef]);

  useEffect(() => {
    setBounds(state.bounds);
  }, [setBounds, state.bounds]);

  return (
    <div
      className={
        active
          ? "edge-function-console__canvas-view flex h-full w-full min-h-0 flex-1 flex-col"
          : "hidden"
      }
    >
      <div
        ref={containerRef}
        className="edge-function-console__canvas-surface relative h-full min-h-0 w-full flex-1 overflow-hidden"
        data-testid="probe-canvas-container"
        data-view-x-min={state.bounds.xMin}
        data-view-x-max={state.bounds.xMax}
        data-view-y-min={state.bounds.yMin}
        data-view-y-max={state.bounds.yMax}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          aria-label="几何探针：边函数与重心坐标画布"
          data-testid="probe-canvas"
        />
        <CanvasToolbar onReset={() => setBounds(state.bounds)} />
        <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
      </div>
    </div>
  );
}

interface CoverageCanvasProps {
  active: boolean;
  state: CoverageViewState;
  onSelectPoint(selection: PointSelection): void;
  onMovePoint(selection: PointSelection, point: Vec2): void;
  onHoverCell(cell: PixelCell | null): void;
  onTogglePinCell(cell: PixelCell): void;
}

function CoverageCanvas({
  active,
  state,
  onSelectPoint,
  onMovePoint,
  onHoverCell,
  onTogglePinCell,
}: CoverageCanvasProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const dragTargetRef = useRef<PointSelection | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const { containerRef, canvasRef, setBounds } = useCanvas2D(
    {
      initialBounds: state.bounds,
      draw(ctx, plot, theme) {
        const current = stateRef.current;
        drawPlotAxes(ctx, plot, theme);
        drawPixelGrid(
          ctx,
          plot,
          theme,
          current.triangles,
          current.rate,
          current.hoveredCell,
          current.pinnedCell,
          pixelGridBounds(plot),
          current.selectedPoint,
          current.selectedTriangleId,
        );
      },
      onLeftDown(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const point = pointFromPointer(e, canvas, plot);
        const target = closestVertex(point, stateRef.current.triangles, plot);
        if (target) {
          dragTargetRef.current = target;
          onSelectPoint(target);
          if (canvas) canvas.style.cursor = "grabbing";
          return true;
        }
        const cell = cellFromPoint(point, pixelGridBounds(plot));
        if (cell) {
          onTogglePinCell(cell);
          return true;
        }
        return false;
      },
      onLeftMove(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const target = dragTargetRef.current;
        if (!target) return;
        onMovePoint(
          target,
          clampToPlot(pointFromPointer(e, canvas, plot), plot),
        );
      },
      onLeftUp() {
        dragTargetRef.current = null;
        const canvas = canvasElementRef.current ?? canvasRef.current;
        if (canvas) canvas.style.cursor = "";
      },
      onHover(e, plot) {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        const point = pointFromPointer(e, canvas, plot);
        const target = closestVertex(point, stateRef.current.triangles, plot);
        if (canvas) canvas.style.cursor = target ? "grab" : "";
        onHoverCell(cellFromPoint(point, pixelGridBounds(plot)));
      },
      onPointerLeave() {
        const canvas = canvasElementRef.current ?? canvasRef.current;
        if (!dragTargetRef.current && canvas) {
          canvas.style.cursor = "";
        }
        onHoverCell(null);
      },
    },
    [state],
  );

  useEffect(() => {
    canvasElementRef.current = canvasRef.current;
  }, [canvasRef]);

  useEffect(() => {
    setBounds(state.bounds);
  }, [setBounds, state.bounds]);

  return (
    <div
      className={
        active
          ? "edge-function-console__canvas-view flex h-full w-full min-h-0 flex-1 flex-col"
          : "hidden"
      }
    >
      <div
        ref={containerRef}
        className="edge-function-console__canvas-surface relative h-full min-h-0 w-full flex-1 overflow-hidden"
        data-testid="coverage-canvas-container"
        data-view-x-min={state.bounds.xMin}
        data-view-x-max={state.bounds.xMax}
        data-view-y-min={state.bounds.yMin}
        data-view-y-max={state.bounds.yMax}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          aria-label="MSAA 覆盖：多三角形采样与深度测试画布"
          data-testid="coverage-canvas"
        />
        <CanvasToolbar onReset={() => setBounds(state.bounds)} />
        <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
      </div>
    </div>
  );
}

export default function EdgeFunctionRasterizerDemo() {
  const [mode, setMode] = useState<DemoMode>("probe");
  const [probeState, setProbeState] = useState<ProbeViewState>(() => ({
    triangle: cloneTriangle({ ...INITIAL_TRIANGLES[0], id: "T0" }),
    point: { x: 0.25, y: 0.25 },
    selectedPoint: null,
    draft: { x: "", y: "" },
    highlight: null,
    bounds: { ...VIEW_BOUNDS },
  }));
  const [coverageState, setCoverageState] = useState<CoverageViewState>(() => ({
    triangles: INITIAL_TRIANGLES.map(cloneTriangle),
    selectedTriangleId: "T0",
    selectedPoint: null,
    draft: { x: "", y: "" },
    rate: 4,
    hoveredCell: { x: 3, y: 3 },
    pinnedCell: null,
    bounds: { ...VIEW_BOUNDS },
  }));
  const nextTriangleNumberRef = useRef(3);

  const probeAnalysis = analyzeTriangle(probeState.triangle, probeState.point);
  const selectedCoverageTriangle =
    coverageState.triangles.find(
      (triangle) => triangle.id === coverageState.selectedTriangleId,
    ) ?? coverageState.triangles[0];
  const selectedProbePoint = pointAtProbeSelection(
    probeState,
    probeState.selectedPoint,
  );
  const selectedCoveragePoint = pointAtCoverageSelection(
    coverageState,
    coverageState.selectedPoint,
  );
  const activeSelection =
    mode === "probe" ? probeState.selectedPoint : coverageState.selectedPoint;
  const activePoint =
    mode === "probe" ? selectedProbePoint : selectedCoveragePoint;
  const activeLabel =
    activeSelection === null ? "" : pointSelectionLabel(activeSelection, mode);
  const activeDraft = mode === "probe" ? probeState.draft : coverageState.draft;
  const selectedCell = coverageState.pinnedCell ??
    coverageState.hoveredCell ?? { x: 3, y: 3 };
  const cellResult = pixelCoverage(
    coverageState.triangles,
    coverageState.rate,
    selectedCell,
    coverageState.bounds,
  );
  const triangleOptions = coverageState.triangles.map((triangle, index) => ({
    id: triangle.id,
    label: triangle.id + " · " + (index + 1),
  }));

  const handleTogglePinCell = (cell: PixelCell) => {
    setCoverageState((current) => {
      const isSame =
        current.pinnedCell?.x === cell.x && current.pinnedCell?.y === cell.y;
      return {
        ...current,
        pinnedCell: isSame ? null : cell,
      };
    });
  };

  const handleUnpinCell = () => {
    setCoverageState((current) => ({
      ...current,
      pinnedCell: null,
    }));
  };

  const selectProbePoint = (selection: PointSelection) => {
    setProbeState((current) => {
      const point = pointAtProbeSelection(current, selection);
      return {
        ...current,
        selectedPoint: selection,
        draft: point
          ? { x: formatInputValue(point.x), y: formatInputValue(point.y) }
          : current.draft,
      };
    });
  };

  const selectCoveragePoint = (selection: PointSelection) => {
    setCoverageState((current) => {
      const point = pointAtCoverageSelection(current, selection);
      return {
        ...current,
        selectedPoint: selection,
        selectedTriangleId:
          selection.kind === "vertex"
            ? (selection.triangleId ?? current.selectedTriangleId)
            : current.selectedTriangleId,
        draft: point
          ? { x: formatInputValue(point.x), y: formatInputValue(point.y) }
          : current.draft,
      };
    });
  };

  const moveProbePoint = (selection: PointSelection, point: Vec2) => {
    setProbeState((current) => {
      const next = updateProbeGeometry(current, selection, point);
      return {
        ...next,
        draft: samePointSelection(current.selectedPoint, selection)
          ? { x: formatInputValue(point.x), y: formatInputValue(point.y) }
          : current.draft,
      };
    });
  };

  const moveCoveragePoint = (selection: PointSelection, point: Vec2) => {
    setCoverageState((current) => {
      const next = updateCoverageGeometry(current, selection, point);
      return {
        ...next,
        draft: samePointSelection(current.selectedPoint, selection)
          ? { x: formatInputValue(point.x), y: formatInputValue(point.y) }
          : current.draft,
      };
    });
  };

  const changeCoordinate = (axis: "x" | "y", rawValue: string) => {
    if (mode === "probe") {
      setProbeState((current) => {
        const draft = { ...current.draft, [axis]: rawValue };
        const value = parseCoordinate(rawValue);
        const selection = current.selectedPoint;
        const point = pointAtProbeSelection(current, selection);
        if (value === null || !selection || !point) {
          return { ...current, draft };
        }
        const updated = updateProbeGeometry(current, selection, {
          ...point,
          [axis]: value,
        });
        return {
          ...updated,
          bounds: expandBoundsToInclude(current.bounds, probePoints(updated)),
          draft,
        };
      });
      return;
    }

    setCoverageState((current) => {
      const draft = { ...current.draft, [axis]: rawValue };
      const value = parseCoordinate(rawValue);
      const selection = current.selectedPoint;
      const point = pointAtCoverageSelection(current, selection);
      if (value === null || !selection || !point) {
        return { ...current, draft };
      }
      const updated = updateCoverageGeometry(current, selection, {
        ...point,
        [axis]: value,
      });
      return {
        ...updated,
        bounds: expandBoundsToInclude(current.bounds, coveragePoints(updated)),
        draft,
      };
    });
  };

  const restoreCoordinateDraft = (axis: "x" | "y") => {
    if (mode === "probe") {
      setProbeState((current) => {
        const point = pointAtProbeSelection(current, current.selectedPoint);
        if (!point) return current;
        return {
          ...current,
          draft: { ...current.draft, [axis]: formatInputValue(point[axis]) },
        };
      });
      return;
    }
    setCoverageState((current) => {
      const point = pointAtCoverageSelection(current, current.selectedPoint);
      if (!point) return current;
      return {
        ...current,
        draft: { ...current.draft, [axis]: formatInputValue(point[axis]) },
      };
    });
  };

  const handleAddTriangle = () => {
    if (coverageState.triangles.length >= TRIANGLE_LIMIT) return;
    const number = nextTriangleNumberRef.current;
    nextTriangleNumberRef.current += 1;
    const offset = ((number % 3) - 1) * 0.25;
    const id = "T" + number;
    const newDepth = generateAdaptiveRandomDepth(
      coverageState.triangles.map((triangle) => triangle.depth),
    );
    setCoverageState((current) => ({
      ...current,
      triangles: [
        ...current.triangles,
        {
          id,
          vertices: [
            { x: -1.5 + offset, y: -1 },
            { x: 1.5 + offset, y: -1 },
            { x: offset, y: 1.5 },
          ],
          depth: newDepth,
        },
      ],
      selectedTriangleId: id,
      selectedPoint: null,
      draft: { x: "", y: "" },
    }));
  };

  const moveTriangle = (triangleId: string, destination: "front" | "back") => {
    setCoverageState((current) => {
      const index = current.triangles.findIndex(
        (triangle) => triangle.id === triangleId,
      );
      if (index < 0) return current;
      const triangles = [...current.triangles];
      const [triangle] = triangles.splice(index, 1);
      if (destination === "front") triangles.unshift(triangle);
      else triangles.push(triangle);
      return { ...current, triangles };
    });
  };

  const removeSelectedTriangle = () => {
    if (coverageState.triangles.length <= 1 || !selectedCoverageTriangle) {
      return;
    }
    const triangles = coverageState.triangles.filter(
      (triangle) => triangle.id !== selectedCoverageTriangle.id,
    );
    setCoverageState((current) => ({
      ...current,
      triangles,
      selectedTriangleId: triangles[0].id,
      selectedPoint:
        current.selectedPoint?.triangleId === selectedCoverageTriangle.id
          ? null
          : current.selectedPoint,
      draft:
        current.selectedPoint?.triangleId === selectedCoverageTriangle.id
          ? { x: "", y: "" }
          : current.draft,
    }));
  };

  const updateSelectedDepth = (depth: number) => {
    if (!selectedCoverageTriangle) return;
    setCoverageState((current) => ({
      ...current,
      triangles: current.triangles.map((triangle) =>
        triangle.id === selectedCoverageTriangle.id
          ? { ...triangle, depth }
          : triangle,
      ),
    }));
  };

  const selectCoverageTriangle = (triangleId: string) => {
    setCoverageState((current) => ({
      ...current,
      selectedTriangleId: triangleId,
      selectedPoint: null,
      draft: { x: "", y: "" },
    }));
  };

  const probeHighlightDetails = (() => {
    const highlight = probeState.highlight;
    if (!highlight) {
      return "点击 D、Eᵢ 或 λᵢ 卡片，高亮对应的有向面积区域。";
    }
    if (highlight === "D") {
      return "D：完整三角形边界与 P₀→P₁、P₀→P₂；同时显示 P₀/P₁/P₂→P。";
    }
    const index = highlight.startsWith("E")
      ? Number(highlight.slice(1))
      : Number(highlight.slice(6));
    const pairs: [[number, number], [number, number], [number, number]] = [
      [1, 2],
      [2, 0],
      [0, 1],
    ];
    const [start, end] = pairs[index];
    const name = highlight.startsWith("E") ? "E" + index : "λ" + index;
    return (
      name +
      "：平行四边形；箭头放在三角形三边 P" +
      start +
      "→P" +
      end +
      "、P" +
      start +
      "→P、P" +
      end +
      "→P 上；平移边只显示边界线。"
    );
  })();

  const cardClass = (selected: boolean) =>
    selected
      ? "rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-accent)] bg-[var(--kde-accent)]/15 p-2.5 text-left ring-1 ring-[var(--kde-accent)]/50 transition cursor-pointer"
      : "rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-raised)] p-2.5 text-left transition hover:border-[var(--kde-accent)]/50 cursor-pointer";

  const viewTabs = (
    <KdeTabs<DemoMode>
      label="VIEW MODE"
      options={VIEW_OPTIONS}
      value={mode}
      onChange={(value) => setMode(value)}
      size="sm"
      variant="default"
    />
  );

  return (
    <AutoMath>
      <ExpandableDemo id="edge-function-rasterizer-demo">
        <KdeWindowShell
          channel="CH 03"
          title="Edge Function 与 MSAA 光栅化交互演示"
          eyebrow="BREEZE WORKSPACE · RASTERIZATION"
          mark="B"
          modeTag="RASTER"
          testId="edge-function-demo"
          tabs={viewTabs}
          display={
            <div className="relative h-full w-full min-h-[20rem] flex-1">
              <ProbeCanvas
                active={mode === "probe"}
                state={probeState}
                onSelectPoint={selectProbePoint}
                onMovePoint={moveProbePoint}
              />
              <CoverageCanvas
                active={mode === "coverage"}
                state={coverageState}
                onSelectPoint={selectCoveragePoint}
                onMovePoint={moveCoveragePoint}
                onHoverCell={(cell) =>
                  setCoverageState((current) => {
                    if (
                      current.hoveredCell?.x === cell?.x &&
                      current.hoveredCell?.y === cell?.y
                    ) {
                      return current;
                    }
                    return { ...current, hoveredCell: cell };
                  })
                }
                onTogglePinCell={handleTogglePinCell}
              />
            </div>
          }
          controls={
            <div className="flex flex-col gap-4">
              {mode === "coverage" && (
                <KdeGroupBox
                  title="MSAA CONFIGURATION"
                  action={
                    <KdeTabs<string>
                      label="采样率"
                      options={RATE_OPTIONS}
                      value={String(coverageState.rate)}
                      onChange={(value) =>
                        setCoverageState((current) => ({
                          ...current,
                          rate: Number(value) as MsaaRate,
                        }))
                      }
                      size="xs"
                      variant="pill"
                    />
                  }
                >
                  <p
                    className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-3 py-2 text-xs leading-relaxed text-[var(--kde-muted)]"
                    data-testid="msaa-sample-count"
                    data-console-panel
                  >
                    示意性规则采样布局：每像素{" "}
                    {sampleOffsets(coverageState.rate).length}{" "}
                    个样本，网格随当前视野适配；颜色显示深度测试后的可见三角形。
                  </p>
                </KdeGroupBox>
              )}

              {mode === "coverage" && selectedCoverageTriangle ? (
                <KdeCard
                  title="多三角形深度与图层管理"
                  badge={
                    <KdeBadge variant="primary">
                      {coverageState.triangles.length} / {TRIANGLE_LIMIT}{" "}
                      个三角形
                    </KdeBadge>
                  }
                  headerAction={
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddTriangle}
                        disabled={
                          coverageState.triangles.length >= TRIANGLE_LIMIT
                        }
                        className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-2 py-1 text-xs font-medium text-[var(--kde-ink)] transition hover:border-[var(--kde-accent)] hover:text-[var(--kde-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label="添加三角形"
                      >
                        + 添加
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedTriangle}
                        disabled={coverageState.triangles.length <= 1}
                        className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-2 py-1 text-xs font-medium text-[var(--kde-muted)] transition hover:border-[var(--kde-accent)] hover:text-[var(--kde-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={"删除 " + selectedCoverageTriangle.id}
                      >
                        删除
                      </button>
                    </div>
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <KdeTabs<string>
                      label="选中三角形"
                      options={triangleOptions}
                      value={selectedCoverageTriangle.id}
                      onChange={selectCoverageTriangle}
                      size="xs"
                      variant="pill"
                    />
                    <span
                      className="hidden text-xs text-[var(--kde-muted)]"
                      data-testid="triangle-count"
                    >
                      {coverageState.triangles.length} / {TRIANGLE_LIMIT}{" "}
                      个三角形
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div data-testid="selected-depth-control">
                      <ParamSlider
                        labelMode="adaptive"
                        label={
                          <span className="text-xs">
                            {selectedCoverageTriangle.id} 深度 z（越小越近）
                          </span>
                        }
                        min={0.05}
                        max={0.95}
                        step={0.05}
                        value={selectedCoverageTriangle.depth}
                        onChange={updateSelectedDepth}
                        widthClass="w-32"
                        display={formatNumber(selectedCoverageTriangle.depth)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          moveTriangle(selectedCoverageTriangle.id, "front")
                        }
                        disabled={
                          coverageState.triangles[0]?.id ===
                          selectedCoverageTriangle.id
                        }
                        className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-2.5 py-1 text-xs text-[var(--kde-muted)] transition hover:border-[var(--kde-accent)] hover:text-[var(--kde-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={
                          "将 " + selectedCoverageTriangle.id + " 提到最前"
                        }
                      >
                        提到最前
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          moveTriangle(selectedCoverageTriangle.id, "back")
                        }
                        disabled={
                          coverageState.triangles[
                            coverageState.triangles.length - 1
                          ]?.id === selectedCoverageTriangle.id
                        }
                        className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-2.5 py-1 text-xs text-[var(--kde-muted)] transition hover:border-[var(--kde-accent)] hover:text-[var(--kde-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={
                          "将 " + selectedCoverageTriangle.id + " 移到最后"
                        }
                      >
                        移到最后
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--kde-muted)]">
                    绘制顺序从前到后排列。每个 MSAA
                    样本独立做深度测试；较小深度通过严格小于比较获胜，同深度时先绘制者保留。
                  </p>
                </KdeCard>
              ) : null}

              {mode === "probe" && (
                <KdeGroupBox
                  title="PROBE COORDINATES & VERTICES"
                  subtitle="点击画布上的采样点或顶点，可直接输入精确坐标；拖动点也会实时同步数值与计算。"
                />
              )}

              {activeSelection && activePoint ? (
                <div
                  className="flex flex-col gap-2.5 rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-accent)]/50 bg-[var(--kde-accent)]/10 p-3"
                  data-testid="selected-point-editor"
                  data-console-panel
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-[var(--kde-muted)]">
                      正在编辑
                    </div>
                    <div
                      className="font-mono text-sm font-semibold text-[var(--kde-accent)]"
                      data-testid="selected-point-label"
                    >
                      {activeLabel}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--kde-muted)]">
                      <span className="font-mono font-medium">x</span>
                      <input
                        type="number"
                        step="any"
                        value={activeDraft.x}
                        onChange={(event) =>
                          changeCoordinate("x", event.currentTarget.value)
                        }
                        onBlur={() => restoreCoordinateDraft("x")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        aria-label={activeLabel + " x 坐标"}
                        data-testid="selected-coordinate-x"
                        className="w-full min-w-0 rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-raised)] px-2 py-1.5 font-mono text-sm text-[var(--kde-ink)] outline-none focus:border-[var(--kde-accent)] focus:ring-2 focus:ring-[var(--kde-accent)]/20"
                      />
                    </label>
                    <label className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--kde-muted)]">
                      <span className="font-mono font-medium">y</span>
                      <input
                        type="number"
                        step="any"
                        value={activeDraft.y}
                        onChange={(event) =>
                          changeCoordinate("y", event.currentTarget.value)
                        }
                        onBlur={() => restoreCoordinateDraft("y")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        aria-label={activeLabel + " y 坐标"}
                        data-testid="selected-coordinate-y"
                        className="w-full min-w-0 rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-raised)] px-2 py-1.5 font-mono text-sm text-[var(--kde-ink)] outline-none focus:border-[var(--kde-accent)] focus:ring-2 focus:ring-[var(--kde-accent)]/20"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <p
                  className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-3 py-2 text-xs text-[var(--kde-muted)]"
                  data-testid="point-editor-hint"
                  data-console-panel
                >
                  点击画布上的采样点或顶点，可直接输入坐标；拖动点也会同步数值。
                </p>
              )}
            </div>
          }
          footer={
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--kde-border)]/50 pb-1.5 text-[0.62rem] font-medium tracking-wider text-[var(--kde-muted)]">
                <span>LIVE READOUTS</span>
                <span>
                  {mode === "probe" ? "EDGE / BARYCENTRIC" : "MSAA / DEPTH"}
                </span>
              </div>
              {mode === "probe" ? (
                <KdeCard
                  title="边函数与重心坐标代数特征"
                  badge={
                    <KdeBadge
                      variant={
                        probeAnalysis.degenerate
                          ? "warning"
                          : probeAnalysis.inside
                            ? "success"
                            : "default"
                      }
                    >
                      {probeAnalysis.degenerate
                        ? "退化三角形"
                        : probeAnalysis.inside
                          ? "点在内部"
                          : "点在外部"}
                    </KdeBadge>
                  }
                  headerAction={
                    <span
                      className="text-xs text-[var(--kde-muted)]"
                      data-testid="probe-vector-summary"
                    >
                      向量：P₀→P · P₁→P · P₂→P
                    </span>
                  }
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className="text-xs leading-relaxed text-[var(--kde-muted)]"
                        data-testid="probe-highlight-summary"
                      >
                        {probeHighlightDetails}
                      </p>
                      <span
                        className={
                          probeAnalysis.degenerate
                            ? "rounded-[var(--kde-control-radius,0.35rem)] bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
                            : probeAnalysis.inside
                              ? "rounded-[var(--kde-control-radius,0.35rem)] bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                              : "rounded-[var(--kde-control-radius,0.35rem)] bg-[var(--kde-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--kde-muted)]"
                        }
                        data-testid="probe-status"
                      >
                        {probeAnalysis.degenerate
                          ? "退化三角形"
                          : probeAnalysis.inside
                            ? "采样点在三角形内"
                            : "采样点在三角形外"}
                      </span>
                    </div>
                  }
                >
                  <span className="hidden" data-testid="probe-triangle-count">
                    1 个三角形
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 pb-2">
                    <div className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] p-2.5">
                      <div className="text-xs text-[var(--kde-muted)]">
                        采样点 P
                      </div>
                      <div
                        className="mt-1 font-mono text-sm text-[var(--kde-ink)] font-bold"
                        data-testid="probe-point"
                      >
                        ({formatNumber(probeState.point.x)},{" "}
                        {formatNumber(probeState.point.y)})
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-pressed={probeState.highlight === "D"}
                      onClick={() =>
                        setProbeState((current) => ({
                          ...current,
                          highlight: "D",
                        }))
                      }
                      className={cardClass(probeState.highlight === "D")}
                      data-testid="probe-card-D"
                      data-console-readout
                    >
                      <div className="text-xs text-[var(--kde-muted)]">
                        有向双面积 D
                      </div>
                      <div
                        className="mt-1 font-mono text-sm text-[var(--kde-ink)] font-bold"
                        data-testid="probe-determinant"
                      >
                        {formatNumber(probeAnalysis.determinant)}
                      </div>
                    </button>
                    {probeAnalysis.edgeFunctions.map((value, index) => {
                      const id = ("E" + index) as ProbeHighlight;
                      const selected = probeState.highlight === id;
                      return (
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setProbeState((current) => ({
                              ...current,
                              highlight: id,
                            }))
                          }
                          className={cardClass(selected)}
                          key={index}
                          data-testid={"probe-card-E" + index}
                          data-console-readout
                        >
                          <div className="text-xs text-[var(--kde-muted)]">
                            E{index}（对边函数）
                          </div>
                          <div
                            className="mt-1 font-mono text-sm text-[var(--kde-ink)] font-bold"
                            data-testid={"probe-edge-" + index}
                          >
                            {formatNumber(value)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[0, 1, 2].map((index) => {
                      const id = ("lambda" + index) as ProbeHighlight;
                      const selected = probeState.highlight === id;
                      const weight = probeAnalysis.weights?.[index];
                      return (
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setProbeState((current) => ({
                              ...current,
                              highlight: id,
                            }))
                          }
                          className={cardClass(selected)}
                          key={index}
                          data-testid={"probe-card-lambda" + index}
                          data-console-readout
                        >
                          <div className="text-xs text-[var(--kde-muted)]">
                            重心坐标 λ{index}
                          </div>
                          <div
                            className="mt-1 font-mono text-sm text-[var(--kde-ink)] font-bold"
                            data-testid={"probe-weight-" + index}
                          >
                            {weight === undefined || weight === null
                              ? "未定义"
                              : formatNumber(weight)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </KdeCard>
              ) : null}

              {mode === "coverage" && cellResult ? (
                <KdeCard
                  title={`像素 (${selectedCell.x}, ${selectedCell.y}) 覆盖详情`}
                  badge={
                    <KdeBadge variant="primary">
                      {cellResult.offsets.length} 个样本
                    </KdeBadge>
                  }
                  headerAction={
                    coverageState.pinnedCell ? (
                      <button
                        type="button"
                        onClick={handleUnpinCell}
                        className="inline-flex items-center gap-1 rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-accent)]/50 bg-[var(--kde-accent)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--kde-accent)] transition hover:bg-[var(--kde-accent)]/25"
                        title="点击解除像素锁定"
                      >
                        <span>📌 已锁定</span>
                        <span className="text-[10px] opacity-70">✕</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] px-2 py-0.5 text-[10px] text-[var(--kde-muted)]">
                        实时悬停（点击画布格锁定）
                      </span>
                    )
                  }
                  footer={
                    <div
                      className="text-xs text-[var(--kde-muted)]"
                      data-testid="pixel-winner-summary"
                    >
                      最终可见样本：
                      {coverageState.triangles
                        .map((triangle) => {
                          const count =
                            cellResult.winnerMasks
                              .get(triangle.id)
                              ?.filter(Boolean).length ?? 0;
                          return count > 0
                            ? " " +
                                triangle.id +
                                " " +
                                count +
                                "/" +
                                coverageState.rate
                            : "";
                        })
                        .filter(Boolean)
                        .join(" · ") || " 无三角形覆盖"}
                    </div>
                  }
                >
                  <span className="hidden" data-testid="pixel-sample-count">
                    {cellResult.offsets.length} 个样本
                  </span>
                  <p className="mb-2 text-xs leading-relaxed text-[var(--kde-muted)]">
                    每个掩码按 s{cellResult.offsets.length - 1}…s0
                    显示，最低位对应
                    s0；“几何覆盖”不含深度遮挡，“最终可见”应用绘制顺序和深度测试。
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {coverageState.triangles.map((triangle) => {
                      const geometricMask =
                        cellResult.triangleMasks.get(triangle.id) ?? [];
                      const visibleMask =
                        cellResult.winnerMasks.get(triangle.id) ?? [];
                      return (
                        <div
                          className="rounded-[var(--kde-control-radius,0.35rem)] border border-[var(--kde-border)] bg-[var(--kde-panel)] p-2.5"
                          key={triangle.id}
                          data-testid={"pixel-triangle-" + triangle.id}
                        >
                          <div className="text-xs font-semibold text-[var(--kde-ink)]">
                            {triangle.id} · z={formatNumber(triangle.depth)}
                          </div>
                          <div
                            className="mt-1 font-mono text-[11px] text-[var(--kde-muted)]"
                            data-testid={"pixel-mask-" + triangle.id}
                          >
                            几何 {formatMask(geometricMask)}（
                            {geometricMask.filter(Boolean).length}/
                            {coverageState.rate}）
                          </div>
                          <div
                            className="font-mono text-[11px] text-[var(--kde-muted)]"
                            data-testid={"pixel-visible-mask-" + triangle.id}
                          >
                            可见 {formatMask(visibleMask)}（
                            {visibleMask.filter(Boolean).length}/
                            {coverageState.rate}）
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </KdeCard>
              ) : null}
            </div>
          }
        />
      </ExpandableDemo>
    </AutoMath>
  );
}
