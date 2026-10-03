import { useMemo, useRef, useState } from "react";
import {
  sampleBezier,
  type Point2,
} from "../../visualizations/scenes/graphics/bezier-splines";
import {
  drawAdaptiveAxes,
  drawPoint,
  drawPolyline,
  drawSegment,
} from "../../visualizations/core/2d/plot2d";
import CanvasResizer from "../framework/CanvasResizer";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import KdeCard from "../framework/KdeCard";
import KdeMessageBar from "../framework/KdeMessageBar";
import KdeReadout, { type KdeReadoutVariant } from "../framework/KdeReadout";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BezierContinuityDemo.css";
import "./BezierSplineWorkspace.css";

export type ContinuityMode = "c0" | "g1" | "c1" | "c2" | "free";

const CONTINUITY_OPTIONS: readonly KdeTabOption<ContinuityMode>[] = [
  { id: "c0", label: "C⁰ · 0 阶位置连续" },
  { id: "g1", label: "G¹ · 切线同向共线" },
  { id: "c1", label: "C¹ · 1 阶导数连续" },
  { id: "c2", label: "C² · 2 阶导数连续" },
  { id: "free", label: "自由诊断模式" },
];

const INITIAL_POINTS: {
  c0: Point2[];
  g1: Point2[];
  c1: Point2[];
  c2: Point2[];
  free: Point2[];
} = {
  c0: [
    [-4.2, -1.2],
    [-3.2, 1.8],
    [-1.2, 2.2],
    [0.0, 0.0],
    [1.8, 1.6],
    [3.2, -1.8],
    [4.2, 0.8],
  ],
  g1: [
    [-4.2, -1.2],
    [-3.2, 1.8],
    [-1.5, 1.5],
    [0.0, 0.0],
    [2.5, -2.5],
    [3.8, -1.8],
    [4.5, 0.8],
  ],
  c1: [
    [-4.2, -1.2],
    [-3.2, 1.8],
    [-1.8, 1.8],
    [0.0, 0.0],
    [1.8, -1.8],
    [3.4, -2.2],
    [4.5, 0.8],
  ],
  c2: [
    [-4.2, -1.2],
    [-3.0, 1.6],
    [-1.8, 1.8],
    [0.0, 0.0],
    [1.8, -1.8],
    [3.0, -1.6],
    [4.5, 0.8],
  ],
  free: [
    [-4.2, -1.2],
    [-3.2, 1.8],
    [-1.6, 2.0],
    [0.0, 0.0],
    [1.6, -1.8],
    [3.2, -2.0],
    [4.5, 0.8],
  ],
};

function formatVec(v: Point2): string {
  return `(${v[0].toFixed(2)}, ${v[1].toFixed(2)})`;
}

