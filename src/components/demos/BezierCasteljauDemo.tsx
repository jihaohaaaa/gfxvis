import { useEffect, useRef, useState } from "react";
import {
  MAX_BEZIER_DEGREE,
  MIN_BEZIER_DEGREE,
  appendExtrapolatedControlPoint,
  createBezierPointsForDegree,
  deCasteljauLevels,
  evaluateBezier,
  getBezierLevelLabel,
  getPointsBounds,
  removeLastControlPoint,
  sampleBezier,
  type Point2,
} from "../../visualizations/scenes/graphics/bezier-splines";
import {
  drawAdaptiveAxes,
  drawPoint,
  drawPolyline,
} from "../../visualizations/core/2d/plot2d";
import CanvasResizer from "../framework/CanvasResizer";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import KdeButton from "../framework/KdeButton";
import KdeButtonGroup from "../framework/KdeButtonGroup";
import KdeCard from "../framework/KdeCard";
import KdeCheckbox from "../framework/KdeCheckbox";
import KdeReadout from "../framework/KdeReadout";
import KdeWindowShell from "../framework/KdeWindowShell";
import ParamSlider from "../framework/ParamSlider";
import { useCanvas2D } from "../framework/useCanvas2D";

import "./BezierCasteljauDemo.css";
import "./BezierSplineWorkspace.css";

function formatPoint(point: Point2): string {
  return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
}

function createDefaultHighlightedLevels(levelCount: number): boolean[] {
  return Array.from(
    { length: levelCount },
    (_, index) => index === 0 || index === levelCount - 1,
  );
}

function resizeHighlightedLevels(
  previous: readonly boolean[],
  levelCount: number,
): boolean[] {
  const next = Array.from(
    { length: levelCount },
    (_, index) => previous[index] ?? false,
  );
  next[0] = true;
  next[levelCount - 1] = true;
  return next;
}

function formatBezierFormula(degree: number): string {
  if (degree === 1) return "C(t) = (1-t)P_0 + tP_1";
  if (degree === 2) {
    return "C(t) = (1-t)^2P_0 + 2t(1-t)P_1 + t^2P_2";
  }
  if (degree === 3) {
    return "C(t) = (1-t)^3P_0 + 3t(1-t)^2P_1 + 3t^2(1-t)P_2 + t^3P_3";
  }
  return `C(t) = \\sum_{i=0}^{${degree}} B_i^{${degree}}(t)P_i`;
}

