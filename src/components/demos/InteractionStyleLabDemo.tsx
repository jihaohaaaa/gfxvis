import "./InteractionStyleLabDemo.css";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  drawAdaptiveAxes,
  drawArrow,
  drawDragGizmo,
  drawDragGuideTrack,
  drawPoint,
  drawSegment,
  getVisibleBounds,
  type ThemeColors,
} from "../../visualizations/core/2d/plot2d";
import {
  DEFAULT_X,
  PROBE_CLAMP,
  PROJECTION_BOUNDS,
  PROJECTION_TARGETS,
  type ProjectionModeId,
  type ProjectionTargetId,
} from "../../visualizations/scenes/linear-algebra/projection2d";
import { clamp } from "@math";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import Checkbox from "../framework/Checkbox";
import AutoMath from "../framework/AutoMath";
import ExpandableDemo, { useExpandable } from "../framework/ExpandableDemo";
import KdeWindowShell from "../framework/KdeWindowShell";
import KdeCard from "../framework/KdeCard";
import KdeGroupBox from "../framework/KdeGroupBox";
import KdeReadout from "../framework/KdeReadout";
import KdeBadge from "../framework/KdeBadge";
import InteractiveLayout, {
  type InteractiveLayoutPreset,
} from "../framework/InteractiveLayout";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector from "../framework/PresetSelector";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

type InteractionStyle = "kde" | "instrument";

interface Props {
  variant: InteractionStyle;
  layout?: InteractiveLayoutPreset;
  preset?: InteractiveLayoutPreset;
  "data-fixed-layout"?: InteractiveLayoutPreset;
}

type PlotColors = Pick<ThemeColors, "ink" | "muted" | "border" | "accent">;
type WorkspaceTabId = "geometry" | "algebra" | "residual";

const TARGET_OPTIONS: { id: ProjectionTargetId; label: string }[] = [
  { id: "x-axis", label: "x 轴" },
  { id: "line-yx", label: "y = x" },
];

const MODE_OPTIONS: readonly KdeTabOption<ProjectionModeId>[] = [
  { id: "orthogonal", label: "正交" },
  { id: "oblique", label: "斜投影" },
];

const WORKSPACE_TABS: readonly KdeTabOption<WorkspaceTabId>[] = [
  { id: "geometry", label: "几何投影", badge: "2D" },
  { id: "algebra", label: "代数矩阵", badge: "P" },
  { id: "residual", label: "正交余空间", badge: "I-P" },
];

const LAYOUT_OPTIONS: readonly KdeTabOption<InteractiveLayoutPreset>[] = [
  { id: "side-right", label: "侧边控制架" },
  { id: "bottom-split", label: "画布下方" },
  { id: "three-column", label: "三栏工作台" },
  { id: "dense-dock", label: "密集控制 Dock" },
  { id: "dual-view", label: "双画布对照" },
  { id: "side-left", label: "左侧控制架" },
];

const STYLE_META: Record<
  InteractionStyle,
  {
    eyebrow: string;
    windowTitle: string;
    mark: string;
    targetLabel: string;
    modeLabel: string;
  }
> = {
  kde: {
    eyebrow: "BREEZE WORKSPACE · PROJECTION LAB",
    windowTitle: "Projection Workbench",
    mark: "B",
    targetLabel: "投影子空间",
    modeLabel: "投影模式",
  },
  instrument: {
    eyebrow: "VECTOR CHANNEL / 01",
    windowTitle: "Projection Instrument",
    mark: "CH1",
    targetLabel: "TARGET",
    modeLabel: "MODE",
  },
};

const PLOT_COLORS: Record<
  InteractionStyle,
  { light: PlotColors; dark: PlotColors }
> = {
  kde: {
    light: {
      ink: "#29323a",
      muted: "#697780",
      border: "#bdcbd3",
      accent: "#2596c9",
    },
    dark: {
      ink: "#e9f1f5",
      muted: "#9db0ba",
      border: "#46545c",
      accent: "#62c8f5",
    },
  },
  instrument: {
    light: {
      ink: "#1c3326",
      muted: "#587260",
      border: "#9eb5a3",
      accent: "#078747",
    },
    dark: {
      ink: "#dfffe8",
      muted: "#8fb89c",
      border: "#385440",
      accent: "#68f69a",
    },
  },
};