export default function BezierContinuityDemo() {
  const [mode, setMode] = useState<ContinuityMode>("c1");
  const [points, setPoints] = useState<Point2[]>(() =>
    INITIAL_POINTS.c1.map(([x, y]) => [x, y]),
  );

  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;

  // Control points around junction: P1, P2, P3 (junction), Q1, Q2
  const p1 = points[1];
  const p2 = points[2];
  const p3 = points[3];
  const q1 = points[4];
  const q2 = points[5];

  // Derivatives at junction
  // C'(1^-) = 3 (P3 - P2),  D'(0^+) = 3 (Q1 - P3)
  const d1Left: Point2 = [3 * (p3[0] - p2[0]), 3 * (p3[1] - p2[1])];
  const d1Right: Point2 = [3 * (q1[0] - p3[0]), 3 * (q1[1] - p3[1])];

  // C''(1^-) = 6 (P1 - 2 P2 + P3),  D''(0^+) = 6 (P3 - 2 Q1 + Q2)
  const d2Left: Point2 = [
    6 * (p1[0] - 2 * p2[0] + p3[0]),
    6 * (p1[1] - 2 * p2[1] + p3[1]),
  ];
  const d2Right: Point2 = [
    6 * (p3[0] - 2 * q1[0] + q2[0]),
    6 * (p3[1] - 2 * q1[1] + q2[1]),
  ];

  // Diagnostic tests
  const status = useMemo(() => {
    // 1. G1 check: angle between vLeft (P3 - P2) and vRight (Q1 - P3)
    const vL: Point2 = [p3[0] - p2[0], p3[1] - p2[1]];
    const vR: Point2 = [q1[0] - p3[0], q1[1] - p3[1]];
    const lenL = Math.hypot(vL[0], vL[1]);
    const lenR = Math.hypot(vR[0], vR[1]);

    let isG1 = false;
    let isC1 = false;
    let isC2 = false;

    if (lenL > 1e-4 && lenR > 1e-4) {
      const cosAngle = (vL[0] * vR[0] + vL[1] * vR[1]) / (lenL * lenR);
      isG1 = cosAngle > 0.998;
    }

    if (isG1) {
      const d1Diff = Math.hypot(d1Left[0] - d1Right[0], d1Left[1] - d1Right[1]);
      isC1 = d1Diff < 0.25;
    }

    if (isC1) {
      const d2Diff = Math.hypot(d2Left[0] - d2Right[0], d2Left[1] - d2Right[1]);
      isC2 = d2Diff < 0.5;
    }

    let level = "$C^0$ (0 阶位置连续 / 拐角)";
    let badgeVariant: KdeReadoutVariant = "warning";

    if (isC2) {
      level = "$C^2$ (2 阶导数向量连续)";
      badgeVariant = "success";
    } else if (isC1) {
      level = "$C^1$ (1 阶导数向量连续)";
      badgeVariant = "accent";
    } else if (isG1) {
      level = "$G^1$ (切线同向共线)";
      badgeVariant = "default";
    }

    return { isG1, isC1, isC2, level, badgeVariant };
  }, [d1Left, d1Right, d2Left, d2Right, p2, p3, q1]);

  const handleModeChange = (nextMode: ContinuityMode) => {
    setMode(nextMode);
    const template = INITIAL_POINTS[nextMode];
    if (template) {
      setPoints(template.map(([x, y]) => [x, y]));
    }
  };

  const applyConstraints = (
    pts: Point2[],
    prevPts: Point2[],
    draggedIndex: number,
    targetMode: ContinuityMode,
  ): Point2[] => {
    if (targetMode === "c0" || targetMode === "free") {
      return pts;
    }

    const next = pts.map(([x, y]) => [x, y] as Point2);

    // 1. Dragging junction point P3 (anchor) -> translate attached handles
    if (draggedIndex === 3) {
      const dx = next[3][0] - prevPts[3][0];
      const dy = next[3][1] - prevPts[3][1];
      next[2] = [next[2][0] + dx, next[2][1] + dy];
      next[4] = [next[4][0] + dx, next[4][1] + dy];
      if (targetMode === "c2") {
        next[5] = [next[5][0] + dx, next[5][1] + dy];
      }
      return next;
    }

    const P2 = next[2];
    const P3 = next[3];
    const Q1 = next[4];

    if (targetMode === "g1") {
      if (draggedIndex === 2) {
        // Dragging P2 -> keep Q1 direction opposite to (P2 - P3)
        const vLeft: Point2 = [P2[0] - P3[0], P2[1] - P3[1]];
        const lenL = Math.hypot(vLeft[0], vLeft[1]);
        const lenQ = Math.hypot(Q1[0] - P3[0], Q1[1] - P3[1]);
        if (lenL > 1e-4) {
          next[4] = [
            P3[0] - (vLeft[0] / lenL) * lenQ,
            P3[1] - (vLeft[1] / lenL) * lenQ,
          ];
        }
      } else if (draggedIndex === 4) {
        // Dragging Q1 -> keep P2 direction opposite to (Q1 - P3)
        const vRight: Point2 = [Q1[0] - P3[0], Q1[1] - P3[1]];
        const lenR = Math.hypot(vRight[0], vRight[1]);
        const lenP = Math.hypot(P2[0] - P3[0], P2[1] - P3[1]);
        if (lenR > 1e-4) {
          next[2] = [
            P3[0] - (vRight[0] / lenR) * lenP,
            P3[1] - (vRight[1] / lenR) * lenP,
          ];
        }
      }
    } else if (targetMode === "c1") {
      if (draggedIndex === 2) {
        // Q1 = 2 * P3 - P2
        next[4] = [2 * P3[0] - P2[0], 2 * P3[1] - P2[1]];
      } else if (draggedIndex === 4) {
        // P2 = 2 * P3 - Q1
        next[2] = [2 * P3[0] - Q1[0], 2 * P3[1] - Q1[1]];
      }
    } else if (targetMode === "c2") {
      // C1 constraint
      if (draggedIndex === 2) {
        next[4] = [2 * P3[0] - P2[0], 2 * P3[1] - P2[1]];
      } else if (draggedIndex === 4) {
        next[2] = [2 * P3[0] - Q1[0], 2 * P3[1] - Q1[1]];
      }
      // C2 constraint: P1 - 2*P2 + P3 = P3 - 2*Q1 + Q2 => Q2 = P1 - 4*P2 + 4*P3
      const curP1 = next[1];
      const curP2 = next[2];
      const curP3 = next[3];
      next[5] = [
        curP1[0] - 4 * curP2[0] + 4 * curP3[0],
        curP1[1] - 4 * curP2[1] + 4 * curP3[1],
      ];
    }

    return next;
  };

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: { xMin: -5.5, xMax: 5.5, yMin: -3.8, yMax: 3.8 },
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        const current = pointsRef.current;
        const segA = [current[0], current[1], current[2], current[3]];
        const segB = [current[3], current[4], current[5], current[6]];

        // 1. Draw control polygons
        drawPolyline(ctx, plot, segA, {
          color: "#3daee9",
          width: 1.4,
          dash: [4, 4],
        });
        drawPolyline(ctx, plot, segB, {
          color: "#27ae60",
          width: 1.4,
          dash: [4, 4],
        });

        // 2. Draw Bézier curves
        drawPolyline(ctx, plot, sampleBezier(segA, 40), {
          color: "#3daee9",
          width: 2.8,
        });
        drawPolyline(ctx, plot, sampleBezier(segB, 40), {
          color: "#27ae60",
          width: 2.8,
        });

        // 3. Highlight handle bars: P2 -> P3 and P3 -> Q1
        drawSegment(
          ctx,
          plot,
          current[2][0],
          current[2][1],
          current[3][0],
          current[3][1],
          {
            color: "#f67400",
            width: 2.0,
          },
        );
        drawSegment(
          ctx,
          plot,
          current[3][0],
          current[3][1],
          current[4][0],
          current[4][1],
          {
            color: "#f67400",
            width: 2.0,
          },
        );

        // 4. Draw control points and labels
        const pointLabels = ["P₀", "P₁", "P₂", "P₃ ≡ Q₀", "Q₁", "Q₂", "Q₃"];
        current.forEach(([x, y], idx) => {
          const isJunction = idx === 3;
          const isHandle = idx === 2 || idx === 4;
          const pointColor = isJunction
            ? "#f67400"
            : idx < 3
              ? "#3daee9"
              : "#27ae60";

          drawPoint(ctx, plot, x, y, {
            color: pointColor,
            filled: true,
            radius: isJunction ? 7 : isHandle ? 5.5 : 4.5,
            width: 1.8,
          });

          ctx.fillStyle = theme.ink;
          ctx.font = isJunction
            ? "700 12px ui-sans-serif, system-ui, sans-serif"
            : "11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(
            pointLabels[idx],
            plot.toScreenX(x) + 8,
            plot.toScreenY(y) - 8,
          );
        });

        // 5. Annotate junction tangent vectors
        const junctionX = current[3][0];
        const junctionY = current[3][1];
        ctx.fillStyle = "#f67400";
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(
          `接缝锚点 (${junctionX.toFixed(1)}, ${junctionY.toFixed(1)})`,
          plot.toScreenX(junctionX) + 12,
          plot.toScreenY(junctionY) + 16,
        );
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        let nearest: number | null = null;
        let minDist = 20;

        pointsRef.current.forEach(([x, y], idx) => {
          const dist = Math.hypot(
            plot.toScreenX(x) - px,
            plot.toScreenY(y) - py,
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = idx;
          }
        });

        dragIndexRef.current = nearest;
        return nearest !== null;
      },
      onLeftMove(event, plot) {
        const idx = dragIndexRef.current;
        if (idx === null) return;
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;

        const nextX = plot.toWorldX(event.clientX - rect.left);
        const nextY = plot.toWorldY(event.clientY - rect.top);

        const prev = pointsRef.current;
        const nextPts = prev.map((pt, i) =>
          i === idx ? ([nextX, nextY] as Point2) : pt,
        );

        const constrained = applyConstraints(nextPts, prev, idx, mode);
        pointsRef.current = constrained;
        setPoints(constrained);
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [mode, points],
  );

  const reset = () => {
    const template = INITIAL_POINTS[mode] ?? INITIAL_POINTS.c1;
    setPoints(template.map(([x, y]) => [x, y]));
    resetBounds();
  };

  return (
    <AutoMath>
      <ExpandableDemo id="bezier-continuity">
        <KdeWindowShell
          title="Bézier · 曲线拼接与连续性约束"
          eyebrow="BREEZE WORKSPACE · MULTI-SEGMENT CONTINUITY"
          mark="C"
          modeTag={mode.toUpperCase()}
          testId="bezier-continuity-demo"
          className="bezier-spline-workspace"
          tabs={
            <KdeTabs
              label="连续性模式"
              options={CONTINUITY_OPTIONS}
              value={mode}
              onChange={(value) => handleModeChange(value as ContinuityMode)}
              variant="pill"
              size="sm"
              testId="bezier-continuity-tabs"
            />
          }
          display={
            <div
              ref={containerRef}
              data-testid="bezier-continuity-canvas"
              className="bezier-continuity__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
            >
              <CanvasToolbar onReset={reset} />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
              />
              <CanvasResizer className="absolute inset-x-0 bottom-0 z-20" />
            </div>
          }
          controls={
            <div className="bezier-continuity__stack">
              <KdeCard title="实时诊断与条件">
                <div className="space-y-3">
                  <KdeReadout
                    label="当前判定连续性"
                    value={status.level}
                    variant={status.badgeVariant}
                    testId="bezier-continuity-detected-level"
                  />
                  <div className="text-xs text-[var(--kde-muted)]">
                    {mode === "free"
                      ? "自由诊断模式下，可随意拖拽任意控制点破坏连续性，观察状态跳变。"
                      : "当前模式已自动施加手柄几何约束，拖拽相关控制点将联动保持对称或共线。"}
                  </div>
                </div>
              </KdeCard>
              <KdeCard
                title="接缝导数向量读数"
                variant="inset"
                className="flex-1"
              >
                <div className="bezier-continuity__formula">
                  {`$\\mathbf{C}'(1^-)=${formatVec(d1Left)}$`}
                  <br />
                  {`$\\mathbf{D}'(0^+)=${formatVec(d1Right)}$`}
                  <br />
                  {`$\\mathbf{C}''(1^-)=${formatVec(d2Left)}$`}
                  <br />
                  {`$\\mathbf{D}''(0^+)=${formatVec(d2Right)}$`}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bezier-continuity__readouts">
              <KdeReadout
                label="1 阶导数连续条件 (C¹)"
                value="$\mathbf{C}'(1) = \mathbf{D}'(0) \iff \mathbf{P}_3 - \mathbf{P}_2 = \mathbf{Q}_1 - \mathbf{Q}_0$"
                subValue="速度向量严格相等，手柄对称等长"
                variant="formula"
              />
              <KdeReadout
                label="2 阶导数连续条件 (C²)"
                value="$\mathbf{C}''(1) = \mathbf{D}''(0) \iff \mathbf{P}_1 - 2\mathbf{P}_2 + \mathbf{P}_3 = \mathbf{Q}_2 - 2\mathbf{Q}_1 + \mathbf{Q}_0$"
                subValue="加速度向量严格相等，二阶差分一致"
                variant="formula"
              />
              <KdeMessageBar
                variant={status.isC2 ? "success" : "info"}
                mode="card"
                title="Bézier 拼接的局限性"
              >
                高阶连续（如
                $C^2$）需要跨段强制约束多个控制点，修改一处会引发整条曲线的级联重算。这正是
                B-Spline 本地局部控制的用武之地。
              </KdeMessageBar>
            </div>
          }
        ></KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
