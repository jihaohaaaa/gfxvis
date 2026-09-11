import React, { useState, useRef, useEffect, useMemo } from "react";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";

type MatrixViewType = "laplacian" | "adjacency" | "degree";

interface NodeData {
  id: number;
  label: string;
  group?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface EdgeData {
  source: number;
  target: number;
}

interface PresetGraphConfig {
  id: string;
  name: string;
  nodes: {
    id: number;
    label: string;
    group?: number;
    initialX: number;
    initialY: number;
  }[];
  edges: [number, number][];
  isDirected?: boolean;
  description: string;
}

const PRESET_OPTIONS = [
  { id: "tree", label: "无环树 (Tree T₇)" },
  { id: "bipartite", label: "二分图 (K₃,₃ 完全二分图)" },
  { id: "complete", label: "完全图 (K₅ 五边形超图)" },
  { id: "cycle", label: "简单环图 (C₆ 六元环)" },
  { id: "petersen", label: "彼得森图 (Petersen Graph)" },
  { id: "dag", label: "有向无环图 (DAG 渲染管线依赖)" },
] as const;

const PRESET_CONFIGS: Record<string, PresetGraphConfig> = {
  tree: {
    id: "tree",
    name: "无环树 (Tree T₇)",
    description:
      "无回路连通图：|V|=7, |E|=6。任意两点之间有且仅有一条简单路径，二染色显然成立。",
    nodes: [
      { id: 0, label: "v₀", group: 0, initialX: 0, initialY: -110 },
      { id: 1, label: "v₁", group: 1, initialX: -90, initialY: -20 },
      { id: 2, label: "v₂", group: 1, initialX: 90, initialY: -20 },
      { id: 3, label: "v₃", group: 0, initialX: -140, initialY: 80 },
      { id: 4, label: "v₄", group: 0, initialX: -50, initialY: 80 },
      { id: 5, label: "v₅", group: 0, initialX: 50, initialY: 80 },
      { id: 6, label: "v₆", group: 0, initialX: 140, initialY: 80 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [2, 5],
      [2, 6],
    ],
  },
  bipartite: {
    id: "bipartite",
    name: "二分图 (K₃,₃ 完全二分图)",
    description:
      "经典非平面图：点集划分为互斥二部，同侧无边。根据 Kuratowski 定理不可平面嵌入。",
    nodes: [
      { id: 0, label: "u₁", group: 0, initialX: -110, initialY: -80 },
      { id: 1, label: "u₂", group: 0, initialX: -110, initialY: 0 },
      { id: 2, label: "u₃", group: 0, initialX: -110, initialY: 80 },
      { id: 3, label: "w₁", group: 1, initialX: 110, initialY: -80 },
      { id: 4, label: "w₂", group: 1, initialX: 110, initialY: 0 },
      { id: 5, label: "w₃", group: 1, initialX: 110, initialY: 80 },
    ],
    edges: [
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ],
  },
  complete: {
    id: "complete",
    name: "完全图 (K₅ 五边形超图)",
    description:
      "每对顶点间均有一条边相连：|V|=5, |E|=10。正四面体外的最小非平面完全图。",
    nodes: [
      { id: 0, label: "v₀", group: 0, initialX: 0, initialY: -105 },
      { id: 1, label: "v₁", group: 0, initialX: 100, initialY: -32 },
      { id: 2, label: "v₂", group: 0, initialX: 62, initialY: 85 },
      { id: 3, label: "v₃", group: 0, initialX: -62, initialY: 85 },
      { id: 4, label: "v₄", group: 0, initialX: -100, initialY: -32 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ],
  },
  cycle: {
    id: "cycle",
    name: "简单环图 (C₆ 六元环)",
    description:
      "每个顶点度数严格为 2，|V|=6, |E|=6。偶数长度环具有二分性，也是标准欧拉图。",
    nodes: [
      { id: 0, label: "v₀", group: 0, initialX: 0, initialY: -100 },
      { id: 1, label: "v₁", group: 1, initialX: 86, initialY: -50 },
      { id: 2, label: "v₂", group: 0, initialX: 86, initialY: 50 },
      { id: 3, label: "v₃", group: 1, initialX: 0, initialY: 100 },
      { id: 4, label: "v₄", group: 0, initialX: -86, initialY: 50 },
      { id: 5, label: "v₅", group: 1, initialX: -86, initialY: -50 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
  },
  petersen: {
    id: "petersen",
    name: "彼得森图 (Petersen Graph)",
    description:
      "图论经典反例宝库：10 顶点 15 边 3-正则图。无桥且非哈密顿图，外五边形内嵌五角星结构。",
    nodes: [
      // Outer pentagon
      { id: 0, label: "v₀", group: 0, initialX: 0, initialY: -115 },
      { id: 1, label: "v₁", group: 0, initialX: 110, initialY: -35 },
      { id: 2, label: "v₂", group: 0, initialX: 68, initialY: 95 },
      { id: 3, label: "v₃", group: 0, initialX: -68, initialY: 95 },
      { id: 4, label: "v₄", group: 0, initialX: -110, initialY: -35 },
      // Inner star
      { id: 5, label: "w₀", group: 1, initialX: 0, initialY: -55 },
      { id: 6, label: "w₁", group: 1, initialX: 52, initialY: -17 },
      { id: 7, label: "w₂", group: 1, initialX: 32, initialY: 45 },
      { id: 8, label: "w₃", group: 1, initialX: -32, initialY: 45 },
      { id: 9, label: "w₄", group: 1, initialX: -52, initialY: -17 },
    ],
    edges: [
      // Outer cycle
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      // Spokes
      [0, 5],
      [1, 6],
      [2, 7],
      [3, 8],
      [4, 9],
      // Inner star chords
      [5, 7],
      [7, 9],
      [9, 6],
      [6, 8],
      [8, 5],
    ],
  },
  dag: {
    id: "dag",
    name: "有向无环图 (DAG 渲染管线依赖)",
    description:
      "渲染通道与屏障拓扑调度：Geometry -> Shadow/Depth -> Lighting -> PostProcessing -> SwapChain。",
    isDirected: true,
    nodes: [
      { id: 0, label: "GeomPass", group: 0, initialX: -130, initialY: -60 },
      { id: 1, label: "ShadowMap", group: 0, initialX: -130, initialY: 60 },
      { id: 2, label: "GBuffer", group: 1, initialX: -20, initialY: -60 },
      { id: 3, label: "Lighting", group: 1, initialX: 50, initialY: 0 },
      { id: 4, label: "PostProcess", group: 2, initialX: 130, initialY: 0 },
    ],
    edges: [
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ],
  },
};

const MATRIX_VIEW_OPTIONS = [
  { id: "laplacian" as const, label: "拉普拉斯矩阵 L = D - A" },
  { id: "adjacency" as const, label: "邻接矩阵 A" },
  { id: "degree" as const, label: "度数矩阵 D" },
];

export default function GraphTopologyDemo() {
  const [selectedPreset, setSelectedPreset] = useState<string>("tree");
  const [matrixView, setMatrixView] = useState<MatrixViewType>("laplacian");
  const [enablePhysics, setEnablePhysics] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingNodeRef = useRef<number | null>(null);

  // Active nodes and edges in state
  const [nodes, setNodes] = useState<NodeData[]>(() => {
    const cfg = PRESET_CONFIGS.tree;
    return cfg.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      group: n.group,
      x: n.initialX,
      y: n.initialY,
      vx: 0,
      vy: 0,
    }));
  });

  const [edges, setEdges] = useState<EdgeData[]>(() => {
    return PRESET_CONFIGS.tree.edges.map(([s, t]) => ({
      source: s,
      target: t,
    }));
  });

  const isDirected = Boolean(PRESET_CONFIGS[selectedPreset]?.isDirected);

  // Switch preset
  const handlePresetChange = (newPresetId: string) => {
    setSelectedPreset(newPresetId);
    const cfg = PRESET_CONFIGS[newPresetId];
    if (!cfg) return;
    setNodes(
      cfg.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        group: n.group,
        x: n.initialX,
        y: n.initialY,
        vx: 0,
        vy: 0,
      })),
    );
    setEdges(cfg.edges.map(([s, t]) => ({ source: s, target: t })));
  };

  // Reset node positions
  const handleReset = () => {
    const cfg = PRESET_CONFIGS[selectedPreset];
    if (!cfg) return;
    setNodes(
      cfg.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        group: n.group,
        x: n.initialX,
        y: n.initialY,
        vx: 0,
        vy: 0,
      })),
    );
  };

  // Force-directed physics step
  useEffect(() => {
    if (!enablePhysics) return;

    let animId: number;
    const stepPhysics = () => {
      setNodes((prevNodes) => {
        const nextNodes = prevNodes.map((n) => ({ ...n }));
        const n = nextNodes.length;

        // 1. Repulsion between all pairs (Coulomb-like)
        const kRepel = 3500;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = nextNodes[i].x - nextNodes[j].x;
            const dy = nextNodes[i].y - nextNodes[j].y;
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggingNodeRef.current !== i) {
              nextNodes[i].vx += fx;
              nextNodes[i].vy += fy;
            }
            if (draggingNodeRef.current !== j) {
              nextNodes[j].vx -= fx;
              nextNodes[j].vy -= fy;
            }
          }
        }

        // 2. Spring attraction along edges (Hooke-like)
        const targetDist = 75;
        const kSpring = 0.04;
        for (const edge of edges) {
          const u = nextNodes.find((nd) => nd.id === edge.source);
          const v = nextNodes.find((nd) => nd.id === edge.target);
          if (!u || !v) continue;

          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - targetDist;
          const fx = (dx / dist) * delta * kSpring;
          const fy = (dy / dist) * delta * kSpring;

          if (draggingNodeRef.current !== u.id) {
            u.vx += fx;
            u.vy += fy;
          }
          if (draggingNodeRef.current !== v.id) {
            v.vx -= fx;
            v.vy -= fy;
          }
        }

        // 3. Center gravity towards origin (0, 0)
        const kGravity = 0.012;
        for (let i = 0; i < n; i++) {
          if (draggingNodeRef.current === i) continue;
          nextNodes[i].vx -= nextNodes[i].x * kGravity;
          nextNodes[i].vy -= nextNodes[i].y * kGravity;
        }

        // 4. Update positions with damping
        const damping = 0.85;
        for (let i = 0; i < n; i++) {
          if (draggingNodeRef.current === i) {
            nextNodes[i].vx = 0;
            nextNodes[i].vy = 0;
            continue;
          }
          nextNodes[i].vx *= damping;
          nextNodes[i].vy *= damping;
          nextNodes[i].x += nextNodes[i].vx;
          nextNodes[i].y += nextNodes[i].vy;

          // Boundary clamp (-180 to 180, -130 to 130)
          nextNodes[i].x = Math.max(-180, Math.min(180, nextNodes[i].x));
          nextNodes[i].y = Math.max(-130, Math.min(130, nextNodes[i].y));
        }

        return nextNodes;
      });

      animId = requestAnimationFrame(stepPhysics);
    };

    animId = requestAnimationFrame(stepPhysics);
    return () => cancelAnimationFrame(animId);
  }, [enablePhysics, edges]);

  // Pointer drag interaction
  const handlePointerDown = (nodeId: number, e: React.PointerEvent) => {
    e.stopPropagation();
    draggingNodeRef.current = nodeId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNodeRef.current === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    // SVG viewBox: -200 -150 400 300
    const scaleX = 400 / rect.width;
    const scaleY = 300 / rect.height;
    const mathX = (e.clientX - rect.left) * scaleX - 200;
    const mathY = (e.clientY - rect.top) * scaleY - 150;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === draggingNodeRef.current
          ? {
              ...n,
              x: Math.max(-180, Math.min(180, mathX)),
              y: Math.max(-130, Math.min(130, mathY)),
              vx: 0,
              vy: 0,
            }
          : n,
      ),
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
      draggingNodeRef.current = null;
    }
  };

  // Graph statistics & matrix computations
  const numVertices = nodes.length;
  const numEdges = edges.length;

  // Degrees
  const degrees = useMemo(() => {
    const deg = new Array(numVertices).fill(0);
    for (const e of edges) {
      deg[e.source] = (deg[e.source] || 0) + 1;
      if (!isDirected) {
        deg[e.target] = (deg[e.target] || 0) + 1;
      }
    }
    return deg;
  }, [numVertices, edges, isDirected]);

  // Matrices: A, D, L
  const { adjMatrix, degMatrix, lapMatrix } = useMemo(() => {
    const A: number[][] = Array.from({ length: numVertices }, () =>
      new Array(numVertices).fill(0),
    );
    const D: number[][] = Array.from({ length: numVertices }, () =>
      new Array(numVertices).fill(0),
    );
    const L: number[][] = Array.from({ length: numVertices }, () =>
      new Array(numVertices).fill(0),
    );

    for (const edge of edges) {
      if (edge.source < numVertices && edge.target < numVertices) {
        A[edge.source][edge.target] = 1;
        if (!isDirected) {
          A[edge.target][edge.source] = 1;
        }
      }
    }

    for (let i = 0; i < numVertices; i++) {
      D[i][i] = degrees[i];
    }

    for (let i = 0; i < numVertices; i++) {
      for (let j = 0; j < numVertices; j++) {
        L[i][j] = D[i][j] - A[i][j];
      }
    }

    return { adjMatrix: A, degMatrix: D, lapMatrix: L };
  }, [numVertices, edges, isDirected, degrees]);

  // Odd-degree count for Eulerian check
  const oddDegreeCount = useMemo(() => {
    return degrees.filter((d) => d % 2 !== 0).length;
  }, [degrees]);

  const eulerianStatus = useMemo(() => {
    if (isDirected) return "有向图（需出入度守恒）";
    if (oddDegreeCount === 0) return "欧拉图 (Eulerian: 存在欧拉回路)";
    if (oddDegreeCount === 2) return "半欧拉图 (Semi-Eulerian: 存在欧拉通路)";
    return `非欧拉图 (${oddDegreeCount} 个奇数度顶点)`;
  }, [oddDegreeCount, isDirected]);

  // Display matrix data based on matrixView
  const currentMatrix = useMemo(() => {
    if (matrixView === "adjacency") return adjMatrix;
    if (matrixView === "degree") return degMatrix;
    return lapMatrix;
  }, [matrixView, adjMatrix, degMatrix, lapMatrix]);

  return (
    <ExpandableDemo label="展开图论探针">
      <div className="flex flex-col gap-4">
        {/* Controls header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">图预设:</span>
            <CapsuleTabs
              options={PRESET_OPTIONS}
              value={selectedPreset}
              onChange={(val) => handlePresetChange(val)}
              size="xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted hover:text-ink select-none">
              <input
                type="checkbox"
                checked={enablePhysics}
                onChange={(e) => setEnablePhysics(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-accent"
              />
              物理力导向
            </label>
          </div>
        </div>

        {/* Preset brief intro */}
        <p className="text-xs text-muted leading-relaxed">
          {PRESET_CONFIGS[selectedPreset]?.description}
        </p>

        {/* Main Canvas / SVG container */}
        <div
          ref={containerRef}
          className="relative h-[var(--demo-height,20rem)] w-full overflow-hidden rounded-xl border border-border/80 bg-surface/50 shadow-inner"
        >
          {/* Canvas Toolbar directly inside canvas container */}
          <CanvasToolbar
            onReset={handleReset}
            showExpand={true}
            showHeightPresets={true}
          />

          {/* Topology SVG Viewport */}
          <svg
            ref={svgRef}
            viewBox="-200 -150 400 300"
            className="h-full w-full select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <defs>
              {/* Arrow marker for DAG */}
              <marker
                id="dag-arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 10 5 L 0 9 z"
                  fill="var(--color-muted, #888)"
                />
              </marker>
              {/* Highlight arrow */}
              <marker
                id="dag-arrow-active"
                viewBox="0 0 10 10"
                refX="22"
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

            {/* Background subtle grid */}
            <g opacity="0.15">
              <circle
                cx="0"
                cy="0"
                r="140"
                fill="none"
                stroke="currentColor"
                strokeDasharray="3 3"
              />
              <circle
                cx="0"
                cy="0"
                r="80"
                fill="none"
                stroke="currentColor"
                strokeDasharray="3 3"
              />
              <line
                x1="-180"
                y1="0"
                x2="180"
                y2="0"
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1="-130"
                x2="0"
                y2="130"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </g>

            {/* Edges */}
            <g className="edges-layer">
              {edges.map((e, idx) => {
                const u = nodes.find((n) => n.id === e.source);
                const v = nodes.find((n) => n.id === e.target);
                if (!u || !v) return null;
                const isConnectedToHover =
                  hoveredNode !== null &&
                  (e.source === hoveredNode || e.target === hoveredNode);

                return (
                  <line
                    key={`edge-${idx}`}
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={
                      isConnectedToHover
                        ? "var(--color-accent, #3b82f6)"
                        : "var(--color-border, #999)"
                    }
                    strokeWidth={isConnectedToHover ? 2.5 : 1.5}
                    strokeOpacity={
                      hoveredNode !== null
                        ? isConnectedToHover
                          ? 1
                          : 0.25
                        : 0.75
                    }
                    markerEnd={
                      isDirected
                        ? isConnectedToHover
                          ? "url(#dag-arrow-active)"
                          : "url(#dag-arrow)"
                        : undefined
                    }
                    className="transition-colors duration-150"
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes-layer">
              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const isGroup1 = node.group === 1;
                const isGroup2 = node.group === 2;

                let strokeColor = "var(--color-accent, #3b82f6)";
                if (isGroup1) {
                  strokeColor = "var(--color-chart-2, #10b981)";
                } else if (isGroup2) {
                  strokeColor = "var(--color-chart-3, #f59e0b)";
                }

                return (
                  <g
                    key={`node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handlePointerDown(node.id, e)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Ripple on hover */}
                    {isHovered && (
                      <circle
                        r="20"
                        fill={strokeColor}
                        opacity="0.2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      r="14"
                      fill="var(--color-surface, #ffffff)"
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150"
                    />

                    {/* Node label */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[10px] font-mono font-semibold pointer-events-none fill-ink"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Interactive Hint */}
          <div className="absolute left-3 bottom-3 pointer-events-none rounded bg-surface/80 px-2 py-1 text-[11px] text-muted backdrop-blur-sm border border-border/40">
            💡 点击拖拽任意节点可物理重排；悬停高亮关联边与矩阵行列
          </div>
        </div>

        {/* Matrix Inspector & Diagnostic Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Matrix Card (7 cols) */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface/40 p-3.5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                代数矩阵表示 (Matrix Inspector)
              </span>
              <CapsuleTabs
                options={MATRIX_VIEW_OPTIONS}
                value={matrixView}
                onChange={(id) => setMatrixView(id as MatrixViewType)}
                size="xs"
              />
            </div>

            {/* Matrix View Container */}
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-surface/80 p-2 font-mono text-xs">
              <div className="flex flex-col gap-1 min-w-[240px]">
                {/* Header row with column labels */}
                <div className="flex items-center gap-1 border-b border-border/40 pb-1 text-[11px] text-muted">
                  <div className="w-8 text-center font-bold"></div>
                  {nodes.map((n) => (
                    <div
                      key={`col-${n.id}`}
                      className={`flex-1 text-center font-bold transition-colors ${
                        hoveredNode === n.id
                          ? "text-accent bg-accent/10 rounded"
                          : ""
                      }`}
                    >
                      {n.label}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {currentMatrix.map((row, rIdx) => (
                  <div
                    key={`row-${rIdx}`}
                    className={`flex items-center gap-1 py-0.5 rounded transition-colors ${
                      hoveredNode === rIdx ? "bg-accent/10" : ""
                    }`}
                  >
                    <div
                      className={`w-8 text-center font-bold text-[11px] transition-colors ${
                        hoveredNode === rIdx ? "text-accent" : "text-muted"
                      }`}
                    >
                      {nodes[rIdx]?.label}
                    </div>
                    {row.map((val, cIdx) => {
                      const isHoverIntersect =
                        hoveredNode !== null &&
                        (hoveredNode === rIdx || hoveredNode === cIdx);
                      const isDiagonal = rIdx === cIdx;
                      const valColor =
                        val > 0
                          ? isDiagonal
                            ? "text-chart-2 font-bold"
                            : "text-ink font-semibold"
                          : val < 0
                            ? "text-rose-500 font-bold"
                            : "text-muted/40";

                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          className={`flex-1 text-center text-xs py-0.5 rounded transition-all ${valColor} ${
                            isHoverIntersect ? "bg-accent/15" : ""
                          }`}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-muted leading-relaxed">
              {matrixView === "laplacian" && (
                <span>
                  拉普拉斯算子性质：对角线为顶点度数{" "}
                  <InlineMath tex="L_{ii} = \deg(v_i)" />
                  ，非对角元为 <InlineMath tex="-A_{ij}" />
                  。行和严格恒等于 0，半正定二次型{" "}
                  <InlineMath tex="x^T L x = \sum (x_i-x_j)^2 \ge 0" />。
                </span>
              )}
              {matrixView === "adjacency" && (
                <span>
                  邻接矩阵性质：
                  <InlineMath tex="A_{ij}=1" /> 表示从 <InlineMath tex="i" /> 到{" "}
                  <InlineMath tex="j" /> 存在边。其 <InlineMath tex="k" /> 次幂{" "}
                  <InlineMath tex="A^k" /> 的元素{" "}
                  <InlineMath tex="(A^k)_{ij}" /> 精确等于从{" "}
                  <InlineMath tex="i" /> 到 <InlineMath tex="j" /> 长度为{" "}
                  <InlineMath tex="k" /> 的通路总数。
                </span>
              )}
              {matrixView === "degree" && (
                <span>
                  度数对角矩阵：
                  <InlineMath tex="D_{ii} = \deg(v_i)" />
                  。由握手引理可知{" "}
                  <InlineMath tex="\operatorname{tr}(D) = \sum \deg(v_i) = 2|E|" />
                  。
                </span>
              )}
            </div>
          </div>

          {/* Graph Theory Diagnostics Card (5 cols) */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-surface/40 p-3.5 lg:col-span-5">
            <span className="text-xs font-semibold text-ink">
              拓扑图论核心诊断 (Topology Diagnostic)
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col rounded-lg border border-border/60 bg-surface/70 p-2">
                <span className="text-[11px] text-muted">顶点数 |V|</span>
                <span className="text-base font-bold font-mono text-ink">
                  {numVertices}
                </span>
              </div>
              <div className="flex flex-col rounded-lg border border-border/60 bg-surface/70 p-2">
                <span className="text-[11px] text-muted">边数 |E|</span>
                <span className="text-base font-bold font-mono text-ink">
                  {numEdges}
                </span>
              </div>
              <div className="flex flex-col rounded-lg border border-border/60 bg-surface/70 p-2">
                <span className="text-[11px] text-muted">度数总和 ∑ deg</span>
                <span className="text-base font-bold font-mono text-chart-2">
                  {degrees.reduce((a, b) => a + b, 0)} (2|E|)
                </span>
              </div>
              <div className="flex flex-col rounded-lg border border-border/60 bg-surface/70 p-2">
                <span className="text-[11px] text-muted">奇度数顶点数</span>
                <span className="text-base font-bold font-mono text-chart-3">
                  {oddDegreeCount} 个
                </span>
              </div>
            </div>

            {/* Eulerian property badge */}
            <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-surface/70 p-2 text-xs">
              <span className="text-[11px] text-muted font-medium">
                欧拉性质 (Eulerian Trail)
              </span>
              <span className="font-semibold text-ink">{eulerianStatus}</span>
            </div>

            {/* Laplacian spectral note */}
            <div className="flex flex-col gap-1 rounded-lg border border-accent/30 bg-accent/5 p-2 text-xs">
              <span className="text-[11px] font-semibold text-accent">
                代数连通度 (Fiedler 谱理论)
              </span>
              <span className="text-muted leading-snug">
                零特征值代数重数 <InlineMath tex="\dim \ker(L) = 1" />
                （图连通）。第二小特征值 <InlineMath tex="\lambda_2" />{" "}
                称为代数连通度（Fiedler
                Value），其特征向量直接指导流形网格划分与谱聚类。
              </span>
            </div>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
