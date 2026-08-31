import React, { useState, useRef } from "react";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import { clamp } from "@math";

type DiagramMode = "point_vector" | "frame_barycentric" | "homogenization";

const MODE_OPTIONS = [
  { id: "point_vector" as const, label: "1. 点 vs 自由向量（原点平移不变性）" },
  {
    id: "frame_barycentric" as const,
    label: "2. Affine Frame 与重心坐标（仿射包 vs 凸包）",
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

  return (
    <ExpandableDemo id="affine-space-diagram">
      <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
              仿射几何公理与代数结构交互探针
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ✨ <strong>画布支持直接拖拽</strong>：拖动空间点{" "}
              <InlineMath tex="P" />
              、原点 <InlineMath tex="O" /> 或基准顶点 <InlineMath tex="P_i" />
              ，实时观察代数与几何联动
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mb-5 overflow-x-auto pb-1">
          <CapsuleTabs
            onChange={(val) => setMode(val as DiagramMode)}
            options={MODE_OPTIONS}
            value={mode}
          />
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: Point vs Free Vector */}
        {/* ========================================================================= */}
        {mode === "point_vector" && (
          <div>
            {/* Sliders */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  1. 观察者原点 <InlineMath tex="O(x_0, y_0)" />
                  （可拖拽）
                </div>
                <ParamSlider
                  display={`${ox.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      原点 <InlineMath tex="O_x" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setOx}
                  step={0.1}
                  value={ox}
                />
                <ParamSlider
                  display={`${oy.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      原点 <InlineMath tex="O_y" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setOy}
                  step={0.1}
                  value={oy}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  2. 空间点 <InlineMath tex="P" />
                  （可拖拽）
                </div>
                <ParamSlider
                  display={`${px.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      基准点 <InlineMath tex="P_x" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setPx}
                  step={0.1}
                  value={px}
                />
                <ParamSlider
                  display={`${py.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      基准点 <InlineMath tex="P_y" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setPy}
                  step={0.1}
                  value={py}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  3. 终点 <InlineMath tex="Q = P + \mathbf{v}" />
                  （可拖拽）
                </div>
                <ParamSlider
                  display={`${vx.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      向量 <InlineMath tex="v_x" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setVx}
                  step={0.1}
                  value={vx}
                />
                <ParamSlider
                  display={`${vy.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      向量 <InlineMath tex="v_y" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setVy}
                  step={0.1}
                  value={vy}
                />
              </div>
            </div>

            {/* SVG Viewport with Dragging */}
            <div className="relative mb-5 flex h-[var(--demo-height,20rem)] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 shadow-inner dark:border-slate-800">
              <CanvasToolbar onReset={handleReset} />
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
                    id="arrow-amber"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto"
                    refX="5"
                    refY="3"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="arrow-indigo"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto"
                    refX="5"
                    refY="3"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
                  </marker>
                  <marker
                    id="arrow-emerald"
                    markerHeight="7"
                    markerWidth="7"
                    orient="auto"
                    refX="6"
                    refY="3.5"
                  >
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Grid */}
                <rect
                  fill="url(#grid-m1)"
                  height="360"
                  width="500"
                  x="-250"
                  y="-180"
                />

                {(() => {
                  const scale = 38;
                  const svgOx = ox * scale;
                  const svgOy = -oy * scale;
                  const svgPx = px * scale;
                  const svgPy = -py * scale;
                  const svgQx = qx * scale;
                  const svgQy = -qy * scale;

                  return (
                    <g>
                      {/* Origin O Coordinate Axes */}
                      <line
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                        x1={svgOx - 180}
                        x2={svgOx + 180}
                        y1={svgOy}
                        y2={svgOy}
                      />
                      <line
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                        x1={svgOx}
                        x2={svgOx}
                        y1={svgOy - 140}
                        y2={svgOy + 140}
                      />

                      {/* Position Vector OP */}
                      <line
                        markerEnd="url(#arrow-indigo)"
                        stroke="#6366f1"
                        strokeDasharray="3 3"
                        strokeWidth="2"
                        x1={svgOx}
                        x2={svgPx}
                        y1={svgOy}
                        y2={svgPy}
                      />
                      {/* Position Vector OQ */}
                      <line
                        markerEnd="url(#arrow-indigo)"
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        strokeWidth="2"
                        x1={svgOx}
                        x2={svgQx}
                        y1={svgOy}
                        y2={svgQy}
                      />

                      {/* Free Vector v = Q - P */}
                      <line
                        markerEnd="url(#arrow-emerald)"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        x1={svgPx}
                        x2={svgQx}
                        y1={svgPy}
                        y2={svgQy}
                      />

                      {/* Draggable Origin O */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("O", e)}
                      >
                        <circle
                          cx={svgOx}
                          cy={svgOy}
                          fill="transparent"
                          r="18"
                        />
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
                          y={svgOy - 10}
                        >
                          O (拖拽原点)
                        </text>
                      </g>

                      {/* Draggable Point P */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("P", e)}
                      >
                        <circle
                          cx={svgPx}
                          cy={svgPy}
                          fill="transparent"
                          r="18"
                        />
                        <circle
                          cx={svgPx}
                          cy={svgPy}
                          fill="#6366f1"
                          r={draggingTarget === "P" ? 8 : 6}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          fill="#818cf8"
                          fontSize="12"
                          fontWeight="bold"
                          pointerEvents="none"
                          x={svgPx - 10}
                          y={svgPy - 12}
                        >
                          点 P
                        </text>
                      </g>

                      {/* Draggable Point Q */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("Q", e)}
                      >
                        <circle
                          cx={svgQx}
                          cy={svgQy}
                          fill="transparent"
                          r="18"
                        />
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
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Diagnostic Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  观察者原点 <InlineMath tex="O" /> 下的坐标投影（依赖原点）
                </div>
                <div className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      <InlineMath
                        tex={`[P]_O = P - O = (${relPx.toFixed(1)},\\, ${relPy.toFixed(1)})^T`}
                      />
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      <InlineMath
                        tex={`[Q]_O = Q - O = (${relQx.toFixed(1)},\\, ${relQy.toFixed(1)})^T`}
                      />
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-slate-500">
                    💡 尝试在画布中直接拖拽原点 <InlineMath tex="O" />
                    ，你会发现点 <InlineMath tex="P" /> 和{" "}
                    <InlineMath tex="Q" /> 的数值坐标剧烈改变！
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  代数差值向量 <InlineMath tex="\mathbf{v} = Q - P" />
                  （绝对不变！）
                </div>
                <div className="mt-2 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="font-semibold">
                    <InlineMath
                      tex={`\\mathbf{v} = [Q]_O - [P]_O = (${vx.toFixed(1)},\\, ${vy.toFixed(1)})^T`}
                    />
                  </div>
                  <div className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                    ✨ <strong>公理自由传递性</strong>：虽然点{" "}
                    <InlineMath tex="P, Q" />{" "}
                    的数值完全取决于原点选择，但两点之间的几何差向量{" "}
                    <InlineMath tex="\mathbf{v} \in V" /> 与原点位置 100%
                    独立无关！
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: Affine Frame & Barycentric Coordinates */}
        {/* ========================================================================= */}
        {mode === "frame_barycentric" && (
          <div>
            {/* Sliders */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  权重系数 <InlineMath tex="\lambda_1" />
                  （沿 <InlineMath tex="P_1 - P_0" />）
                </div>
                <ParamSlider
                  display={`${lambda1.toFixed(2)}`}
                  label={
                    <span className="text-xs">
                      <InlineMath tex="\lambda_1" />
                    </span>
                  }
                  max={1.5}
                  min={-0.8}
                  onChange={setLambda1}
                  step={0.05}
                  value={lambda1}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  权重系数 <InlineMath tex="\lambda_2" />
                  （沿 <InlineMath tex="P_2 - P_0" />）
                </div>
                <ParamSlider
                  display={`${lambda2.toFixed(2)}`}
                  label={
                    <span className="text-xs">
                      <InlineMath tex="\lambda_2" />
                    </span>
                  }
                  max={1.5}
                  min={-0.8}
                  onChange={setLambda2}
                  step={0.05}
                  value={lambda2}
                />
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  仿射约束基准权重{" "}
                  <InlineMath tex="\lambda_0 = 1 - \lambda_1 - \lambda_2" />
                </div>
                <div className="my-auto font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                  <InlineMath tex={`\\lambda_0 = ${lambda0.toFixed(2)}`} />{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (
                    <InlineMath
                      tex={`\\sum \\lambda_i = ${(lambda0 + lambda1 + lambda2).toFixed(2)}`}
                    />
                    )
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Viewport with Dragging */}
            <div className="relative mb-5 flex h-[var(--demo-height,20rem)] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 shadow-inner dark:border-slate-800">
              <CanvasToolbar onReset={handleReset} />
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
                    <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                  </marker>
                </defs>

                <rect
                  fill="url(#grid-m2)"
                  height="360"
                  width="500"
                  x="-250"
                  y="-180"
                />

                {(() => {
                  const scale = 55;
                  const sP0x = p0.x * scale;
                  const sP0y = -p0.y * scale;
                  const sP1x = p1.x * scale;
                  const sP1y = -p1.y * scale;
                  const sP2x = p2.x * scale;
                  const sP2y = -p2.y * scale;
                  const sPx = baryPx * scale;
                  const sPy = -baryPy * scale;

                  return (
                    <g>
                      {/* Convex Hull: Triangle Area */}
                      <polygon
                        fill="rgba(99, 102, 241, 0.25)"
                        points={`${sP0x},${sP0y} ${sP1x},${sP1y} ${sP2x},${sP2y}`}
                        stroke="#818cf8"
                        strokeDasharray="3 3"
                        strokeWidth="2"
                      />

                      {/* Affine Frame Basis Vectors from P0 */}
                      <line
                        markerEnd="url(#arrow-axis)"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        x1={sP0x}
                        x2={sP1x}
                        y1={sP0y}
                        y2={sP1y}
                      />
                      <line
                        markerEnd="url(#arrow-axis)"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        x1={sP0x}
                        x2={sP2x}
                        y1={sP0y}
                        y2={sP2y}
                      />

                      {/* Line from P0 to target P */}
                      <line
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth="1.8"
                        x1={sP0x}
                        x2={sPx}
                        y1={sP0y}
                        y2={sPy}
                      />

                      {/* Draggable Vertex P0 */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("P0", e)}
                      >
                        <circle cx={sP0x} cy={sP0y} fill="transparent" r="18" />
                        <circle
                          cx={sP0x}
                          cy={sP0y}
                          fill="#f43f5e"
                          r={draggingTarget === "P0" ? 8 : 6}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          fill="#fb7185"
                          fontSize="12"
                          fontWeight="bold"
                          pointerEvents="none"
                          x={sP0x - 24}
                          y={sP0y + 18}
                        >
                          P0 (Frame Origin)
                        </text>
                      </g>

                      {/* Draggable Vertex P1 */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("P1", e)}
                      >
                        <circle cx={sP1x} cy={sP1y} fill="transparent" r="18" />
                        <circle
                          cx={sP1x}
                          cy={sP1y}
                          fill="#6366f1"
                          r={draggingTarget === "P1" ? 8 : 6}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          fill="#a5b4fc"
                          fontSize="12"
                          fontWeight="bold"
                          pointerEvents="none"
                          x={sP1x + 8}
                          y={sP1y + 14}
                        >
                          P1
                        </text>
                      </g>

                      {/* Draggable Vertex P2 */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("P2", e)}
                      >
                        <circle cx={sP2x} cy={sP2y} fill="transparent" r="18" />
                        <circle
                          cx={sP2x}
                          cy={sP2y}
                          fill="#10b981"
                          r={draggingTarget === "P2" ? 8 : 6}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          fill="#6ee7b7"
                          fontSize="12"
                          fontWeight="bold"
                          pointerEvents="none"
                          x={sP2x - 10}
                          y={sP2y - 12}
                        >
                          P2
                        </text>
                      </g>

                      {/* Draggable Current Affine Point P */}
                      <g
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDownTarget("P", e)}
                      >
                        <circle cx={sPx} cy={sPy} fill="transparent" r="22" />
                        <circle
                          cx={sPx}
                          cy={sPy}
                          fill={isInsideTriangle ? "#22c55e" : "#f59e0b"}
                          r={draggingTarget === "P" ? 10 : 8}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <text
                          fill={isInsideTriangle ? "#4ade80" : "#fbbf24"}
                          fontSize="13"
                          fontWeight="bold"
                          pointerEvents="none"
                          x={sPx + 12}
                          y={sPy - 8}
                        >
                          P = Σ λi Pi ({baryPx.toFixed(2)}, {baryPy.toFixed(2)})
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Diagnostics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  仿射组合无原点良定性（可直接拖拽点 <InlineMath tex="P" />）
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    重心坐标展开：
                    <InlineMath tex="P = P_0 + \lambda_1(P_1 - P_0) + \lambda_2(P_2 - P_0)" />
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      <InlineMath
                        tex={`[P]_{\\mathcal{F}} = (${lambda1.toFixed(2)},\\, ${lambda2.toFixed(2)})^T`}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 shadow-sm ${
                  isInsideTriangle
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="text-xs font-semibold">
                  {isInsideTriangle ? (
                    <span>
                      ✅ 处于凸包内部（
                      <InlineMath tex="\text{Convex Hull}: \lambda_i \ge 0" />）
                    </span>
                  ) : (
                    <span>
                      ⚠️ 处于凸包外部，但在仿射包平面内（
                      <InlineMath tex="\text{Affine Hull}: \sum \lambda_i = 1" />
                      ）
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                  {isInsideTriangle ? (
                    <span>
                      所有重心坐标非负 <InlineMath tex="\lambda_i \ge 0" />
                      ，点 <InlineMath tex="P" /> 严格位于三角形内部（凸组合）。
                    </span>
                  ) : (
                    <span>
                      存在负权重 <InlineMath tex="\lambda_i < 0" />
                      ，点 <InlineMath tex="P" />{" "}
                      超出三角形边界，但仍严格满足全仿射平面约束{" "}
                      <InlineMath tex="\sum \lambda_i = 1" />
                      （仿射组合）。
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: Homogenization Hyperplane Embedding */}
        {/* ========================================================================= */}
        {mode === "homogenization" && (
          <div>
            {/* Controls */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  测试对象类型
                </div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      testType === "point"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => setTestType("point")}
                    type="button"
                  >
                    仿射点（
                    <InlineMath tex="w = 1" />）
                  </button>
                  <button
                    className={`flex-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      testType === "vector"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => setTestType("vector")}
                    type="button"
                  >
                    方向向量（
                    <InlineMath tex="w = 0" />）
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  仿射平移向量 <InlineMath tex="t_x" />
                </div>
                <ParamSlider
                  display={`${tx.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      <InlineMath tex="t_x" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setTx}
                  step={0.2}
                  value={tx}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  仿射平移向量 <InlineMath tex="t_y" />
                </div>
                <ParamSlider
                  display={`${ty.toFixed(1)}`}
                  label={
                    <span className="text-xs">
                      <InlineMath tex="t_y" />
                    </span>
                  }
                  max={3.0}
                  min={-3.0}
                  onChange={setTy}
                  step={0.2}
                  value={ty}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  线性旋转角 <InlineMath tex="\theta" />
                </div>
                <ParamSlider
                  display={`${thetaDeg}°`}
                  label={
                    <span className="text-xs">
                      <InlineMath tex="\theta" />
                    </span>
                  }
                  max={180}
                  min={-180}
                  onChange={setThetaDeg}
                  step={5}
                  value={thetaDeg}
                />
              </div>
            </div>

            {/* SVG 2.5D Slice View */}
            <div className="relative mb-5 flex h-[var(--demo-height,20rem)] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 shadow-inner dark:border-slate-800">
              <CanvasToolbar onReset={handleReset} />
              <svg
                className="h-full w-full select-none"
                viewBox="-250 -180 500 360"
              >
                <defs>
                  <marker
                    id="arrow-homo"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto"
                    refX="5"
                    refY="3"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
                  </marker>
                </defs>

                {(() => {
                  const project = (x: number, y: number, w: number) => {
                    const pX = x * 38 - y * 22;
                    const pY = -w * 90 + x * 10 + y * 18 + 40;
                    return { x: pX, y: pY };
                  };

                  // Plane w = 1 (Affine Space Slice A)
                  const c1 = project(-3, -2.5, 1);
                  const c2 = project(3, -2.5, 1);
                  const c3 = project(3, 2.5, 1);
                  const c4 = project(-3, 2.5, 1);

                  // Plane w = 0 (Linear Vector Space V)
                  const b1 = project(-3, -2.5, 0);
                  const b2 = project(3, -2.5, 0);
                  const b3 = project(3, 2.5, 0);
                  const b4 = project(-3, 2.5, 0);

                  // Points in 3D
                  const origPt = project(rawX, rawY, rawW);
                  const transPt = project(
                    transformedX,
                    transformedY,
                    transformedW,
                  );

                  return (
                    <g>
                      {/* Plane w = 0 */}
                      <polygon
                        fill="rgba(71, 85, 105, 0.2)"
                        points={`${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`}
                        stroke="#475569"
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                      />
                      <text
                        fill="#64748b"
                        fontSize="11"
                        x={b1.x + 10}
                        y={b1.y + 18}
                      >
                        子空间 w = 0（纯线性向量世界 V）
                      </text>

                      {/* Plane w = 1 */}
                      <polygon
                        fill="rgba(99, 102, 241, 0.2)"
                        points={`${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y} ${c4.x},${c4.y}`}
                        stroke="#818cf8"
                        strokeWidth="2"
                      />
                      <text
                        fill="#a5b4fc"
                        fontSize="12"
                        fontWeight="bold"
                        x={c1.x + 10}
                        y={c1.y + 18}
                      >
                        仿射切片超平面 w = 1（仿射空间 A）
                      </text>

                      {/* Transform vector arrow */}
                      <line
                        markerEnd="url(#arrow-homo)"
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        strokeWidth="2"
                        x1={origPt.x}
                        x2={transPt.x}
                        y1={origPt.y}
                        y2={transPt.y}
                      />

                      {/* Original point */}
                      <circle
                        cx={origPt.x}
                        cy={origPt.y}
                        fill="#94a3b8"
                        r="6"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        fill="#cbd5e1"
                        fontSize="11"
                        x={origPt.x - 40}
                        y={origPt.y - 10}
                      >
                        初始 ({rawX}, {rawY}, {rawW})
                      </text>

                      {/* Transformed point */}
                      <circle
                        cx={transPt.x}
                        cy={transPt.y}
                        fill={testType === "point" ? "#6366f1" : "#10b981"}
                        r="7"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        fill={testType === "point" ? "#a5b4fc" : "#6ee7b7"}
                        fontSize="12"
                        fontWeight="bold"
                        x={transPt.x + 10}
                        y={transPt.y - 8}
                      >
                        变换后 ({transformedX.toFixed(1)},{" "}
                        {transformedY.toFixed(1)}, {transformedW})
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Matrix Formula & Group Analysis */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  齐次分块矩阵作用方程
                </div>
                <div className="mt-2 overflow-x-auto py-1">
                  <InlineMath
                    tex={`\\begin{pmatrix} X' \\\\ Y' \\\\ W' \\end{pmatrix} = \\begin{pmatrix} \\cos\\theta & -\\sin\\theta & t_x \\\\ \\sin\\theta & \\cos\\theta & t_y \\\\ 0 & 0 & 1 \\end{pmatrix} \\begin{pmatrix} ${rawX.toFixed(1)} \\\\ ${rawY.toFixed(1)} \\\\ ${rawW} \\end{pmatrix} = \\begin{pmatrix} ${transformedX.toFixed(2)} \\\\ ${transformedY.toFixed(2)} \\\\ ${transformedW} \\end{pmatrix}`}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                  半直积与超平面保持机制
                </div>
                <p className="mt-1 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
                  {testType === "point" ? (
                    <span>
                      📌 当输入为<strong>仿射点</strong>（
                      <InlineMath tex="w = 1" />
                      ）时，平移分量 <InlineMath tex="\mathbf{t} \times 1" />{" "}
                      起效，且输出高度恒为 <InlineMath tex="w' = 1" />
                      ，严格保持在仿射切片超平面上！
                    </span>
                  ) : (
                    <span>
                      🚀 当输入为<strong>方向向量</strong>（
                      <InlineMath tex="w = 0" />
                      ）时，平移分量{" "}
                      <InlineMath tex="\mathbf{t} \times 0 = 0" />{" "}
                      自动消去，向量只经历纯线性旋转，不产生平移，保持在向量子空间中！
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExpandableDemo>
  );
}