function getLuminance(color: string): number {
  const hex = color.trim().replace(/^#/, "");
  if (hex.length !== 6) return 0.5;
  const channels = [0, 2, 4].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  );
}

function getPlotTheme(
  style: InteractionStyle,
  theme: ThemeColors,
): ThemeColors {
  const tone =
    getLuminance(theme.ink) > getLuminance(theme.bg) ? "dark" : "light";
  return { ...theme, ...PLOT_COLORS[style][tone] };
}

function formatPair(x: number, y: number): string {
  return `(${x.toFixed(2)}, ${y.toFixed(2)})`;
}

export default function InteractionStyleLabDemo({
  variant,
  layout,
  preset,
  "data-fixed-layout": dataFixedLayoutProp,
}: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("geometry");
  const [targetId, setTargetId] = useState<ProjectionTargetId>("x-axis");
  const [modeId, setModeId] = useState<ProjectionModeId>("orthogonal");
  const [selectedLayout, setSelectedLayout] =
    useState<InteractiveLayoutPreset>("side-right");
  const layoutPreset =
    layout ?? preset ?? dataFixedLayoutProp ?? selectedLayout;
  const [probe, setProbe] = useState(DEFAULT_X);
  const [showInputVector, setShowInputVector] = useState(true);
  const [showResidual, setShowResidual] = useState(true);
  const [showGizmo, setShowGizmo] = useState(true);
  const target = PROJECTION_TARGETS[targetId];
  const mode = target.modes[modeId];
  const projected = mode.project(probe.x, probe.y);
  const residual = [probe.x - projected[0], probe.y - projected[1]] as const;
  const meta = STYLE_META[variant];

  const gizmoArrows = useMemo(() => {
    const directionSubspace =
      targetId === "x-axis" ? { x: 1, y: 0 } : { x: 1, y: 1 };
    let directionResidual = { x: 0, y: 1 };
    if (targetId === "line-yx") {
      directionResidual =
        modeId === "orthogonal" ? { x: -1, y: 1 } : { x: 0, y: 1 };
    }
    return [
      {
        id: "subspace",
        direction: directionSubspace,
        color: "#2563eb",
        label: "L",
        lengthPx: 34,
      },
      {
        id: "residual",
        direction: directionResidual,
        color: "#64748b",
        label: "L^⊥",
        lengthPx: 34,
      },
    ];
  }, [targetId, modeId]);

  const dragHandlers = useVectorDrag<"probe">({
    targets: [
      {
        id: "probe",
        x: probe.x,
        y: probe.y,
        bounds: PROBE_CLAMP,
        arrows: gizmoArrows,
      },
    ],
    onDrag(_, pos) {
      setProbe({
        x: clamp(pos.x, PROBE_CLAMP.xMin, PROBE_CLAMP.xMax),
        y: clamp(pos.y, PROBE_CLAMP.yMin, PROBE_CLAMP.yMax),
      });
    },
  });

  const { containerRef, canvasRef, redraw, resetBounds } = useCanvas2D(
    {
      initialBounds: PROJECTION_BOUNDS,
      margin: 24,
      onLeftDown: dragHandlers.onLeftDown,
      onLeftMove: dragHandlers.onLeftMove,
      onLeftUp: dragHandlers.onLeftUp,
      onHover: dragHandlers.onHover,
      onPointerLeave: dragHandlers.onPointerLeave,
      draw(ctx, plot, theme) {
        const currentTarget = PROJECTION_TARGETS[targetId];
        const currentMode = currentTarget.modes[modeId];
        const [px, py] = currentMode.project(probe.x, probe.y);
        const visible = getVisibleBounds(plot);
        const plotTheme = getPlotTheme(variant, theme);
        drawAdaptiveAxes(ctx, plot, plotTheme);

        const activeTrack = dragHandlers.getActiveTrack();
        if (activeTrack) drawDragGuideTrack(ctx, plot, activeTrack);

        if (targetId === "x-axis") {
          drawSegment(ctx, plot, visible.xMin, 0, visible.xMax, 0, {
            color: plotTheme.border,
            width: 3,
          });
        } else {
          const minVal = Math.min(visible.xMin, visible.yMin);
          const maxVal = Math.max(visible.xMax, visible.yMax);
          drawSegment(ctx, plot, minVal, minVal, maxVal, maxVal, {
            color: plotTheme.border,
            width: 3,
          });
        }

        const originX = plot.toScreenX(0);
        const originY = plot.toScreenY(0);
        const inputX = plot.toScreenX(probe.x);
        const inputY = plot.toScreenY(probe.y);
        const projectedX = plot.toScreenX(px);
        const projectedY = plot.toScreenY(py);

        if (showResidual) {
          drawSegment(ctx, plot, px, py, probe.x, probe.y, {
            color: plotTheme.muted,
            width: 1.8,
            dash: [5, 4],
          });
        }
        if (showInputVector) {
          drawArrow(
            ctx,
            originX,
            originY,
            inputX - originX,
            inputY - originY,
            plotTheme.ink,
            10,
            7,
            2.4,
          );
        }
        drawArrow(
          ctx,
          originX,
          originY,
          projectedX - originX,
          projectedY - originY,
          plotTheme.accent,
          10,
          7,
          2.6,
        );
        drawPoint(ctx, plot, px, py, {
          color: plotTheme.accent,
          filled: false,
          radius: 6,
          width: 2,
        });
        if (showGizmo) {
          drawDragGizmo(ctx, plot, probe.x, probe.y, {
            color: plotTheme.ink,
            isHoveredCenter: dragHandlers.isCenterHovered("probe"),
            isDraggingCenter: dragHandlers.isCenterDragging("probe"),
            hoveredArrowId: dragHandlers.getHoveredArrowId("probe"),
            draggingArrowId: dragHandlers.getDraggingArrowId("probe"),
            arrows: gizmoArrows,
            opacity: dragHandlers.getOpacity("probe"),
          });
        }
      },
    },
    [
      probe,
      targetId,
      modeId,
      variant,
      showInputVector,
      showResidual,
      showGizmo,
    ],
  );

  const secondaryCanvasState = useCanvas2D(
    {
      initialBounds: PROJECTION_BOUNDS,
      margin: 24,
      onLeftDown: dragHandlers.onLeftDown,
      onLeftMove: dragHandlers.onLeftMove,
      onLeftUp: dragHandlers.onLeftUp,
      onHover: dragHandlers.onHover,
      onPointerLeave: dragHandlers.onPointerLeave,
      draw(ctx, plot, theme) {
        const currentTarget = PROJECTION_TARGETS[targetId];
        const currentMode = currentTarget.modes[modeId];
        const [px, py] = currentMode.project(probe.x, probe.y);
        const visible = getVisibleBounds(plot);
        const plotTheme = getPlotTheme(variant, theme);
        drawAdaptiveAxes(ctx, plot, plotTheme);
        const minVal = Math.min(visible.xMin, visible.yMin);
        const maxVal = Math.max(visible.xMax, visible.yMax);
        if (targetId === "x-axis") {
          drawSegment(ctx, plot, visible.xMin, 0, visible.xMax, 0, {
            color: plotTheme.border,
            width: 3,
          });
        } else {
          drawSegment(ctx, plot, minVal, minVal, maxVal, maxVal, {
            color: plotTheme.border,
            width: 3,
          });
        }
        const ox = plot.toScreenX(0);
        const oy = plot.toScreenY(0);
        const projectedX = plot.toScreenX(px);
        const projectedY = plot.toScreenY(py);
        const inputX = plot.toScreenX(probe.x);
        const inputY = plot.toScreenY(probe.y);
        drawArrow(
          ctx,
          ox,
          oy,
          projectedX - ox,
          projectedY - oy,
          plotTheme.accent,
          10,
          7,
          2.8,
        );
        if (showResidual) {
          drawSegment(ctx, plot, px, py, probe.x, probe.y, {
            color: plotTheme.muted,
            width: 2,
            dash: [5, 4],
          });
        }
        drawPoint(ctx, plot, px, py, {
          color: plotTheme.accent,
          filled: true,
          radius: 7,
        });
        drawPoint(ctx, plot, probe.x, probe.y, {
          color: plotTheme.ink,
          filled: false,
          radius: 7,
          width: 2,
        });
        if (showInputVector) {
          drawArrow(
            ctx,
            ox,
            oy,
            inputX - ox,
            inputY - oy,
            plotTheme.ink,
            10,
            7,
            1.8,
          );
        }
      },
    },
    [probe, targetId, modeId, variant, showInputVector, showResidual],
  );

  useEffect(() => {
    if (activeTab === "geometry") {
      const frame = requestAnimationFrame(() => {
        redraw();
        if (layoutPreset === "dual-view") {
          secondaryCanvasState.redraw();
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activeTab, layoutPreset, redraw, secondaryCanvasState.redraw]);

  const targetControl = (
    <PresetSelector
      label={meta.targetLabel}
      options={TARGET_OPTIONS}
      value={targetId}
      onChange={setTargetId}
      className="style-lab__target-selector w-full"
    />
  );

  const modeControl = (
    <KdeTabs<ProjectionModeId>
      options={MODE_OPTIONS}
      value={modeId}
      onChange={(id: ProjectionModeId) => setModeId(id)}
      size="xs"
      variant="pill"
      className="style-lab__mode-tabs"
    />
  );

  const sliders = (
    <div className="style-lab__sliders flex flex-col gap-2">
      <ParamSlider
        label="$x$"
        min={PROBE_CLAMP.xMin}
        max={PROBE_CLAMP.xMax}
        step={0.05}
        value={probe.x}
        onChange={(x: number) => setProbe((current) => ({ ...current, x }))}
        widthClass="w-full"
      />
      <ParamSlider
        label="$y$"
        min={PROBE_CLAMP.yMin}
        max={PROBE_CLAMP.yMax}
        step={0.05}
        value={probe.y}
        onChange={(y: number) => setProbe((current) => ({ ...current, y }))}
        widthClass="w-full"
      />
      <div className="flex items-center gap-1.5 mt-0.5">
        <KdeBadge variant="primary">BOUNDS [-4, 4]</KdeBadge>
        <KdeBadge variant="neutral">STEP 0.05</KdeBadge>
      </div>
    </div>
  );

  const readouts = (
    <div
      className="style-lab__readouts grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      aria-live="polite"
    >
      <KdeReadout
        label="输入向量 $\mathbf{x}$"
        value={formatPair(probe.x, probe.y)}
      />
      <KdeReadout label="投影矩阵 $P$" value={`$P = ${mode.tex}$`} />
      <KdeReadout
        label="投影 $P\mathbf{x}$"
        value={formatPair(projected[0], projected[1])}
        variant="accent"
      />
      <KdeReadout
        label="残差 $(I - P)\mathbf{x}$"
        value={formatPair(residual[0], residual[1])}
      />
    </div>
  );

  const canvas = (
    <div
      ref={containerRef}
      className={`style-lab__canvas-frame relative h-[var(--demo-height,100%)] min-h-[20rem] w-full overflow-hidden ${
        activeTab === "geometry" ? "" : "hidden"
      }`}
    >
      <CanvasToolbar
        onReset={resetBounds}
        className="style-lab__canvas-toolbar"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label={`二维向量投影图，投影目标为 ${target.label}，模式为 ${mode.label}`}
      />
      <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
    </div>
  );

  const algebraView = (
    <div className="flex h-full min-h-[20rem] flex-col gap-3 overflow-y-auto bg-[var(--kde-canvas,#ffffff)] p-4 text-[var(--kde-ink,#232629)]">
      <div className="flex items-center justify-between border-b border-[var(--kde-border,#bec5cc)] pb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs sm:text-sm font-bold tracking-tight">
            投影算子代数结构与特征谱
          </h4>
          <KdeBadge variant="primary">
            {targetId === "x-axis" ? "X-AXIS SUBSPACE" : "DIAGONAL Y=X"}
          </KdeBadge>
          <KdeBadge variant={modeId === "orthogonal" ? "success" : "warning"}>
            {modeId.toUpperCase()}
          </KdeBadge>
        </div>
        <KdeBadge variant="neutral">DIM = 2, RANK = 1</KdeBadge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <KdeCard
          title="投影矩阵形式"
          variant="highlight"
          badge={<KdeBadge variant="primary">P</KdeBadge>}
        >
          <div className="my-1 text-sm">{`$$P = ${mode.tex}$$`}</div>
          <p className="mt-2 text-xs text-[var(--kde-muted,#626b73)]">
            {modeId === "orthogonal"
              ? "正交投影算子具备对称性 $P^\\top = P$ 与幂等性 $P^2 = P$。"
              : "斜投影算子保持幂等性 $P^2 = P$，但非对称 $P^\\top \\neq P$。"}
          </p>
        </KdeCard>

        <KdeCard
          title="代数不变量"
          badge={<KdeBadge variant="success">INVARIANTS</KdeBadge>}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <span className="block text-[var(--kde-muted,#626b73)]">
                {"矩阵迹 $\\operatorname{tr}(P)$"}
              </span>
              <strong className="font-mono text-sm">1.00 (Rank 1)</strong>
            </div>
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <span className="block text-[var(--kde-muted,#626b73)]">
                {"行列式 $\\det(P)$"}
              </span>
              <strong className="font-mono text-sm">0.00 (Singular)</strong>
            </div>
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <span className="block text-[var(--kde-muted,#626b73)]">
                {"幂等方程 $P^2 - P$"}
              </span>
              <strong className="font-mono text-sm text-[var(--kde-success,#27ae60)]">
                0 (Exact)
              </strong>
            </div>
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <span className="block text-[var(--kde-muted,#626b73)]">
                {"正规性 $P^\\top P - P P^\\top$"}
              </span>
              <strong className="font-mono text-sm">
                {modeId === "orthogonal" ? "0 (Normal)" : "≠ 0 (Non-normal)"}
              </strong>
            </div>
          </div>
        </KdeCard>

        <KdeCard title="特征值与特征子空间" className="md:col-span-2">
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded border border-[var(--kde-border,#bec5cc)] bg-[var(--kde-raised,#fcfcfd)] p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <strong className="text-[var(--kde-accent,#3daee9)]">
                  {"$\\lambda_1 = 1$（保持子空间）"}
                </strong>
                <KdeBadge variant="primary">
                  {"值域 $\\operatorname{Im}(P)$"}
                </KdeBadge>
              </div>
              <p className="text-[var(--kde-muted,#626b73)]">
                {
                  "所有位于投影目标线上的向量满足 $P\\mathbf{v} = 1\\cdot\\mathbf{v}$，投影后保持不变。"
                }
              </p>
            </div>
            <div className="rounded border border-[var(--kde-border,#bec5cc)] bg-[var(--kde-raised,#fcfcfd)] p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <strong className="text-[var(--kde-danger,#da4453)]">
                  {"$\\lambda_2 = 0$（湮灭子空间）"}
                </strong>
                <KdeBadge variant="danger">
                  {"零空间 $\\operatorname{ker}(P)$"}
                </KdeBadge>
              </div>
              <p className="text-[var(--kde-muted,#626b73)]">
                {
                  "沿投影方向的向量满足 $P\\mathbf{v} = 0\\cdot\\mathbf{v} = \\mathbf{0}$，完全被压缩湮灭。"
                }
              </p>
            </div>
          </div>
        </KdeCard>
      </div>
    </div>
  );

  const residualView = (
    <div className="flex h-full min-h-[20rem] flex-col gap-3 overflow-y-auto bg-[var(--kde-canvas,#ffffff)] p-4 text-[var(--kde-ink,#232629)]">
      <div className="flex items-center justify-between border-b border-[var(--kde-border,#bec5cc)] pb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs sm:text-sm font-bold tracking-tight">
            正交补空间与残差直和分解
          </h4>
          <KdeBadge variant="success">
            {"DIRECT SUM $\\mathbb{R}^2 = V \\oplus V^\\perp$"}
          </KdeBadge>
        </div>
        <KdeBadge variant="neutral">
          {"$\\mathbf{x} = P\\mathbf{x} + (I-P)\\mathbf{x}$"}
        </KdeBadge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <KdeCard title="直和向量分解" variant="highlight">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded bg-[var(--kde-panel,#eff0f1)] p-2 font-mono">
              <span>{"原向量 $\\mathbf{x}$"}</span>
              <strong>{formatPair(probe.x, probe.y)}</strong>
            </div>
            <div className="flex items-center justify-between rounded bg-[var(--kde-panel,#eff0f1)] p-2 font-mono text-[var(--kde-accent,#3daee9)]">
              <span>{"像空间分量 $P\\mathbf{x}$"}</span>
              <strong>{formatPair(projected[0], projected[1])}</strong>
            </div>
            <div className="flex items-center justify-between rounded bg-[var(--kde-panel,#eff0f1)] p-2 font-mono text-[var(--kde-muted,#626b73)]">
              <span>{"余空间残差 $(I-P)\\mathbf{x}$"}</span>
              <strong>{formatPair(residual[0], residual[1])}</strong>
            </div>
          </div>
        </KdeCard>

        <KdeCard title="正交几何度量与能量守恒">
          <div className="space-y-2.5 text-xs">
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <div className="flex justify-between">
                <span className="text-[var(--kde-muted,#626b73)]">
                  {
                    "正交内积 $\\langle P\\mathbf{x}, (I-P)\\mathbf{x} \\rangle$"
                  }
                </span>
                <strong className="font-mono">
                  {(
                    projected[0] * residual[0] +
                    projected[1] * residual[1]
                  ).toFixed(4)}
                </strong>
              </div>
              <span className="mt-0.5 block text-[0.68rem] text-[var(--kde-muted,#626b73)]">
                {modeId === "orthogonal"
                  ? "严格为 0（几何正交）"
                  : "非零（斜投影非正交补）"}
              </span>
            </div>
            <div className="rounded bg-[var(--kde-panel,#eff0f1)] p-2">
              <div className="flex justify-between">
                <span className="text-[var(--kde-muted,#626b73)]">
                  {
                    "能量守恒 $\\|\\mathbf{x}\\|^2 = \\|P\\mathbf{x}\\|^2 + \\|(I-P)\\mathbf{x}\\|^2$"
                  }
                </span>
                <strong className="font-mono">
                  {Math.pow(Math.hypot(probe.x, probe.y), 2).toFixed(2)} ={" "}
                  {(
                    Math.pow(Math.hypot(projected[0], projected[1]), 2) +
                    Math.pow(Math.hypot(residual[0], residual[1]), 2)
                  ).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        </KdeCard>

        <KdeCard title="互补投影算子 $Q = I - P$" className="md:col-span-2">
          <p className="text-xs text-[var(--kde-muted,#626b73)]">
            {
              "算子 $Q = I - P$ 同样是幂等投影算子（$Q^2 = Q$），其像空间为 $P$ 的核空间 $\\operatorname{Im}(Q) = \\operatorname{ker}(P)$。它将任意向量投射到正交补空间。"
            }
          </p>
        </KdeCard>
      </div>
    </div>
  );

  const workspaceDisplay = (
    <div className="relative h-full w-full min-h-[20rem]">
      {canvas}
      {activeTab === "algebra" && algebraView}
      {activeTab === "residual" && residualView}
    </div>
  );

  const layoutSelector = layout ? undefined : (
    <KdeTabs<InteractiveLayoutPreset>
      options={LAYOUT_OPTIONS}
      value={selectedLayout}
      onChange={setSelectedLayout}
      label="区域布局"
      size="xs"
      variant="subtle"
      className="style-lab__layout-selector"
    />
  );

  const controlPanel = (
    <aside
      className={`style-lab__control-panel style-lab__control-panel--${variant} ${variant === "instrument" ? "style-lab__instrument-rack" : ""}`}
      data-control-panel={variant}
    >
      <KdeGroupBox title="PROJECTION SUBSPACE / 投影子空间">
        {targetControl}
      </KdeGroupBox>

      <KdeGroupBox title="PROJECTION MODE / 投影模式">
        {modeControl}
      </KdeGroupBox>

      <KdeGroupBox title="VECTOR PROBE / 探测向量">{sliders}</KdeGroupBox>

      {layoutPreset !== "dense-dock" && (
        <KdeGroupBox title="DISPLAY LAYERS / 显示图层">
          <div className="flex flex-col gap-1.5">
            <Checkbox
              label="输入向量"
              checked={showInputVector}
              onChange={setShowInputVector}
            />
            <Checkbox
              label="投影残差"
              checked={showResidual}
              onChange={setShowResidual}
            />
            <Checkbox
              label="拖拽 Gizmo"
              checked={showGizmo}
              onChange={setShowGizmo}
            />
          </div>
        </KdeGroupBox>
      )}

      {layoutPreset === "dense-dock" ? (
        <>
          <KdeCard title="显示层" testId="dense-dock-controls" variant="dense">
            <div className="flex flex-col gap-1.5">
              <Checkbox
                label="输入向量"
                checked={showInputVector}
                onChange={setShowInputVector}
              />
              <Checkbox
                label="投影残差"
                checked={showResidual}
                onChange={setShowResidual}
              />
              <Checkbox
                label="拖拽 Gizmo"
                checked={showGizmo}
                onChange={setShowGizmo}
              />
            </div>
          </KdeCard>
          <KdeCard title="辅助通道 A" testId="dense-dock-dummy" variant="dense">
            <div className="style-lab__dense-dummy-grid">
              <span>
                <small>网格密度</small>
                <strong>1.0</strong>
              </span>
              <span>
                <small>采样策略</small>
                <strong>AUTO</strong>
              </span>
              <span>
                <small>吸附步长</small>
                <strong>0.25</strong>
              </span>
            </div>
          </KdeCard>
          <KdeCard title="辅助通道 B" testId="dense-dock-aux-b" variant="dense">
            <div className="style-lab__dense-dummy-grid">
              <span>
                <small>坐标系</small>
                <strong>CART-2D</strong>
              </span>
              <span>
                <small>渲染管线</small>
                <strong>CANVAS2D</strong>
              </span>
              <span>
                <small>浮点精度</small>
                <strong>FP32</strong>
              </span>
            </div>
          </KdeCard>
          <KdeCard title="几何度量" testId="dense-dock-metrics" variant="dense">
            <div className="style-lab__dense-dummy-grid">
              <span>
                <small>模长 ‖x‖</small>
                <strong>{Math.hypot(probe.x, probe.y).toFixed(2)}</strong>
              </span>
              <span>
                <small>投影 ‖Px‖</small>
                <strong>
                  {Math.hypot(projected[0], projected[1]).toFixed(2)}
                </strong>
              </span>
              <span>
                <small>残差 ‖(I-P)x‖</small>
                <strong>
                  {Math.hypot(residual[0], residual[1]).toFixed(2)}
                </strong>
              </span>
            </div>
          </KdeCard>
          <KdeCard title="代数特征" testId="dense-dock-algebra" variant="dense">
            <div className="style-lab__dense-dummy-grid">
              <span>
                <small>det(P)</small>
                <strong>0.00</strong>
              </span>
              <span>
                <small>tr(P)</small>
                <strong>1.00</strong>
              </span>
              <span>
                <small>幂等 P²=P</small>
                <strong>TRUE</strong>
              </span>
            </div>
          </KdeCard>
        </>
      ) : null}
    </aside>
  );

  const secondaryCanvas = (
    <div
      ref={secondaryCanvasState.containerRef}
      className={`style-lab__canvas-frame style-lab__secondary-frame relative h-[var(--demo-height,100%)] min-h-[20rem] w-full overflow-hidden ${
        activeTab === "geometry" ? "" : "hidden"
      }`}
    >
      <CanvasToolbar
        onReset={secondaryCanvasState.resetBounds}
        className="style-lab__canvas-toolbar"
      />
      <canvas
        ref={secondaryCanvasState.canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="投影结果与残差对照画布"
      />
      <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
    </div>
  );

  const workspaceTabs = (
    <div className="flex w-full items-center justify-between gap-2 overflow-x-auto">
      <KdeTabs<WorkspaceTabId>
        options={WORKSPACE_TABS}
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        variant="default"
        testId="workspace-tabs"
      />
      {layoutSelector}
    </div>
  );

  if (variant === "kde") {
    return (
      <AutoMath>
        <ExpandableDemo id={`interaction-style-${variant}-${layoutPreset}`}>
          <KdeWindowShell
            title={meta.windowTitle}
            eyebrow={meta.eyebrow}
            mark={meta.mark}
            modeTag="WINDOWED"
            layoutPreset={layoutPreset}
            className="style-lab"
            dataStyle={variant}
            dataFixedLayout={layoutPreset}
            data-style={variant}
            data-fixed-layout={layoutPreset}
            tabs={workspaceTabs}
            navigation={
              layoutPreset === "three-column" ? (
                <div className="style-lab__layout-navigation">
                  <span>EXPERIMENT</span>
                  <strong>2D PROJECTION</strong>
                  <span>INPUT → PROJECTED → RESIDUAL</span>
                </div>
              ) : undefined
            }
            display={workspaceDisplay}
            secondary={
              layoutPreset === "dual-view" && activeTab === "geometry"
                ? secondaryCanvas
                : undefined
            }
            controls={controlPanel}
            readouts={readouts}
          />
        </ExpandableDemo>
      </AutoMath>
    );
  }

  const renderedLayout = renderLayout(
    variant,
    layoutPreset,
    workspaceTabs,
    workspaceDisplay,
    secondaryCanvas,
    controlPanel,
    readouts,
  );

  return (
    <AutoMath>
      <ExpandableDemo id={`interaction-style-${variant}-${layoutPreset}`}>
        <section
          className="style-lab"
          data-style={variant}
          data-fixed-layout={layout ?? undefined}
        >
          <WindowBar variant={variant} meta={meta} />
          {renderedLayout}
        </section>
      </ExpandableDemo>
    </AutoMath>
  );
}

function renderLayout(
  variant: InteractionStyle,
  layoutPreset: InteractiveLayoutPreset,
  workspaceTabs: ReactNode,
  workspaceDisplay: ReactNode,
  secondaryCanvas: ReactNode,
  controlPanel: ReactNode,
  readouts: ReactNode,
): ReactNode {
  return (
    <div
      className={`style-lab__workspace style-lab__workspace--${variant}`}
      data-control-layout={layoutPreset}
    >
      <InteractiveLayout
        preset={layoutPreset}
        top={workspaceTabs}
        navigation={
          layoutPreset === "three-column" ? (
            <div className="style-lab__layout-navigation">
              <span>EXPERIMENT</span>
              <strong>2D PROJECTION</strong>
              <span>INPUT → PROJECTED → RESIDUAL</span>
            </div>
          ) : undefined
        }
        main={
          variant === "instrument" ? (
            <main className="style-lab__instrument-display">
              <div className="style-lab__channel-bar">
                <span>CH 01 · PROJECTION</span>
                <span className="style-lab__live-indicator">LIVE</span>
              </div>
              {workspaceDisplay}
              <div className="style-lab__signal-footer">
                INPUT → PROJECTED → RESIDUAL
              </div>
            </main>
          ) : (
            workspaceDisplay
          )
        }
        secondary={layoutPreset === "dual-view" ? secondaryCanvas : undefined}
        side={controlPanel}
        bottom={readouts}
      />
    </div>
  );
}

function WindowBar({
  variant,
  meta,
}: {
  variant: InteractionStyle;
  meta: (typeof STYLE_META)[InteractionStyle];
}) {
  const expandable = useExpandable();
  return (
    <header className="style-lab__windowbar">
      <span className="style-lab__window-mark" aria-hidden="true">
        {meta.mark}
      </span>
      <span className="style-lab__window-title">{meta.windowTitle}</span>
      <span className="style-lab__window-context">{meta.eyebrow}</span>
      <div className="flex items-center gap-2">
        <span className="style-lab__window-mode" aria-hidden="true">
          {variant === "instrument" ? "CH 01" : "WINDOWED"}
        </span>
        {expandable && !expandable.isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              expandable.toggleExpanded();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="cursor-pointer rounded-md border border-border/80 bg-surface/80 px-2 py-0.5 text-xs font-medium text-muted transition hover:border-accent hover:bg-accent/15 hover:text-accent active:scale-95"
            aria-label="展开全屏演示"
            title="展开全屏演示"
          >
            ⛶ 展开
          </button>
        )}
      </div>
    </header>
  );
}
