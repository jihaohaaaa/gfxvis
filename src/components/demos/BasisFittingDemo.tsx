import { useState, useMemo } from "react";
import {
  drawAdaptiveAxes,
  drawDragGizmo,
  drawPolyline,
  drawSegment,
  getVisibleBounds,
  type Bounds2,
} from "../../visualizations/core/2d/plot2d";
import CanvasToolbar from "../framework/CanvasToolbar";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import { useCanvas2D } from "../framework/useCanvas2D";
import { useVectorDrag } from "../framework/useVectorDrag";

const INITIAL_BOUNDS: Bounds2 = {
  xMin: -4,
  xMax: 4,
  yMin: -3.5,
  yMax: 3.5,
};
const MARGIN = 30;

export type BasisFamily = "poly" | "fourier" | "rbf";

interface BasisFunction {
  label: string;
  eval: (x: number) => number;
}

interface Point2D {
  id: string;
  x: number;
  y: number;
}

const INITIAL_POINTS: Point2D[] = [
  { id: "p1", x: -3.0, y: -1.2 },
  { id: "p2", x: -1.8, y: 1.5 },
  { id: "p3", x: -0.5, y: -0.8 },
  { id: "p4", x: 0.8, y: 0.9 },
  { id: "p5", x: 2.2, y: -1.6 },
  { id: "p6", x: 3.2, y: 1.8 },
];

