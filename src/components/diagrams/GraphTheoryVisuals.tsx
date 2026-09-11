import React, { useState } from "react";
import InlineMath from "../framework/InlineMath";
import CapsuleTabs from "../framework/CapsuleTabs";

export function KonigsbergBridgesDiagram() {
  const [hoveredLand, setHoveredLand] = useState<string | null>(null);

  const lands = [
    { id: "A", name: "北岸 A", degree: 3, cx: 200, cy: 35, rx: 70, ry: 20 },
    { id: "B", name: "西岛 B", degree: 5, cx: 80, cy: 120, rx: 45, ry: 25 },
    { id: "C", name: "东岛 C", degree: 3, cx: 320, cy: 120, rx: 45, ry: 25 },
    { id: "D", name: "南岸 D", degree: 3, cx: 200, cy: 205, rx: 70, ry: 20 },
  ];

  const bridges = [
    {
      id: "b1",
      from: "A",
      to: "B",
      path: "M 170 52 C 140 70, 110 80, 95 98",
      label: "桥 1",
    },
    {
      id: "b2",
      from: "A",
      to: "B",
      path: "M 190 55 C 160 85, 130 95, 110 102",
      label: "桥 2",
    },
    {
      id: "b3",
      from: "A",
      to: "C",
      path: "M 230 54 C 265 80, 290 90, 310 100",
      label: "桥 3",
    },
    {
      id: "b4",
      from: "B",
      to: "C",
      path: "M 125 120 L 275 120",
      label: "桥 4",
    },
    {
      id: "b5",
      from: "B",
      to: "D",
      path: "M 95 142 C 110 160, 140 170, 170 188",
      label: "桥 5",
    },
    {
      id: "b6",
      from: "B",
      to: "D",
      path: "M 110 138 C 130 145, 160 155, 190 185",
      label: "桥 6",
    },
    {
      id: "b7",
      from: "C",
      to: "D",
      path: "M 310 140 C 290 150, 265 160, 230 186",
      label: "桥 7",
    },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold text-ink">
            哥尼斯堡七桥地理与多重拓扑图 (Königsberg Seven Bridges)
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted">
          4 个顶点全为奇度数（3, 5, 3, 3）⇒ 违反欧拉定理
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-surface/70 border border-border/60">
        <svg viewBox="0 0 400 240" className="w-full h-auto select-none">
          {/* River water currents background */}
          <rect
            x="0"
            y="0"
            width="400"
            height="240"
            fill="var(--color-surface, #f8fafc)"
          />
          <path
            d="M 0 85 Q 120 70 200 90 T 400 85 L 400 155 Q 280 170 200 150 T 0 155 Z"
            fill="currentColor"
            className="text-sky-500/10 dark:text-sky-400/10"
          />

          {/* Bridges (Multi-edges) */}
          {bridges.map((b) => {
            const isHighlighted =
              hoveredLand === b.from || hoveredLand === b.to;
            return (
              <g key={b.id}>
                {/* Bridge border shadow */}
                <path
                  d={b.path}
                  fill="none"
                  stroke="currentColor"
                  className={isHighlighted ? "text-accent" : "text-border"}
                  strokeWidth={isHighlighted ? 6 : 4}
                  strokeLinecap="round"
                />
                {/* Bridge body */}
                <path
                  d={b.path}
                  fill="none"
                  stroke="currentColor"
                  className={
                    isHighlighted
                      ? "text-amber-500"
                      : "text-amber-600/70 dark:text-amber-400/70"
                  }
                  strokeWidth={isHighlighted ? 3.5 : 2}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Land masses (Vertices) */}
          {lands.map((land) => {
            const isHovered = hoveredLand === land.id;
            return (
              <g
                key={land.id}
                onMouseEnter={() => setHoveredLand(land.id)}
                onMouseLeave={() => setHoveredLand(null)}
                className="cursor-pointer transition-all duration-150"
              >
                <ellipse
                  cx={land.cx}
                  cy={land.cy}
                  rx={land.rx}
                  ry={land.ry}
                  fill="var(--color-surface, #ffffff)"
                  stroke={
                    isHovered
                      ? "var(--color-accent, #3b82f6)"
                      : "var(--color-border, #999)"
                  }
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-colors"
                />
                <text
                  x={land.cx}
                  y={land.cy - 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-semibold fill-ink pointer-events-none"
                >
                  {land.name}
                </text>
                <text
                  x={land.cx}
                  y={land.cy + 11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-mono font-bold fill-rose-500 pointer-events-none"
                >
                  deg = {land.degree} (奇)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2.5 text-xs text-muted leading-relaxed">
        💡
        鼠标悬停陆地顶点可点亮其关联桥梁。欧拉指出：散步者进出一个区域必成对消耗连边，奇数度顶点只能作为起点或终点；本图
        4 个顶点全为奇度数（3 或 5），故绝对不存在不重复走遍七桥的路线。
      </p>
    </div>
  );
}

const BIPARTITE_TABS = [
  { id: "even_c4", label: "偶环 C₄ (合法 2-染色)" },
  { id: "odd_c3", label: "奇环 C₃ (对角边冲突)" },
] as const;

export function BipartiteColoringDiagram() {
  const [hasConflict, setHasConflict] = useState<boolean>(false);

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-chart-2" />
          <span className="text-xs font-semibold text-ink">
            二分图二染色机制与奇环矛盾图解 (Bipartite 2-Coloring)
          </span>
        </div>
        <CapsuleTabs
          options={BIPARTITE_TABS}
          value={hasConflict ? "odd_c3" : "even_c4"}
          onChange={(id) => setHasConflict(id === "odd_c3")}
          size="xs"
        />
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-surface/70 border border-border/60 p-4">
        <svg viewBox="0 0 400 170" className="w-full h-auto select-none">
          {/* Edges */}
          <g stroke="currentColor" strokeWidth="2" className="text-border">
            {/* Top horizontal */}
            <line x1="120" y1="50" x2="280" y2="50" />
            {/* Right vertical */}
            <line x1="280" y1="50" x2="280" y2="130" />
            {/* Bottom horizontal */}
            <line x1="280" y1="130" x2="120" y2="130" />
            {/* Left vertical */}
            <line x1="120" y1="130" x2="120" y2="50" />

            {/* Conflict diagonal edge */}
            {hasConflict && (
              <line
                x1="120"
                y1="50"
                x2="280"
                y2="130"
                stroke="var(--color-rose-500, #f43f5e)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
            )}
          </g>

          {/* Node v1 */}
          <g transform="translate(120, 50)">
            <circle
              r="16"
              fill="var(--color-surface, #ffffff)"
              stroke="#ef4444"
              strokeWidth="3"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[11px] font-bold font-mono fill-ink"
            >
              v₁ (红)
            </text>
          </g>

          {/* Node w1 */}
          <g transform="translate(280, 50)">
            <circle
              r="16"
              fill="var(--color-surface, #ffffff)"
              stroke="#3b82f6"
              strokeWidth="3"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[11px] font-bold font-mono fill-ink"
            >
              w₁ (蓝)
            </text>
          </g>

          {/* Node v2 */}
          <g transform="translate(120, 130)">
            <circle
              r="16"
              fill="var(--color-surface, #ffffff)"
              stroke={hasConflict ? "#f59e0b" : "#3b82f6"}
              strokeWidth="3"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[11px] font-bold font-mono fill-ink"
            >
              v₂ (蓝)
            </text>
          </g>

          {/* Node w2 */}
          <g transform="translate(280, 130)">
            <circle
              r="16"
              fill="var(--color-surface, #ffffff)"
              stroke={hasConflict ? "#f43f5e" : "#ef4444"}
              strokeWidth="3"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[11px] font-bold font-mono fill-ink"
            >
              w₂ ({hasConflict ? "冲突!" : "红"})
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-2.5 text-xs text-muted leading-relaxed">
        {hasConflict ? (
          <span className="text-rose-500">
            ⚠️ 插入对角边后生成奇环（v₁ → w₁ → w₂ → v₁，长度 3）：w₂
            必须与相邻的红点 v₁ 异色（为蓝），又必须与相邻的蓝点 v₂
            异色（为红），产生二染色矛盾！这正是“二分图等价于无奇环”的直观写照。
          </span>
        ) : (
          <span>
            ✅ 偶数环（长度 4）在红蓝两色交替下完美闭合无冲突：红(v₁) → 蓝(w₁) →
            红(w₂) → 蓝(v₂) → 红(v₁)，两部独立子集内绝无连边。
          </span>
        )}
      </p>
    </div>
  );
}

export function RenderGraphDagDiagram() {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold text-ink">
            现代渲染管线 FrameGraph / RenderGraph DAG 拓扑调度
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted">
          Kahn 算法入度归零驱动并行并发
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-surface/70 border border-border/60 p-4">
        <svg viewBox="0 0 460 140" className="w-full h-auto select-none">
          <defs>
            <marker
              id="dag-edge-arrow"
              viewBox="0 0 10 10"
              refX="24"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 10 5 L 0 9 z"
                fill="var(--color-accent, #3b82f6)"
              />
            </marker>
          </defs>

          {/* Directed connections */}
          <g
            stroke="var(--color-accent, #3b82f6)"
            strokeWidth="1.8"
            markerEnd="url(#dag-edge-arrow)"
          >
            {/* Shadow -> Lighting */}
            <path d="M 90 35 C 160 35, 200 45, 250 60" fill="none" />
            {/* Geometry -> GBuffer */}
            <path d="M 90 95 L 170 95" fill="none" />
            {/* GBuffer -> Lighting */}
            <path d="M 210 95 C 230 95, 240 85, 255 75" fill="none" />
            {/* Lighting -> PostProcess */}
            <path d="M 300 70 L 360 70" fill="none" />
          </g>

          {/* Stage 0: Parallel In-degree = 0 */}
          <g transform="translate(60, 35)">
            <rect
              x="-45"
              y="-16"
              width="90"
              height="32"
              rx="6"
              fill="var(--color-surface, #ffffff)"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-ink"
            >
              ShadowPass
            </text>
            <text
              x="-40"
              y="-22"
              className="text-[9px] font-mono fill-emerald-600 font-semibold"
            >
              in=0 (就绪)
            </text>
          </g>

          <g transform="translate(60, 95)">
            <rect
              x="-45"
              y="-16"
              width="90"
              height="32"
              rx="6"
              fill="var(--color-surface, #ffffff)"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-ink"
            >
              GeometryPass
            </text>
            <text
              x="-40"
              y="-22"
              className="text-[9px] font-mono fill-emerald-600 font-semibold"
            >
              in=0 (就绪)
            </text>
          </g>

          {/* Stage 1 */}
          <g transform="translate(190, 95)">
            <rect
              x="-40"
              y="-16"
              width="80"
              height="32"
              rx="6"
              fill="var(--color-surface, #ffffff)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-ink"
            >
              GBuffer
            </text>
            <text
              x="-35"
              y="-22"
              className="text-[9px] font-mono fill-blue-600 font-semibold"
            >
              in=1
            </text>
          </g>

          {/* Stage 2 */}
          <g transform="translate(280, 70)">
            <rect
              x="-40"
              y="-16"
              width="80"
              height="32"
              rx="6"
              fill="var(--color-surface, #ffffff)"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-ink"
            >
              Lighting
            </text>
            <text
              x="-35"
              y="-22"
              className="text-[9px] font-mono fill-amber-600 font-semibold"
            >
              in=2
            </text>
          </g>

          {/* Stage 3 */}
          <g transform="translate(400, 70)">
            <rect
              x="-45"
              y="-16"
              width="90"
              height="32"
              rx="6"
              fill="var(--color-surface, #ffffff)"
              stroke="#8b5cf6"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-ink"
            >
              PostProcess
            </text>
            <text
              x="-40"
              y="-22"
              className="text-[9px] font-mono fill-purple-600 font-semibold"
            >
              in=1
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-2.5 text-xs text-muted leading-relaxed">
        💡 有向无环图（DAG）精准定义了屏障（Barrier）和资源危害。ShadowPass 与
        GeometryPass 入度均为
        0，引擎调度器可直接将其推入异构队列并行录制；只有当下游依赖的入度归零时，该
        Pass 才能启动。
      </p>
    </div>
  );
}

export function FiedlerPartitionDiagram() {
  const nodes = [
    { label: "v₁", val: -0.42 },
    { label: "v₂", val: -0.38 },
    { label: "v₃", val: -0.29 },
    { label: "v₄", val: +0.27 },
    { label: "v₅", val: +0.36 },
    { label: "v₆", val: +0.45 },
  ];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold text-ink">
            Fiedler 向量数值符号与谱二分分割 (Spectral Bisection)
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted">
          λ₂ 对应特征向量的零点正负割裂
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-surface/70 border border-border/60 p-4">
        {/* Nodes Spectrum Bar */}
        <div className="grid grid-cols-6 gap-2">
          {nodes.map((n, idx) => {
            const isNegative = n.val < 0;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                  isNegative
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                <span className="font-mono text-xs font-bold">{n.label}</span>
                <span className="font-mono text-[11px]">
                  {n.val > 0 ? `+${n.val}` : n.val}
                </span>
              </div>
            );
          })}
        </div>

        {/* Partition Cutline Representation */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 rounded-md bg-sky-500/15 py-1.5 text-center font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
            划分区域 A（v₂ 分量 &lt; 0）
          </div>
          <div className="flex items-center px-1 font-mono text-xs font-bold text-rose-500 animate-pulse">
            ✂️ 谱图割面
          </div>
          <div className="flex-1 rounded-md bg-amber-500/15 py-1.5 text-center font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            划分区域 B（v₂ 分量 ≥ 0）
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-muted leading-relaxed">
        💡 第二小特征值 <InlineMath tex="\lambda_2" /> 对应的特征向量{" "}
        <InlineMath tex="v_2" /> 正好正交于常数基底{" "}
        <InlineMath tex="\mathbf{1}" />
        。其数值在图的两个“致密簇”之间呈现平滑过渡，零点位置天然对应了图的最优稀疏割（Cheeger
        不等式保底）。
      </p>
    </div>
  );
}

export type GraphClassType =
  "undirected_simple" | "directed" | "multigraph" | "pseudograph" | "weighted";

const CLASS_TABS = [
  { id: "undirected_simple" as const, label: "无向简单图" },
  { id: "directed" as const, label: "有向图 (Digraph)" },
  { id: "multigraph" as const, label: "多重图 (Multigraph)" },
  { id: "pseudograph" as const, label: "伪图 / 自环" },
  { id: "weighted" as const, label: "带权图 (Weighted Graph)" },
] as const;

interface ClassificationData {
  id: GraphClassType;
  label: string;
  badge: string;
  tagline: string;
  edgeFormal: string;
  matrixTrait: string;
  mathDetail: string;
  matrix: (string | number)[][];
  matrixType: "A" | "W";
}

const CLASS_CONFIGS: Record<GraphClassType, ClassificationData> = {
  undirected_simple: {
    id: "undirected_simple",
    label: "无向简单图",
    badge: "基础图",
    tagline: "边是无序对 {u, v}，无自环且无平行边",
    edgeFormal: "E \\subseteq \\{\\{u, v\\} \\mid u, v \\in V, u \\ne v\\}",
    matrixTrait: "邻接矩阵 A 严格实对称 (A = A^T)，对角元 A_ii 恒为 0",
    mathDetail:
      "无向边仅刻画连通性，两点间最多一条边。对应图拉普拉斯算子具备正交特征谱与半正定二次型。",
    matrixType: "A",
    matrix: [
      [0, 1, 1, 0],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [0, 1, 1, 0],
    ],
  },
  directed: {
    id: "directed",
    label: "有向图 (Digraph)",
    badge: "流动与时序",
    tagline: "边是有序对 (u, v)，区分出度 (Out) 与入度 (In)",
    edgeFormal: "E \\subseteq V \\times V = \\{(u, v) \\mid u, v \\in V\\}",
    matrixTrait: "邻接矩阵 A 通常非对称 (A \\ne A^T)，A_ij 表示 u_i → v_j",
    mathDetail:
      "用于刻画单向依赖（如渲染管线 DAG、光线投射因果流）。行和为出度，列和为入度。",
    matrixType: "A",
    matrix: [
      [0, 1, 0, 0],
      [0, 0, 1, 1],
      [1, 0, 0, 1],
      [0, 0, 0, 0],
    ],
  },
  multigraph: {
    id: "multigraph",
    label: "多重图 (Multigraph)",
    badge: "多重关联",
    tagline: "两点间允许多条平行边（如哥尼斯堡多座桥）",
    edgeFormal: "E 是二元对的多重集合 (Multiset)，存在 e_1 \\ne e_2 端点相同",
    matrixTrait: "邻接矩阵元素 A_ij \\in \\{0, 1, 2, \\dots\\} 变为重数计数",
    mathDetail:
      "哥尼斯堡七桥正是多重图典型代表（北岸 A 与西岛 B 间并联了 2 座桥，导致 A_12 = 2）。",
    matrixType: "A",
    matrix: [
      [0, 2, 1, 0],
      [2, 0, 1, 2],
      [1, 1, 0, 1],
      [0, 2, 1, 0],
    ],
  },
  pseudograph: {
    id: "pseudograph",
    label: "伪图 / 自环 (Pseudograph)",
    badge: "自指与退化",
    tagline: "允许顶点自身相连的边 (v, v)（自环 Self-loop）",
    edgeFormal: "存在边 e = \\{v, v\\} \\in E 或 (v, v) \\in E",
    matrixTrait: "邻接矩阵对角线元素不为零 (A_ii > 0)，表示顶点自身存在自环",
    mathDetail:
      "在随机游走与马尔可夫链中表示状态在当前步骤保持不变；在三角网格中自环代表退化奇异面。",
    matrixType: "A",
    matrix: [
      [1, 1, 0, 0],
      [1, 0, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 0],
    ],
  },
  weighted: {
    id: "weighted",
    label: "带权图 (Weighted Graph)",
    badge: "度量物理",
    tagline: "为每条边赋予实数权值 w: E → ℝ（长度、阻抗、刚度）",
    edgeFormal: "G = (V, E, w), \\quad w: E \\to \\mathbb{R}",
    matrixTrait: "由二值邻接矩阵跃迁为实对称权重矩阵 W，W_ij = w(e_ij)",
    mathDetail:
      "在三维几何处理中，余切权重（Cotangent Weights）矩阵将平面图矩阵延伸为连续流形上的离散拉普拉斯算子。",
    matrixType: "W",
    matrix: [
      [0, 2.5, 1.2, 0],
      [2.5, 0, 0.8, 3.1],
      [1.2, 0.8, 0, 1.7],
      [0, 3.1, 1.7, 0],
    ],
  },
};

export function GraphClassificationDiagram() {
  const [currentTab, setCurrentTab] =
    useState<GraphClassType>("undirected_simple");
  const cfg = CLASS_CONFIGS[currentTab];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-4 shadow-sm">
      {/* Header and selector tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-3 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold text-ink">
            图分类代数与几何对比探针 (Graph Classification Inspector)
          </span>
        </div>
        <CapsuleTabs
          options={CLASS_TABS}
          value={currentTab}
          onChange={(tab) => setCurrentTab(tab as GraphClassType)}
          size="xs"
        />
      </div>

      {/* Main visual and algebraic cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* SVG Viewport (7 cols) */}
        <div className="relative flex flex-col justify-between rounded-lg border border-border/60 bg-surface/80 p-3 lg:col-span-7">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-ink">{cfg.label} 拓扑形态</span>
            <span className="rounded bg-accent/15 px-2 py-0.5 text-[11px] font-mono font-bold text-accent">
              {cfg.badge}
            </span>
          </div>

          <div className="relative w-full h-[180px] overflow-hidden rounded bg-surface/50 border border-border/40 flex items-center justify-center">
            <svg
              viewBox="-120 -80 240 160"
              className="w-full h-full select-none"
            >
              <defs>
                <marker
                  id="class-arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 1 L 10 5 L 0 9 z"
                    fill="var(--color-accent, #3b82f6)"
                  />
                </marker>
              </defs>

              {/* Topology Rendering by type */}
              {currentTab === "undirected_simple" && (
                <g stroke="var(--color-accent, #3b82f6)" strokeWidth="2">
                  <line x1="-70" y1="-40" x2="70" y2="-40" />
                  <line x1="70" y1="-40" x2="70" y2="40" />
                  <line x1="70" y1="40" x2="-70" y2="40" />
                  <line x1="-70" y1="-40" x2="70" y2="40" />
                  <line x1="-70" y1="40" x2="70" y2="-40" />
                </g>
              )}

              {currentTab === "directed" && (
                <g
                  stroke="var(--color-accent, #3b82f6)"
                  strokeWidth="2"
                  markerEnd="url(#class-arrow)"
                >
                  <path d="M -70 -40 L 70 -40" fill="none" />
                  <path d="M 70 -40 L 70 40" fill="none" />
                  <path d="M 70 40 L -70 40" fill="none" />
                  <path d="M 70 40 L -70 -40" fill="none" />
                  <path d="M -70 -40 L 70 40" fill="none" />
                </g>
              )}

              {currentTab === "multigraph" && (
                <g stroke="var(--color-accent, #3b82f6)" strokeWidth="2">
                  {/* Parallel edges between v1 and v2 */}
                  <path d="M -70 -40 C -20 -65, 20 -65, 70 -40" fill="none" />
                  <path d="M -70 -40 C -20 -15, 20 -15, 70 -40" fill="none" />
                  {/* Single edge v2 to v3 */}
                  <line x1="70" y1="-40" x2="70" y2="40" />
                  {/* Parallel edges between v2 and v4 */}
                  <path d="M 70 -40 C 20 15, -20 15, -70 40" fill="none" />
                  <path
                    d="M 70 -40 C 10 -10, -30 20, -70 40"
                    fill="none"
                    strokeDasharray="3 3"
                  />
                  {/* Single edge v3 to v4 */}
                  <line x1="70" y1="40" x2="-70" y2="40" />
                </g>
              )}

              {currentTab === "pseudograph" && (
                <g stroke="var(--color-accent, #3b82f6)" strokeWidth="2">
                  {/* Standard edges */}
                  <line x1="-70" y1="-40" x2="70" y2="-40" />
                  <line x1="70" y1="-40" x2="70" y2="40" />
                  <line x1="70" y1="40" x2="-70" y2="40" />
                  {/* Self loop on v1 */}
                  <path
                    d="M -70 -40 C -105 -65, -105 -15, -70 -40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                  {/* Self loop on v3 */}
                  <path
                    d="M 70 40 C 105 15, 105 65, 70 40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {currentTab === "weighted" && (
                <g stroke="var(--color-accent, #3b82f6)" strokeWidth="2">
                  <line x1="-70" y1="-40" x2="70" y2="-40" />
                  <text
                    x="0"
                    y="-48"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-chart-2 pointer-events-none"
                  >
                    2.5
                  </text>

                  <line x1="70" y1="-40" x2="70" y2="40" />
                  <text
                    x="86"
                    y="5"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-chart-2 pointer-events-none"
                  >
                    0.8
                  </text>

                  <line x1="70" y1="40" x2="-70" y2="40" />
                  <text
                    x="0"
                    y="52"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-chart-2 pointer-events-none"
                  >
                    1.7
                  </text>

                  <line x1="-70" y1="-40" x2="70" y2="40" />
                  <text
                    x="-15"
                    y="-5"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-chart-2 pointer-events-none"
                  >
                    1.2
                  </text>

                  <line x1="70" y1="-40" x2="-70" y2="40" />
                  <text
                    x="15"
                    y="5"
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-chart-2 pointer-events-none"
                  >
                    3.1
                  </text>
                </g>
              )}

              {/* 4 Vertices v1, v2, v3, v4 */}
              {[
                { id: "v₁", x: -70, y: -40 },
                { id: "v₂", x: 70, y: -40 },
                { id: "v₃", x: 70, y: 40 },
                { id: "v₄", x: -70, y: 40 },
              ].map((v) => (
                <g key={v.id} transform={`translate(${v.x}, ${v.y})`}>
                  <circle
                    r="12"
                    fill="var(--color-surface, #ffffff)"
                    stroke="var(--color-accent, #3b82f6)"
                    strokeWidth="2"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[10px] font-mono font-bold fill-ink"
                  >
                    {v.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <p className="mt-2 text-xs text-muted leading-relaxed">
            {cfg.tagline}
          </p>
        </div>

        {/* Algebraic & Matrix Card (5 cols) */}
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/60 bg-surface/80 p-3 lg:col-span-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink">
              代数矩阵与边集形式化刻画
            </span>

            <div className="flex flex-col gap-1 rounded bg-surface/90 border border-border/60 p-2 text-xs">
              <span className="text-[11px] text-muted font-medium">
                边集集合论定义：
              </span>
              <span className="font-mono text-xs text-accent">
                <InlineMath tex={cfg.edgeFormal} />
              </span>
            </div>

            {/* Matrix View */}
            <div className="flex flex-col gap-1 rounded bg-surface/90 border border-border/60 p-2">
              <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                <span>
                  {cfg.matrixType === "W" ? "权重矩阵 W" : "邻接矩阵 A"}
                </span>
                <span className="font-mono">
                  {cfg.matrix.length}×{cfg.matrix[0].length}
                </span>
              </div>
              <div className="flex flex-col gap-1 font-mono text-xs pt-1">
                {cfg.matrix.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center justify-around">
                    <span className="w-5 text-muted text-[10px]">
                      v{rIdx + 1}
                    </span>
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      let colorClass = "text-muted/40";
                      if (typeof val === "number" && val > 0) {
                        colorClass = isDiagonal
                          ? "text-amber-500 font-bold"
                          : "text-ink font-semibold";
                      }
                      return (
                        <span
                          key={cIdx}
                          className={`w-8 text-center ${colorClass}`}
                        >
                          {val}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded bg-accent/5 border border-accent/20 p-2 text-[11px] text-muted leading-relaxed">
            <span className="font-semibold text-accent block mb-0.5">
              代数特征准则：
            </span>
            {cfg.matrixTrait}。{cfg.mathDetail}
          </div>
        </div>
      </div>
    </div>
  );
}