export default function BezierCasteljauDemo() {
  const [t, setT] = useState(0.5);
  const [points, setPoints] = useState<Point2[]>(() =>
    createBezierPointsForDegree(3),
  );
  const [highlightedLevels, setHighlightedLevels] = useState<boolean[]>(() =>
    createDefaultHighlightedLevels(4),
  );
  const pointsRef = useRef(points);
  const dragIndexRef = useRef<number | null>(null);
  pointsRef.current = points;

  const degree = points.length - 1;
  const levels = deCasteljauLevels(points, t);
  const curvePoint = evaluateBezier(points, t);

  const { containerRef, canvasRef, setBounds } = useCanvas2D(
    {
      initialBounds: getPointsBounds(points),
      margin: 34,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);
        drawPolyline(ctx, plot, sampleBezier(pointsRef.current), {
          color: theme.accent,
          width: 2.8,
        });
        drawPolyline(ctx, plot, pointsRef.current, {
          color: theme.muted,
          width: 1.4,
          dash: [5, 5],
        });

        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        levels.forEach((level, levelIndex) => {
          if (!highlightedLevels[levelIndex]) return;
          const isFinalLevel = levelIndex === levels.length - 1;
          const levelColor =
            levelIndex === 0
              ? theme.accent
              : isFinalLevel
                ? theme.ink
                : theme.muted;
          if (level.length > 1) {
            drawPolyline(ctx, plot, level, {
              color: levelColor,
              width: isFinalLevel ? 2 : 1.5,
              dash: isFinalLevel ? [] : [3, 4],
              alpha: isFinalLevel ? 1 : Math.max(0.45, 1 - levelIndex * 0.08),
            });
          }
          level.forEach(([x, y], pointIndex) => {
            drawPoint(ctx, plot, x, y, {
              color: levelColor,
              filled: true,
              radius: levelIndex === 0 || isFinalLevel ? 6 : 4,
              width: 1.8,
            });
            const label = getBezierLevelLabel(
              levelIndex,
              pointIndex,
              level.length,
            );
            const verticalOffset = pointIndex % 2 === 0 ? -10 : 14;
            const levelOffset = levelIndex % 2 === 0 ? 0 : 7;
            ctx.fillStyle = levelColor;
            ctx.font = isFinalLevel
              ? "600 12px ui-sans-serif, system-ui, sans-serif"
              : "11px ui-sans-serif, system-ui, sans-serif";
            ctx.fillText(
              label,
              plot.toScreenX(x) + 8,
              plot.toScreenY(y) + verticalOffset + levelOffset,
            );
          });
        });

        drawPoint(ctx, plot, curvePoint[0], curvePoint[1], {
          color: theme.ink,
          filled: true,
          radius: 5,
          width: 2,
        });
        ctx.fillStyle = theme.accent;
        ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(
          `C(t) = ${formatPoint(curvePoint)}`,
          plot.toScreenX(curvePoint[0]) + 10,
          plot.toScreenY(curvePoint[1]) - 10,
        );
      },
      onLeftDown(event, plot) {
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return false;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        let nearest: number | null = null;
        let distance = 18;
        pointsRef.current.forEach(([x, y], index) => {
          const dx = plot.toScreenX(x) - px;
          const dy = plot.toScreenY(y) - py;
          const candidate = Math.hypot(dx, dy);
          if (candidate < distance) {
            distance = candidate;
            nearest = index;
          }
        });
        dragIndexRef.current = nearest;
        return nearest !== null;
      },
      onLeftMove(event, plot) {
        const index = dragIndexRef.current;
        if (index === null) return;
        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();
        if (!rect) return;
        const nextX = plot.toWorldX(event.clientX - rect.left);
        const nextY = plot.toWorldY(event.clientY - rect.top);
        setPoints((current) =>
          current.map((point, pointIndex) =>
            pointIndex === index ? [nextX, nextY] : point,
          ),
        );
      },
      onLeftUp() {
        dragIndexRef.current = null;
      },
    },
    [highlightedLevels, points, t],
  );

  useEffect(() => {
    setBounds(getPointsBounds(points));
  }, [points, setBounds]);

  const setPointsAndPreserveLevels = (nextPoints: Point2[]) => {
    setPoints(nextPoints);
    setHighlightedLevels((previous) =>
      resizeHighlightedLevels(previous, nextPoints.length),
    );
  };

  const increaseDegree = () => {
    if (degree >= MAX_BEZIER_DEGREE) return;
    setPointsAndPreserveLevels(appendExtrapolatedControlPoint(points));
  };

  const decreaseDegree = () => {
    if (degree <= MIN_BEZIER_DEGREE) return;
    setPointsAndPreserveLevels(removeLastControlPoint(points));
  };

  const toggleLevel = (levelIndex: number, checked: boolean) => {
    setHighlightedLevels((previous) => {
      const next = [...previous];
      next[levelIndex] = checked;
      return next;
    });
  };

  const reset = () => {
    const restored = createBezierPointsForDegree(degree);
    setPoints(restored);
    setT(0.5);
    setHighlightedLevels(createDefaultHighlightedLevels(restored.length));
    setBounds(getPointsBounds(restored));
  };

  const formula = formatBezierFormula(degree);
  const highlightedLevelSummary = highlightedLevels
    .map((visible, index) => (visible ? `L${index}` : null))
    .filter((level): level is string => level !== null)
    .join(" · ");

  return (
    <AutoMath>
      <ExpandableDemo id="bezier-casteljau">
        <KdeWindowShell
          title="Bézier · de Casteljau 递归插值"
          eyebrow="BREEZE WORKSPACE · CURVE CONSTRUCTION"
          mark="B"
          modeTag="BEZIER"
          testId="bezier-casteljau-demo"
          className="bezier-spline-workspace"

          tabs={
            <div className="bezier-demo__topbar">
              <div className="bezier-demo__degree-control">
                <span className="bezier-demo__degree-label">次数</span>
                <KdeButtonGroup
                  attached={false}
                  size="xs"
                  testId="bezier-degree-controls"
                >
                  <KdeButton
                    size="xs"
                    variant="default"
                    onClick={decreaseDegree}
                    disabled={degree <= MIN_BEZIER_DEGREE}
                    aria-label="减少 Bézier 次数"
                    data-testid="bezier-degree-decrease"
                  >
                    −
                  </KdeButton>
                  <span
                    className="bezier-demo__degree-readout"
                    data-testid="bezier-degree-readout"
                  >
                    n = {degree}
                  </span>
                  <KdeButton
                    size="xs"
                    variant="primary"
                    onClick={increaseDegree}
                    disabled={degree >= MAX_BEZIER_DEGREE}
                    aria-label="增加 Bézier 次数"
                    data-testid="bezier-degree-increase"
                  >
                    ＋
                  </KdeButton>
                </KdeButtonGroup>
              </div>
              <span className="bezier-demo__topnote">
                选择要观察的递归层级；新控制点沿末端控制边外推
              </span>
            </div>
          }
          display={
            <div
              ref={containerRef}
              data-testid="bezier-casteljau-canvas"
              className="bezier-demo__canvas relative flex-1 min-h-[var(--demo-height,18rem)] h-full w-full overflow-hidden"
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
            <div className="bezier-demo__stack">
              <KdeCard title="递归控制" variant="dense">
                <div className="space-y-3">
                  <ParamSlider
                    label="$t$"
                    min={0}
                    max={1}
                    step={0.01}
                    value={t}
                    onChange={setT}
                    widthClass="w-full"
                    labelMode="adaptive"
                    display={t.toFixed(2)}
                  />
                  <p className="bezier-demo__hint">
                    拖动画布上的控制点，或移动参数滑块，观察每一层插值点如何汇聚到曲线点。
                  </p>
                </div>
              </KdeCard>
              <KdeCard
                title="显示层级"
                variant="dense"
                testId="bezier-level-toggles"
              >
                <div className="bezier-demo__level-toggle-list">
                  {levels.map((level, index) => {
                    const isFinal = index === levels.length - 1;
                    const levelLabels = level.map((_, pointIndex) =>
                      getBezierLevelLabel(index, pointIndex, level.length),
                    );
                    return (
                      <KdeCheckbox
                        key={index}
                        checked={highlightedLevels[index] ?? false}
                        onChange={(checked) => toggleLevel(index, checked)}
                        size="xs"
                        testId={
                          isFinal
                            ? "bezier-level-toggle-final"
                            : `bezier-level-toggle-${index}`
                        }
                        label={
                          isFinal
                            ? `L${index} · C(t)`
                            : index === 0
                              ? "L0 · 控制点 P"
                              : `L${index} · ${getBezierLevelLabel(index, 0, level.length).split("·")[1]?.charAt(0) ?? "插值"} 插值点`
                        }
                        description={levelLabels.join(" · ")}
                      />
                    );
                  })}
                </div>
                <div
                  className="bezier-demo__level-label-list"
                  data-testid="bezier-level-label-list"
                >
                  {levels.map((level, index) =>
                    highlightedLevels[index] ? (
                      <span
                        key={index}
                        className="bezier-demo__level-label-group"
                      >
                        {level
                          .map((_, pointIndex) =>
                            getBezierLevelLabel(
                              index,
                              pointIndex,
                              level.length,
                            ),
                          )
                          .join(" · ")}
                      </span>
                    ) : null,
                  )}
                </div>
              </KdeCard>
              <KdeCard title="当前层级" variant="dense">
                <div className="space-y-2">
                  {levels.map((level, index) => {
                    if (!highlightedLevels[index]) return null;
                    return (
                      <div key={index} className="bezier-demo__level-row">
                        <span>L{index}</span>
                        <span className="bezier-demo__level-points">
                          {level.map((point, pointIndex) => (
                            <span
                              key={pointIndex}
                              className="bezier-demo__point-token"
                            >
                              {pointIndex > 0 && (
                                <span
                                  className="bezier-demo__point-separator"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                              )}
                              <span>
                                {getBezierLevelLabel(
                                  index,
                                  pointIndex,
                                  level.length,
                                )}{" "}
                                {formatPoint(point)}
                              </span>
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </KdeCard>
            </div>
          }
          footer={
            <div className="bezier-demo__readouts">
              <KdeReadout
                label="递归公式"
                value={`$${formula}$`}
                variant="formula"
              />
              <KdeReadout
                label={`曲线点 C(${t.toFixed(2)})`}
                value={`$${formatPoint(curvePoint)}$`}
                variant="accent"
                testId="bezier-casteljau-point-readout"
              />
              <KdeReadout
                label="控制点数量"
                value={`$n + 1 = ${points.length}$`}
                subValue={`当前次数 n = ${degree}；n 次 Bézier 使用 n + 1 个控制点`}
                testId="bezier-control-point-count"
              />
              <KdeReadout
                label="高亮层级"
                value={highlightedLevelSummary || "无"}
                variant="formula"
                testId="bezier-highlight-summary"
              />
            </div>
          }
        ></KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