/** Solve linear least squares A θ ≈ b via normal equations (Aᵀ A) θ = Aᵀ b using Gaussian elimination with pivoting */
function solveLinearLeastSquares(
  A: number[][],
  b: number[],
): { theta: number[]; rss: number } {
  const m = A.length;
  const n = A[0].length;

  // Compute G = Aᵀ A and d = Aᵀ b
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const d: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += A[k][i] * A[k][j];
      }
      G[i][j] = sum;
    }
    // Small regularization to ensure positive definiteness
    G[i][i] += 1e-7;

    let bSum = 0;
    for (let k = 0; k < m; k++) {
      bSum += A[k][i] * b[k];
    }
    d[i] = bSum;
  }

  // Gaussian elimination with partial pivoting on G θ = d
  const M: number[][] = G.map((row, i) => [...row, d[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) continue;

    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  const theta = M.map((row) => row[n]);

  // Compute residual sum of squares: ||b - A θ||²
  let rss = 0;
  for (let i = 0; i < m; i++) {
    let pred = 0;
    for (let j = 0; j < n; j++) {
      pred += A[i][j] * theta[j];
    }
    const err = b[i] - pred;
    rss += err * err;
  }

  return { theta, rss };
}

export default function BasisFittingDemo({ height }: { height?: string }) {
  const [family, setFamily] = useState<BasisFamily>("poly");
  const [polyDegree, setPolyDegree] = useState<number>(3);
  const [points, setPoints] = useState<Point2D[]>(INITIAL_POINTS);

  const basisFunctions = useMemo<BasisFunction[]>(() => {
    if (family === "poly") {
      const list: BasisFunction[] = [{ label: "1", eval: () => 1 }];
      for (let d = 1; d <= polyDegree; d++) {
        const power = d;
        list.push({
          label: power === 1 ? "x" : `x^{${power}}`,
          eval: (x) => Math.pow(x, power),
        });
      }
      return list;
    } else if (family === "fourier") {
      return [
        { label: "1", eval: () => 1 },
        { label: "\\sin(x)", eval: (x) => Math.sin(x) },
        { label: "\\cos(x)", eval: (x) => Math.cos(x) },
        { label: "\\sin(2x)", eval: (x) => Math.sin(2 * x) },
        { label: "\\cos(2x)", eval: (x) => Math.cos(2 * x) },
      ];
    } else {
      // RBF with 4 evenly spaced centers
      const centers = [-2.5, -0.8, 0.8, 2.5];
      const sigma = 1.2;
      return [
        { label: "1", eval: () => 1 },
        ...centers.map((c, idx) => ({
          label: `\\mathrm{RBF}_{${idx + 1}}(x)`,
          eval: (x: number) =>
            Math.exp(-Math.pow(x - c, 2) / (2 * sigma * sigma)),
        })),
      ];
    }
  }, [family, polyDegree]);

  // Compute least squares fit
  const fitResult = useMemo(() => {
    const m = points.length;
    const n = basisFunctions.length;
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < m; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(basisFunctions[j].eval(points[i].x));
      }
      A.push(row);
      b.push(points[i].y);
    }

    return solveLinearLeastSquares(A, b);
  }, [points, basisFunctions]);

  // Evaluate fitted curve f(x)
  const evalModel = (x: number): number => {
    let y = 0;
    for (let j = 0; j < basisFunctions.length; j++) {
      y += (fitResult.theta[j] || 0) * basisFunctions[j].eval(x);
    }
    return y;
  };

  // Drag handlers for the 6 data points using unified 2D Transform Gizmo
  const dragTargets = useMemo(
    () => points.map((p) => ({ id: p.id, x: p.x, y: p.y, hitRadius: 22 })),
    [points],
  );

  const dragHandlers = useVectorDrag({
    targets: dragTargets,
    onDrag(id, pos) {
      setPoints((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                x: Math.max(-3.8, Math.min(3.8, pos.x)),
                y: Math.max(-3.2, Math.min(3.2, pos.y)),
              }
            : p,
        ),
      );
    },
  });

  const { containerRef, canvasRef, resetBounds } = useCanvas2D(
    {
      initialBounds: INITIAL_BOUNDS,
      margin: MARGIN,
      onLeftDown: dragHandlers.onLeftDown,
      onLeftMove: dragHandlers.onLeftMove,
      onLeftUp: dragHandlers.onLeftUp,
      onHover: dragHandlers.onHover,
      onPointerLeave: dragHandlers.onPointerLeave,
      draw(ctx, plot, theme) {
        drawAdaptiveAxes(ctx, plot, theme);

        // 1. Draw continuous fitted curve f(x) across viewport
        const bounds = getVisibleBounds(plot);
        const visibleMinX = bounds.xMin;
        const visibleMaxX = bounds.xMax;
        const steps = 240;
        const dx = (visibleMaxX - visibleMinX) / steps;
        const curvePoints: [number, number][] = [];

        for (let i = 0; i <= steps; i++) {
          const cx = visibleMinX + i * dx;
          const cy = evalModel(cx);
          if (Number.isFinite(cy)) {
            curvePoints.push([cx, cy]);
          }
        }

        drawPolyline(ctx, plot, curvePoints, {
          color: "#3b82f6",
          width: 2.8,
        });

        // 2. Draw vertical residual dashed lines e_i from data points to curve
        for (const p of points) {
          const modelY = evalModel(p.x);
          drawSegment(ctx, plot, p.x, p.y, p.x, modelY, {
            color: "#ef4444",
            width: 1.8,
            dash: [4, 4],
          });
        }

        // 3. Draw data points using 2D Transform Gizmo
        for (const p of points) {
          drawDragGizmo(ctx, plot, p.x, p.y, {
            color: "#f59e0b",
            radius: 6,
            isHoveredCenter: dragHandlers.isCenterHovered(p.id),
            isDraggingCenter: dragHandlers.isCenterDragging(p.id),
            opacity: dragHandlers.getOpacity(p.id),
          });
        }
      },
    },
    [points, fitResult],
  );

  const formatFormula = () => {
    return basisFunctions
      .map((bf, idx) => {
        const coef = fitResult.theta[idx] || 0;
        const sign = idx > 0 && coef >= 0 ? "+" : "";
        if (bf.label === "1") {
          return `${sign}${coef.toFixed(2)}`;
        }
        return `${sign}${coef.toFixed(2)}\\,${bf.label}`;
      })
      .join(" ");
  };

  return (
    <ExpandableDemo id="basis-fitting" height={height}>
      <div id="basis-fitting" className="space-y-4">
        {/* Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CapsuleTabs
            options={[
              { id: "poly", label: "多项式基 (Polynomial)" },
              { id: "fourier", label: "傅里叶基 (Fourier)" },
              { id: "rbf", label: "径向基 (RBF)" },
            ]}
            value={family}
            onChange={(val) => setFamily(val as BasisFamily)}
          />

          {family === "poly" && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>多项式最高阶数：</span>
              {[1, 2, 3, 4, 5].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setPolyDegree(deg)}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    polyDegree === deg
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {deg} 阶
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2D Canvas */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,24rem)] w-full overflow-hidden rounded-xl border border-border bg-surface"
        >
          <CanvasToolbar onReset={resetBounds} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>

        {/* Real-time Math & Analysis Cards */}
        <div className="grid gap-3 rounded-lg border border-border bg-surface-hover/50 p-3.5 text-sm sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">
              实时拟合函数解析式{" "}
              <span className="text-xs font-normal text-muted">
                （对参数 <InlineMath tex="\boldsymbol\theta" /> 严格线性）
              </span>
            </p>
            <div className="overflow-x-auto rounded bg-surface p-2 font-mono text-xs text-primary">
              <InlineMath tex={`f(x) = ${formatFormula()}`} />
            </div>
            <p className="text-xs text-muted">
              残差平方和 RSS{" "}
              <InlineMath tex={`\\sum e_i^2 = ${fitResult.rss.toFixed(4)}`} />
            </p>
          </div>

          <div className="space-y-1.5 border-t border-border pt-2 text-xs text-muted sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
            <p className="font-semibold text-foreground">
              💡 核心结论：非线性曲线 vs 线性参数
            </p>
            <p>
              虽然屏幕上的拟合曲线呈现高度弯曲的非线性形态，但由于所有基函数{" "}
              <InlineMath tex="\phi_j(x)" /> 不含未知参数，模型对权重{" "}
              <InlineMath tex="\boldsymbol\theta" /> 构成严格的线性方程组{" "}
              <InlineMath tex="A\boldsymbol\theta \approx \mathbf{b}" />。
            </p>
            <p>求解只需一次标准的正规方程或 QR 投影，无需任何非线性迭代！</p>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
