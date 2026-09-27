import React, { useState, useRef } from "react";
import { AutoMath } from "../framework/AutoMath";
import ParamSlider from "../framework/ParamSlider";
import KdeTabs from "../framework/KdeTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import { clamp } from "@math";
import KdeWindowShell from "../framework/KdeWindowShell";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";

type DiagramMode = "point_vector" | "frame_barycentric" | "homogenization";

const MODE_OPTIONS = [
  { id: "point_vector" as const, label: "1. 点 vs 自由向量（原点平移不变性）" },
  {
    id: "frame_barycentric" as const,
    label: "2. 仿射标架与重心坐标（仿射包 vs 凸包）",
  },
  {
    id: "homogenization" as const,
    label: "3. 齐次化超平面嵌入（w=1 切片）",
  },
];

export default function AffineSpaceDiagram() {
  const [mode, setMode] = useState<DiagramMode>("point_vector");
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingTarget, setDraggingTarget] = useState<string | null>(null);

  // Mode 1: Point vs Vector state
  const [ox, setOx] = useState<number>(0.0);
  const [oy, setOy] = useState<number>(0.0);
  const [px, setPx] = useState<number>(1.0);
  const [py, setPy] = useState<number>(1.0);
  const [vx, setVx] = useState<number>(2.5);
  const [vy, setVy] = useState<number>(1.5);

  // Q = P + v
  const qx = px + vx;
  const qy = py + vy;

  // Relative coordinates with respect to origin O
  const relPx = px - ox;
  const relPy = py - oy;
  const relQx = qx - ox;
  const relQy = qy - oy;

  // Mode 2: Barycentric coordinates & Triangle Vertices state
  const [lambda1, setLambda1] = useState<number>(0.35);
  const [lambda2, setLambda2] = useState<number>(0.35);
  const lambda0 = Number((1 - lambda1 - lambda2).toFixed(2));

  const [p0, setP0] = useState({ x: -1.5, y: -1.0 });
  const [p1, setP1] = useState({ x: 2.0, y: -0.5 });
  const [p2, setP2] = useState({ x: 0.2, y: 2.0 });

  // Current affine combination point P
  const baryPx = lambda0 * p0.x + lambda1 * p1.x + lambda2 * p2.x;
  const baryPy = lambda0 * p0.y + lambda1 * p1.y + lambda2 * p2.y;
  const isInsideTriangle =
    lambda0 >= -1e-4 && lambda1 >= -1e-4 && lambda2 >= -1e-4;

  // Mode 3: Homogenization state
  const [tx, setTx] = useState<number>(1.5);
  const [ty, setTy] = useState<number>(1.0);
  const [thetaDeg, setThetaDeg] = useState<number>(30);
  const [testType, setTestType] = useState<"point" | "vector">("point");
  const [rawX, setRawX] = useState<number>(1.2);
  const [rawY, setRawY] = useState<number>(0.8);

  const thetaRad = (thetaDeg * Math.PI) / 180;
  const cosT = Math.cos(thetaRad);
  const sinT = Math.sin(thetaRad);

  const rawW = testType === "point" ? 1 : 0;

  // Transformed coords: [X', Y', W']^T = [ [cos, -sin, tx], [sin, cos, ty], [0, 0, 1] ] * [rawX, rawY, rawW]^T
  const transformedX = cosT * rawX - sinT * rawY + tx * rawW;
  const transformedY = sinT * rawX + cosT * rawY + ty * rawW;
  const transformedW = rawW;

  const handleReset = () => {
    if (mode === "point_vector") {
      setOx(0.0);
      setOy(0.0);
      setPx(1.0);
      setPy(1.0);
      setVx(2.5);
      setVy(1.5);
    } else if (mode === "frame_barycentric") {
      setP0({ x: -1.5, y: -1.0 });
      setP1({ x: 2.0, y: -0.5 });
      setP2({ x: 0.2, y: 2.0 });
      setLambda1(0.35);
      setLambda2(0.35);
    } else if (mode === "homogenization") {
      setRawX(1.2);
      setRawY(0.8);
      setTx(1.5);
      setTy(1.0);
      setThetaDeg(30);
      setTestType("point");
    }
  };

  // Generic pointer drag handler for SVG coordinates
  const handlePointerDownTarget = (
    targetId: string,
    e: React.PointerEvent<SVGGElement>,
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingTarget(targetId);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingTarget || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = 500;
    const svgHeight = 360;
    const mouseSvgX =
      ((e.clientX - rect.left) / rect.width) * svgWidth - svgWidth / 2;
    const mouseSvgY =
      ((e.clientY - rect.top) / rect.height) * svgHeight - svgHeight / 2;

    if (mode === "point_vector") {
      const scale = 38;
      const mathX = Number((mouseSvgX / scale).toFixed(1));
      const mathY = Number((-mouseSvgY / scale).toFixed(1));

      if (draggingTarget === "O") {
        setOx(clamp(mathX, -3.0, 3.0));
        setOy(clamp(mathY, -3.0, 3.0));
      } else if (draggingTarget === "P") {
        setPx(clamp(mathX, -3.0, 3.0));
        setPy(clamp(mathY, -3.0, 3.0));
      } else if (draggingTarget === "Q") {
        setVx(clamp(mathX - px, -3.0, 3.0));
        setVy(clamp(mathY - py, -3.0, 3.0));
      }
    } else if (mode === "frame_barycentric") {
      const scale = 55;
      const mathX = Number((mouseSvgX / scale).toFixed(2));
      const mathY = Number((-mouseSvgY / scale).toFixed(2));

      if (draggingTarget === "P0") {
        setP0({ x: clamp(mathX, -3.0, 3.0), y: clamp(mathY, -2.5, 2.5) });
      } else if (draggingTarget === "P1") {
        setP1({ x: clamp(mathX, -3.0, 3.0), y: clamp(mathY, -2.5, 2.5) });
      } else if (draggingTarget === "P2") {
        setP2({ x: clamp(mathX, -3.0, 3.0), y: clamp(mathY, -2.5, 2.5) });
      } else if (draggingTarget === "P") {
        // Solve for lambda1, lambda2: P - P0 = l1*(P1-P0) + l2*(P2-P0)
        const v1x = p1.x - p0.x;
        const v1y = p1.y - p0.y;
        const v2x = p2.x - p0.x;
        const v2y = p2.y - p0.y;
        const dx = mathX - p0.x;
        const dy = mathY - p0.y;
        const det = v1x * v2y - v2x * v1y || 1e-5;
        const l1 = (dx * v2y - dy * v2x) / det;
        const l2 = (v1x * dy - v1y * dx) / det;
        setLambda1(clamp(Number(l1.toFixed(2)), -0.8, 1.5));
        setLambda2(clamp(Number(l2.toFixed(2)), -0.8, 1.5));
      }
    }
  };

  const handleSvgPointerUp = () => {
    setDraggingTarget(null);
  };

  const modeSelector = (
    <div className="flex w-full items-center justify-between gap-2 overflow-x-auto">
      <KdeTabs<DiagramMode>
        onChange={(val) => setMode(val)}
        options={MODE_OPTIONS}
        value={mode}
        size="sm"
        variant="default"
      />
    </div>
  );

  // SVG coordinate conversions for Mode 1
  const scale1 = 38;
  const svgOx = ox * scale1;
  const svgOy = -oy * scale1;
  const svgPx = px * scale1;
  const svgPy = -py * scale1;
  const svgQx = qx * scale1;
  const svgQy = -qy * scale1;

  const pointVectorControls = (
    <div className="grid grid-cols-1 gap-3">
      <KdeCard
        title="1. 观察者原点 O(x₀, y₀)（可拖拽）"
        badge={<KdeBadge variant="warning">ORIGIN</KdeBadge>}
      >
        <ParamSlider
          labelMode="adaptive"
          display={`${ox.toFixed(1)}`}
          label="原点 $O_x$"
          max={3.0}
          min={-3.0}
          onChange={setOx}
          step={0.1}
          value={ox}
        />
        <ParamSlider
          labelMode="adaptive"
          display={`${oy.toFixed(1)}`}
          label="原点 $O_y$"
          max={3.0}
          min={-3.0}
          onChange={setOy}
          step={0.1}
          value={oy}
        />
      </KdeCard>

      <KdeCard
        title="2. 空间点 P（可拖拽）"
        badge={<KdeBadge variant="primary">POINT</KdeBadge>}
      >
        <ParamSlider
          labelMode="adaptive"
          display={`${px.toFixed(1)}`}
          label="基准点 $P_x$"
          max={3.0}
          min={-3.0}
          onChange={setPx}
          step={0.1}
          value={px}
        />
        <ParamSlider
          labelMode="adaptive"
          display={`${py.toFixed(1)}`}
          label="基准点 $P_y$"
          max={3.0}
          min={-3.0}
          onChange={setPy}
          step={0.1}
          value={py}
        />
      </KdeCard>

      <KdeCard
        title="3. 终点 Q = P + v（可拖拽）"
        badge={<KdeBadge variant="success">TARGET</KdeBadge>}
      >
        <ParamSlider
          labelMode="adaptive"
          display={`${vx.toFixed(1)}`}
          label="向量 $v_x$"
          max={3.0}
          min={-3.0}
          onChange={setVx}
          step={0.1}
          value={vx}
        />
        <ParamSlider
          labelMode="adaptive"
          display={`${vy.toFixed(1)}`}
          label="向量 $v_y$"
          max={3.0}
          min={-3.0}
          onChange={setVy}
          step={0.1}
          value={vy}
        />
      </KdeCard>
    </div>
  );

  const pointVectorSvg = (
    <svg
      ref={svgRef}
      className="h-full w-full select-none"
      onPointerMove={handleSvgPointerMove}
      onPointerUp={handleSvgPointerUp}
      viewBox="-250 -180 500 360"
    >
      <defs>
        <pattern
          height="30"
          id="grid-m1"
          patternUnits="userSpaceOnUse"
          width="30"
        >
          <path
            d="M 30 0 L 0 0 0 30"
            fill="none"
            stroke="#334155"
            strokeWidth="0.5"
          />
        </pattern>
        <marker
          id="arrow-axis-m1"
          markerHeight="6"
          markerWidth="6"
          orient="auto"
          refX="5"
          refY="3"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#475569" />
        </marker>
        <marker
          id="arrow-green"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#10b981" />
        </marker>
        <marker
          id="arrow-indigo"
          markerHeight="6"
          markerWidth="6"
          orient="auto"
          refX="5"
          refY="3"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#6366f1" />
        </marker>
        <marker
          id="arrow-sky"
          markerHeight="6"
          markerWidth="6"
          orient="auto"
          refX="5"
          refY="3"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#38bdf8" />
        </marker>
      </defs>

      {/* Grid */}
      <rect
        fill="url(#grid-m1)"
        height="360"
        opacity="0.35"
        width="500"
        x="-250"
        y="-180"
      />

      {/* Observer Coordinate Axes at O */}
      <g>
        <line
          markerEnd="url(#arrow-axis-m1)"
          stroke="#64748b"
          strokeDasharray="4 3"
          strokeWidth="1.5"
          x1={svgOx - 180}
          x2={svgOx + 180}
          y1={svgOy}
          y2={svgOy}
        />
        <line
          markerEnd="url(#arrow-axis-m1)"
          stroke="#64748b"
          strokeDasharray="4 3"
          strokeWidth="1.5"
          x1={svgOx}
          x2={svgOx}
          y1={svgOy + 140}
          y2={svgOy - 140}
        />
        <text
          fill="#64748b"
          fontSize="11"
          fontWeight="bold"
          x={svgOx + 185}
          y={svgOy + 4}
        >
          X_O
        </text>
        <text
          fill="#64748b"
          fontSize="11"
          fontWeight="bold"
          x={svgOx - 8}
          y={svgOy - 145}
        >
          Y_O
        </text>
      </g>

      {/* Position Vectors from O */}
      <line
        markerEnd="url(#arrow-indigo)"
        opacity="0.8"
        stroke="#6366f1"
        strokeDasharray="3 3"
        strokeWidth="1.5"
        x1={svgOx}
        x2={svgPx}
        y1={svgOy}
        y2={svgPy}
      />
      <line
        markerEnd="url(#arrow-sky)"
        opacity="0.8"
        stroke="#38bdf8"
        strokeDasharray="3 3"
        strokeWidth="1.5"
        x1={svgOx}
        x2={svgQx}
        y1={svgOy}
        y2={svgQy}
      />

      {/* Free Geometric Vector v = Q - P (Absolute Displacement) */}
      <line
        markerEnd="url(#arrow-green)"
        stroke="#10b981"
        strokeWidth="3.5"
        x1={svgPx}
        x2={svgQx}
        y1={svgPy}
        y2={svgQy}
      />

      {/* Interactive Drag Handles */}
      {/* Target O */}
      <g
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDownTarget("O", e)}
      >
        <circle cx={svgOx} cy={svgOy} fill="transparent" r="18" />
        <circle
          cx={svgOx}
          cy={svgOy}
          fill="#f59e0b"
          r={draggingTarget === "O" ? 8 : 6}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          fill="#f59e0b"
          fontSize="12"
          fontWeight="bold"
          pointerEvents="none"
          x={svgOx + 10}
          y={svgOy + 16}
        >
          O (拖拽原点)
        </text>
      </g>

      {/* Target P */}
      <g
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDownTarget("P", e)}
      >
        <circle cx={svgPx} cy={svgPy} fill="transparent" r="18" />
        <circle
          cx={svgPx}
          cy={svgPy}
          fill="#6366f1"
          r={draggingTarget === "P" ? 8 : 6}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          fill="#6366f1"
          fontSize="12"
          fontWeight="bold"
          pointerEvents="none"
          x={svgPx + 10}
          y={svgPy - 10}
        >
          基准点 P
        </text>
      </g>

      {/* Target Q (Moves Vector v) */}
      <g
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDownTarget("Q", e)}
      >
        <circle cx={svgQx} cy={svgQy} fill="transparent" r="18" />
        <circle
          cx={svgQx}
          cy={svgQy}
          fill="#38bdf8"
          r={draggingTarget === "Q" ? 8 : 6}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          fill="#38bdf8"
          fontSize="12"
          fontWeight="bold"
          pointerEvents="none"
          x={svgQx + 10}
          y={svgQy - 12}
        >
          点 Q = P + v
        </text>
      </g>

      {/* Vector v Label */}
      <text
        fill="#34d399"
        fontSize="12"
        fontWeight="bold"
        x={(svgPx + svgQx) / 2 + 10}
        y={(svgPy + svgQy) / 2 - 10}
      >
        v = Q - P (自由向量)
      </text>
    </svg>
  );

  const pointVectorReadouts = (
    <>
      <KdeCard
        title="观察者原点 O 下的坐标投影（依赖原点）"
        badge={<KdeBadge variant="warning">DEPENDENT</KdeBadge>}
      >
        <div className="space-y-1.5 text-xs text-[var(--kde-ink)]">
          <div className="font-semibold text-[var(--kde-accent)]">
            {`$[P]_O = P - O = (${relPx.toFixed(1)},\\, ${relPy.toFixed(1)})^T`}
          </div>
          <div className="font-semibold text-sky-600 dark:text-sky-400">
            {`$[Q]_O = Q - O = (${relQx.toFixed(1)},\\, ${relQy.toFixed(1)})^T`}
          </div>
          <div className="pt-1 text-[11px] text-[var(--kde-muted)]">
            💡 尝试在画布中直接拖拽原点 $O$，你会发现点 $P$ 和 $Q$
            的数值坐标剧烈改变！
          </div>
        </div>
      </KdeCard>

      <KdeCard
        title={"代数差值向量 $\\mathbf{v} = Q - P$（绝对不变！）"}
        badge={<KdeBadge variant="success">INVARIANT</KdeBadge>}
        variant="highlight"
      >
        <div className="space-y-1.5 text-xs text-[var(--kde-ink)]">
          <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {`$\\mathbf{v} = [Q]_O - [P]_O = (${vx.toFixed(1)},\\, ${vy.toFixed(1)})^T`}
          </div>
          <div className="text-[11px] leading-relaxed text-[var(--kde-muted)]">
            {"✨ "}
            <strong>公理自由传递性</strong>
            {
              "：虽然点 $P, Q$ 的数值完全取决于原点选择，但两点之间的几何差向量 $\\mathbf{v} \\in V$ 与原点位置 100% 独立无关！"
            }
          </div>
        </div>
      </KdeCard>
    </>
  );

  const frameControls = (
    <div className="grid grid-cols-1 gap-3">
      <KdeCard
        title="权重分配 (λ₀ + λ₁ + λ₂ = 1)"
        badge={
          isInsideTriangle ? (
            <KdeBadge variant="success">凸组合</KdeBadge>
          ) : (
            <KdeBadge variant="warning">仿射组合</KdeBadge>
          )
        }
      >
        <div className="mb-2 text-xs text-[var(--kde-muted)]">
          权重系数 $\lambda_1$（沿 $P_1 - P_0$）
        </div>
        <ParamSlider
          labelMode="adaptive"
          display={`${lambda1.toFixed(2)}`}
          label="$\lambda_1$"
          max={1.5}
          min={-0.8}
          onChange={setLambda1}
          step={0.05}
          value={lambda1}
        />
        <div className="mb-2 mt-2 text-xs text-[var(--kde-muted)]">
          权重系数 $\lambda_2$（沿 $P_2 - P_0$）
        </div>
        <ParamSlider
          labelMode="adaptive"
          display={`${lambda2.toFixed(2)}`}
          label="$\lambda_2$"
          max={1.5}
          min={-0.8}
          onChange={setLambda2}
          step={0.05}
          value={lambda2}
        />
        <div className="mt-3 flex items-center justify-between border-t border-[var(--kde-border)]/50 pt-2 text-xs text-[var(--kde-muted)]">
          <span>基准权重 $\lambda_0 = 1 - \lambda_1 - \lambda_2$</span>
          <span className="font-mono font-bold text-[var(--kde-ink)]">
            {lambda0.toFixed(2)}
          </span>
        </div>
      </KdeCard>
    </div>
  );

  const frameSvg = (() => {
    const scale = 55;
    const toSvgX = (x: number) => x * scale;
    const toSvgY = (y: number) => -y * scale;

    const sP0x = toSvgX(p0.x);
    const sP0y = toSvgY(p0.y);
    const sP1x = toSvgX(p1.x);
    const sP1y = toSvgY(p1.y);
    const sP2x = toSvgX(p2.x);
    const sP2y = toSvgY(p2.y);
    const sPx = toSvgX(baryPx);
    const sPy = toSvgY(baryPy);

    return (
      <svg
        ref={svgRef}
        className="h-full w-full select-none"
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        viewBox="-250 -180 500 360"
      >
        <defs>
          <pattern
            height="30"
            id="grid-m2"
            patternUnits="userSpaceOnUse"
            width="30"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#334155"
              strokeWidth="0.5"
            />
          </pattern>
          <marker
            id="arrow-axis"
            markerHeight="6"
            markerWidth="6"
            orient="auto"
            refX="5"
            refY="3"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#64748b" />
          </marker>
          <marker
            id="arrow-f1"
            markerHeight="7"
            markerWidth="7"
            orient="auto"
            refX="6"
            refY="3.5"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#6366f1" />
          </marker>
          <marker
            id="arrow-f2"
            markerHeight="7"
            markerWidth="7"
            orient="auto"
            refX="6"
            refY="3.5"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#10b981" />
          </marker>
        </defs>

        <rect
          fill="url(#grid-m2)"
          height="360"
          opacity="0.35"
          width="500"
          x="-250"
          y="-180"
        />

        {/* Triangle / Simplex Area */}
        <polygon
          fill={isInsideTriangle ? "#10b981" : "#f59e0b"}
          fillOpacity={isInsideTriangle ? "0.18" : "0.08"}
          points={`${sP0x},${sP0y} ${sP1x},${sP1y} ${sP2x},${sP2y}`}
          stroke={isInsideTriangle ? "#10b981" : "#f59e0b"}
          strokeDasharray={isInsideTriangle ? "none" : "4 4"}
          strokeWidth="1.5"
        />

        {/* Affine Basis Vectors e1 = P1 - P0, e2 = P2 - P0 */}
        <line
          markerEnd="url(#arrow-f1)"
          stroke="#6366f1"
          strokeWidth="2.5"
          x1={sP0x}
          x2={sP1x}
          y1={sP0y}
          y2={sP1y}
        />
        <line
          markerEnd="url(#arrow-f2)"
          stroke="#10b981"
          strokeWidth="2.5"
          x1={sP0x}
          x2={sP2x}
          y1={sP0y}
          y2={sP2y}
        />

        {/* Parallelogram Vector Components from P0 to P */}
        <line
          opacity="0.6"
          stroke="#6366f1"
          strokeDasharray="3 3"
          strokeWidth="1.5"
          x1={sP0x + lambda2 * (sP2x - sP0x)}
          x2={sPx}
          y1={sP0y + lambda2 * (sP2y - sP0y)}
          y2={sPy}
        />
        <line
          opacity="0.6"
          stroke="#10b981"
          strokeDasharray="3 3"
          strokeWidth="1.5"
          x1={sP0x + lambda1 * (sP1x - sP0x)}
          x2={sPx}
          y1={sP0y + lambda1 * (sP1y - sP0y)}
          y2={sPy}
        />

        {/* Basis Vectors Labels */}
        <text
          fill="#818cf8"
          fontSize="11"
          fontWeight="bold"
          x={(sP0x + sP1x) / 2}
          y={(sP0y + sP1y) / 2 + 16}
        >
          e₁ = P₁ - P₀
        </text>
        <text
          fill="#34d399"
          fontSize="11"
          fontWeight="bold"
          x={(sP0x + sP2x) / 2 - 35}
          y={(sP0y + sP2y) / 2 - 8}
        >
          e₂ = P₂ - P₀
        </text>

        {/* Drag Targets: P0, P1, P2 */}
        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDownTarget("P0", e)}
        >
          <circle cx={sP0x} cy={sP0y} fill="transparent" r="16" />
          <circle
            cx={sP0x}
            cy={sP0y}
            fill="#f59e0b"
            r={draggingTarget === "P0" ? 7 : 5}
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            fill="#f59e0b"
            fontSize="12"
            fontWeight="bold"
            x={sP0x - 22}
            y={sP0y + 16}
          >
            P₀ (标架基点)
          </text>
        </g>

        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDownTarget("P1", e)}
        >
          <circle cx={sP1x} cy={sP1y} fill="transparent" r="16" />
          <circle
            cx={sP1x}
            cy={sP1y}
            fill="#6366f1"
            r={draggingTarget === "P1" ? 7 : 5}
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            fill="#6366f1"
            fontSize="12"
            fontWeight="bold"
            x={sP1x + 8}
            y={sP1y + 14}
          >
            P₁
          </text>
        </g>

        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDownTarget("P2", e)}
        >
          <circle cx={sP2x} cy={sP2y} fill="transparent" r="16" />
          <circle
            cx={sP2x}
            cy={sP2y}
            fill="#10b981"
            r={draggingTarget === "P2" ? 7 : 5}
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            fill="#10b981"
            fontSize="12"
            fontWeight="bold"
            x={sP2x - 8}
            y={sP2y - 10}
          >
            P₂
          </text>
        </g>

        {/* Current Affine Point P */}
        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDownTarget("P", e)}
        >
          <circle cx={sPx} cy={sPy} fill="transparent" r="18" />
          <circle
            cx={sPx}
            cy={sPy}
            fill={isInsideTriangle ? "#10b981" : "#f59e0b"}
            r={draggingTarget === "P" ? 9 : 7}
            stroke="#ffffff"
            strokeWidth="2.5"
          />
          <text
            fill={isInsideTriangle ? "#34d399" : "#fbbf24"}
            fontSize="12"
            fontWeight="bold"
            x={sPx + 10}
            y={sPy - 10}
          >
            {`P (λ₀=${lambda0.toFixed(2)}, λ₁=${lambda1.toFixed(2)}, λ₂=${lambda2.toFixed(2)})`}
          </text>
        </g>
      </svg>
    );
  })();

  const frameReadouts = (
    <>
      <KdeCard
        title="仿射组合无原点良定性（可直接拖拽点 P）"
        badge={<KdeBadge variant="primary">BARYCENTRIC</KdeBadge>}
      >
        <div className="space-y-1 text-xs text-[var(--kde-ink)]">
          <div>
            重心坐标展开： $P = P_0 + \lambda_1(P_1 - P_0) + \lambda_2(P_2 -
            P_0)$
          </div>
          <div className="font-mono text-sm font-semibold text-[var(--kde-accent)]">
            {`$[P]_{\\mathcal{F}} = (${lambda1.toFixed(2)},\\, ${lambda2.toFixed(2)})^T`}
          </div>
        </div>
      </KdeCard>

      <KdeCard
        title={
          isInsideTriangle
            ? "处于凸包内部 (Convex Hull)"
            : "处于凸包外部 (Affine Hull)"
        }
        badge={
          isInsideTriangle ? (
            <KdeBadge variant="success">λᵢ ≥ 0</KdeBadge>
          ) : (
            <KdeBadge variant="warning">∑λᵢ = 1</KdeBadge>
          )
        }
        variant={isInsideTriangle ? "default" : "highlight"}
      >
        <p className="text-[11px] leading-relaxed text-[var(--kde-muted)]">
          {isInsideTriangle ? (
            <span>
              所有重心坐标非负 $\lambda_i \ge 0$，点 $P$
              严格位于三角形内部（凸组合）。
            </span>
          ) : (
            <span>
              {
                "存在负权重 $\\lambda_i < 0$，点 $P$ 超出三角形边界，但仍严格满足全仿射平面约束 $\\sum \\lambda_i = 1$（仿射组合）。"
              }
            </span>
          )}
        </p>
      </KdeCard>
    </>
  );

  const homogenizationControls = (
    <div className="grid grid-cols-1 gap-3">
      <KdeCard
        title="测试对象类型"
        badge={<KdeBadge variant="primary">DIMENSION</KdeBadge>}
      >
        <KdeTabs<"point" | "vector">
          options={[
            { id: "point", label: "仿射点 (w = 1)" },
            { id: "vector", label: "方向向量 (w = 0)" },
          ]}
          value={testType}
          onChange={(t) => setTestType(t)}
          size="xs"
          variant="pill"
        />
      </KdeCard>

      <KdeCard title="仿射平移向量 (tx, ty)">
        <ParamSlider
          labelMode="adaptive"
          display={`${tx.toFixed(1)}`}
          label="$t_x$"
          max={3.0}
          min={-3.0}
          onChange={setTx}
          step={0.2}
          value={tx}
        />
        <ParamSlider
          labelMode="adaptive"
          display={`${ty.toFixed(1)}`}
          label="$t_y$"
          max={3.0}
          min={-3.0}
          onChange={setTy}
          step={0.2}
          value={ty}
        />
      </KdeCard>

      <KdeCard title="线性旋转角 θ">
        <ParamSlider
          labelMode="adaptive"
          display={`${thetaDeg}°`}
          label="$\theta$"
          max={180}
          min={-180}
          onChange={setThetaDeg}
          step={5}
          value={thetaDeg}
        />
      </KdeCard>
    </div>
  );

  const homogenizationSvg = (() => {
    // 2.5D Isometric/Oblique Projection Transform
    // Map (x, y, w) to 2D screen coordinates
    const project25D = (x: number, y: number, w: number) => {
      const scaleX = 42;
      const scaleY = 24;
      const scaleW = 90;

      // Isometric projection basis
      const screenX = x * scaleX - y * scaleX * 0.6;
      const screenY = -w * scaleW + x * scaleY * 0.4 + y * scaleY;
      return { x: screenX, y: screenY + 20 };
    };

    const origin3D = project25D(0, 0, 0);
    const xAxisEnd = project25D(3.5, 0, 0);
    const yAxisEnd = project25D(0, 3.5, 0);
    const wAxisEnd = project25D(0, 0, 1.6);

    // Hyperplane w = 1 Corners
    const p1_00 = project25D(-2.5, -2.5, 1);
    const p1_30 = project25D(3.5, -2.5, 1);
    const p1_33 = project25D(3.5, 3.5, 1);
    const p1_03 = project25D(-2.5, 3.5, 1);

    // Hyperplane w = 0 (Vector Subspace) Corners
    const p0_00 = project25D(-2.5, -2.5, 0);
    const p0_30 = project25D(3.5, -2.5, 0);
    const p0_33 = project25D(3.5, 3.5, 0);
    const p0_03 = project25D(-2.5, 3.5, 0);

    const origPt = project25D(rawX, rawY, rawW);
    const transPt = project25D(transformedX, transformedY, transformedW);

    return (
      <svg className="h-full w-full select-none" viewBox="-250 -180 500 360">
        <defs>
          <marker
            id="arrow-3d-axis"
            markerHeight="6"
            markerWidth="6"
            orient="auto"
            refX="5"
            refY="3"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#64748b" />
          </marker>
          <marker
            id="arrow-transform"
            markerHeight="7"
            markerWidth="7"
            orient="auto"
            refX="6"
            refY="3.5"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#38bdf8" />
          </marker>
          <marker
            id="arrow-vector-h"
            markerHeight="7"
            markerWidth="7"
            orient="auto"
            refX="6"
            refY="3.5"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#a855f7" />
          </marker>
        </defs>

        {/* Hyperplane w = 0 (Vector Subspace V) */}
        <polygon
          fill="#6366f1"
          fillOpacity="0.06"
          points={`${p0_00.x},${p0_00.y} ${p0_30.x},${p0_30.y} ${p0_33.x},${p0_33.y} ${p0_03.x},${p0_03.y}`}
          stroke="#6366f1"
          strokeDasharray="4 3"
          strokeWidth="1"
        />
        <text
          fill="#818cf8"
          fontSize="11"
          fontWeight="bold"
          x={p0_30.x - 30}
          y={p0_30.y + 14}
        >
          超平面 w = 0 (线性向量空间 V)
        </text>

        {/* Hyperplane w = 1 (Affine Space A) */}
        <polygon
          fill="#10b981"
          fillOpacity="0.15"
          points={`${p1_00.x},${p1_00.y} ${p1_30.x},${p1_30.y} ${p1_33.x},${p1_33.y} ${p1_03.x},${p1_03.y}`}
          stroke="#10b981"
          strokeWidth="1.5"
        />
        <text
          fill="#34d399"
          fontSize="11"
          fontWeight="bold"
          x={p1_30.x - 30}
          y={p1_30.y + 14}
        >
          仿射切片超平面 w = 1 (点空间 A)
        </text>

        {/* 3D Axes */}
        <line
          markerEnd="url(#arrow-3d-axis)"
          stroke="#475569"
          strokeWidth="1.5"
          x1={origin3D.x}
          x2={xAxisEnd.x}
          y1={origin3D.y}
          y2={xAxisEnd.y}
        />
        <line
          markerEnd="url(#arrow-3d-axis)"
          stroke="#475569"
          strokeWidth="1.5"
          x1={origin3D.x}
          x2={yAxisEnd.x}
          y1={origin3D.y}
          y2={yAxisEnd.y}
        />
        <line
          markerEnd="url(#arrow-3d-axis)"
          stroke="#64748b"
          strokeWidth="2"
          x1={origin3D.x}
          x2={wAxisEnd.x}
          y1={origin3D.y}
          y2={wAxisEnd.y}
        />

        <text
          fill="#64748b"
          fontSize="11"
          fontWeight="bold"
          x={xAxisEnd.x + 8}
          y={xAxisEnd.y}
        >
          X
        </text>
        <text
          fill="#64748b"
          fontSize="11"
          fontWeight="bold"
          x={yAxisEnd.x}
          y={yAxisEnd.y + 14}
        >
          Y
        </text>
        <text
          fill="#38bdf8"
          fontSize="12"
          fontWeight="bold"
          x={wAxisEnd.x - 14}
          y={wAxisEnd.y - 6}
        >
          W (齐次高度)
        </text>

        {/* Ray/Embedding from (0,0,0) */}
        <line
          stroke="#94a3b8"
          strokeDasharray="2 2"
          strokeWidth="1"
          x1={origin3D.x}
          x2={origPt.x}
          y1={origin3D.y}
          y2={origPt.y}
        />
        <line
          stroke="#94a3b8"
          strokeDasharray="2 2"
          strokeWidth="1"
          x1={origin3D.x}
          x2={transPt.x}
          y1={origin3D.y}
          y2={transPt.y}
        />

        {/* Transformation Arc / Path */}
        <line
          markerEnd="url(#arrow-transform)"
          stroke="#38bdf8"
          strokeDasharray="4 3"
          strokeWidth="2"
          x1={origPt.x}
          x2={transPt.x}
          y1={origPt.y}
          y2={transPt.y}
        />

        {/* Original Point / Vector */}
        <circle
          cx={origPt.x}
          cy={origPt.y}
          fill={testType === "point" ? "#6366f1" : "#a855f7"}
          r="6"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <text
          fill={testType === "point" ? "#818cf8" : "#c084fc"}
          fontSize="11"
          fontWeight="bold"
          x={origPt.x + 8}
          y={origPt.y - 6}
        >
          初始 ({rawX.toFixed(1)}, {rawY.toFixed(1)}, {rawW})
        </text>

        {/* Transformed Point / Vector */}
        <circle
          cx={transPt.x}
          cy={transPt.y}
          fill="#38bdf8"
          r="7"
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          fill="#38bdf8"
          fontSize="11"
          fontWeight="bold"
          x={transPt.x + 10}
          y={transPt.y - 8}
        >
          变换后 ({transformedX.toFixed(1)}, {transformedY.toFixed(1)},{" "}
          {transformedW})
        </text>
      </svg>
    );
  })();

  const homogenizationReadouts = (
    <>
      <KdeCard
        title="齐次分块矩阵作用方程"
        badge={<KdeBadge variant="primary">HOMOGENEOUS</KdeBadge>}
      >
        <div className="overflow-x-auto py-1 text-xs">
          {`$$\\begin{pmatrix} X' \\\\ Y' \\\\ W' \\end{pmatrix} = \\begin{pmatrix} \\cos\\theta & -\\sin\\theta & t_x \\\\ \\sin\\theta & \\cos\\theta & t_y \\\\ 0 & 0 & 1 \\end{pmatrix} \\begin{pmatrix} ${rawX.toFixed(1)} \\\\ ${rawY.toFixed(1)} \\\\ ${rawW} \\end{pmatrix} = \\begin{pmatrix} ${transformedX.toFixed(2)} \\\\ ${transformedY.toFixed(2)} \\\\ ${transformedW} \\end{pmatrix}$$`}
        </div>
      </KdeCard>

      <KdeCard
        title="半直积与超平面保持机制"
        badge={
          testType === "point" ? (
            <KdeBadge variant="success">w = 1 切片</KdeBadge>
          ) : (
            <KdeBadge variant="warning">w = 0 子空间</KdeBadge>
          )
        }
      >
        <p className="text-xs leading-relaxed text-[var(--kde-muted)]">
          {testType === "point" ? (
            <span>
              {"📌 当输入为"}
              <strong className="text-[var(--kde-ink)]">仿射点</strong>
              {
                "（$w = 1$）时，平移分量 $\\mathbf{t} \\times 1$ 起效，且输出高度恒为 $w' = 1$，严格保持在仿射切片超平面上！"
              }
            </span>
          ) : (
            <span>
              {"🚀 当输入为"}
              <strong className="text-[var(--kde-ink)]">方向向量</strong>
              {
                "（$w = 0$）时，平移分量 $\\mathbf{t} \\times 0 = 0$ 自动消去，向量只经历纯线性旋转，不产生平移，保持在向量子空间中！"
              }
            </span>
          )}
        </p>
      </KdeCard>
    </>
  );

  return (
    <AutoMath>
      <ExpandableDemo id="affine-space-diagram">
        <KdeWindowShell
          channel="CH 01"
          title="仿射几何公理与代数结构交互探针"
          eyebrow="BREEZE WORKSPACE · AFFINE AXIOMS"
          mark="B"
          modeTag="AFFINE"
          tabs={modeSelector}
          testId="affine-space-diagram-console"
          display={
            <div className="relative flex h-full min-h-[20rem] w-full flex-1 items-center justify-center overflow-hidden">
              <CanvasToolbar onReset={handleReset} />
              {mode === "point_vector" && pointVectorSvg}
              {mode === "frame_barycentric" && frameSvg}
              {mode === "homogenization" && homogenizationSvg}
              <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
            </div>
          }
          controls={
            <div className="flex flex-col gap-3">
              {mode === "point_vector" && pointVectorControls}
              {mode === "frame_barycentric" && frameControls}
              {mode === "homogenization" && homogenizationControls}
            </div>
          }
          footer={
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {mode === "point_vector" && pointVectorReadouts}
              {mode === "frame_barycentric" && frameReadouts}
              {mode === "homogenization" && homogenizationReadouts}
            </div>
          }
        />
      </ExpandableDemo>
    </AutoMath>
  );
}
