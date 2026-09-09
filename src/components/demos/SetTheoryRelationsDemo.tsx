import React, { useState, useRef, useMemo } from "react";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";

type DemoMode = "equivalence" | "poset";

// Mode 1 Presets
const EQUIV_PRESETS: PresetOption[] = [
  { id: "mod2", label: "同余模 2 划分 (奇/偶)" },
  { id: "mod3", label: "同余模 3 划分 (3 簇)" },
  { id: "clusters", label: "不等长三簇划分" },
  { id: "identity", label: "恒等全等关系 (离散单点)" },
  { id: "universal", label: "全域全等关系 (全并一大块)" },
];

// Mode 2 Presets
const POSET_PRESETS: PresetOption[] = [
  { id: "div12", label: "整除格 D₁₂ (6 节点)" },
  { id: "powerset", label: "幂集格 P({a,b,c}) (8 节点超立方)" },
  { id: "div30", label: "整除格 D₃₀ (8 节点质因数格)" },
  { id: "chain", label: "全序线性链 (1 < 2 < 3 < 4 < 5)" },
];

interface EquivPresetData {
  elements: number[];
  partitions: number[][];
}

const EQUIV_DATA: Record<string, EquivPresetData> = {
  mod2: {
    elements: [1, 2, 3, 4, 5, 6],
    partitions: [
      [1, 3, 5],
      [2, 4, 6],
    ],
  },
  mod3: {
    elements: [1, 2, 3, 4, 5, 6],
    partitions: [
      [1, 4],
      [2, 5],
      [3, 6],
    ],
  },
  clusters: {
    elements: [1, 2, 3, 4, 5, 6],
    partitions: [[1, 2], [3, 4, 5], [6]],
  },
  identity: {
    elements: [1, 2, 3, 4, 5, 6],
    partitions: [[1], [2], [3], [4], [5], [6]],
  },
  universal: {
    elements: [1, 2, 3, 4, 5, 6],
    partitions: [[1, 2, 3, 4, 5, 6]],
  },
};

interface PosetNode {
  id: string;
  label: string;
  level: number;
  xOffset: number; // relative in level
}

interface PosetPresetData {
  nodes: PosetNode[];
  coveringEdges: [string, string][]; // [from, to] meaning from <= to
  lessOrEqual: (a: string, b: string) => boolean;
  top: string;
  bottom: string;
}

const POSET_DATA: Record<string, PosetPresetData> = {
  div12: {
    nodes: [
      { id: "1", label: "1", level: 0, xOffset: 0 },
      { id: "2", label: "2", level: 1, xOffset: -0.6 },
      { id: "3", label: "3", level: 1, xOffset: 0.6 },
      { id: "4", label: "4", level: 2, xOffset: -0.6 },
      { id: "6", label: "6", level: 2, xOffset: 0.6 },
      { id: "12", label: "12", level: 3, xOffset: 0 },
    ],
    coveringEdges: [
      ["1", "2"],
      ["1", "3"],
      ["2", "4"],
      ["2", "6"],
      ["3", "6"],
      ["4", "12"],
      ["6", "12"],
    ],
    lessOrEqual: (a, b) => Number(b) % Number(a) === 0,
    top: "12",
    bottom: "1",
  },
  powerset: {
    nodes: [
      { id: "empty", label: "∅", level: 0, xOffset: 0 },
      { id: "a", label: "{a}", level: 1, xOffset: -0.9 },
      { id: "b", label: "{b}", level: 1, xOffset: 0 },
      { id: "c", label: "{c}", level: 1, xOffset: 0.9 },
      { id: "ab", label: "{a,b}", level: 2, xOffset: -0.9 },
      { id: "ac", label: "{a,c}", level: 2, xOffset: 0 },
      { id: "bc", label: "{b,c}", level: 2, xOffset: 0.9 },
      { id: "abc", label: "{a,b,c}", level: 3, xOffset: 0 },
    ],
    coveringEdges: [
      ["empty", "a"],
      ["empty", "b"],
      ["empty", "c"],
      ["a", "ab"],
      ["a", "ac"],
      ["b", "ab"],
      ["b", "bc"],
      ["c", "ac"],
      ["c", "bc"],
      ["ab", "abc"],
      ["ac", "abc"],
      ["bc", "abc"],
    ],
    lessOrEqual: (a, b) => {
      if (a === "empty") return true;
      if (b === "abc") return true;
      const setA = new Set(a.split(""));
      const setB = new Set(b.split(""));
      for (const elem of setA) {
        if (!setB.has(elem)) return false;
      }
      return true;
    },
    top: "{a,b,c}",
    bottom: "∅",
  },
  div30: {
    nodes: [
      { id: "1", label: "1", level: 0, xOffset: 0 },
      { id: "2", label: "2", level: 1, xOffset: -0.9 },
      { id: "3", label: "3", level: 1, xOffset: 0 },
      { id: "5", label: "5", level: 1, xOffset: 0.9 },
      { id: "6", label: "6", level: 2, xOffset: -0.9 },
      { id: "10", label: "10", level: 2, xOffset: 0 },
      { id: "15", label: "15", level: 2, xOffset: 0.9 },
      { id: "30", label: "30", level: 3, xOffset: 0 },
    ],
    coveringEdges: [
      ["1", "2"],
      ["1", "3"],
      ["1", "5"],
      ["2", "6"],
      ["2", "10"],
      ["3", "6"],
      ["3", "15"],
      ["5", "10"],
      ["5", "15"],
      ["6", "30"],
      ["10", "30"],
      ["15", "30"],
    ],
    lessOrEqual: (a, b) => Number(b) % Number(a) === 0,
    top: "30",
    bottom: "1",
  },
  chain: {
    nodes: [
      { id: "1", label: "1", level: 0, xOffset: 0 },
      { id: "2", label: "2", level: 1, xOffset: 0 },
      { id: "3", label: "3", level: 2, xOffset: 0 },
      { id: "4", label: "4", level: 3, xOffset: 0 },
      { id: "5", label: "5", level: 4, xOffset: 0 },
    ],
    coveringEdges: [
      ["1", "2"],
      ["2", "3"],
      ["3", "4"],
      ["4", "5"],
    ],
    lessOrEqual: (a, b) => Number(a) <= Number(b),
    top: "5",
    bottom: "1",
  },
};

const CLUSTER_COLORS = [
  { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee" },
  { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa" },
  { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24" },
  { border: "#ec4899", bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6" },
  { border: "#10b981", bg: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
  { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
];

export default function SetTheoryRelationsDemo({
  height,
}: {
  height?: string;
}) {
  const [mode, setMode] = useState<DemoMode>("equivalence");
  const [equivPreset, setEquivPreset] = useState<string>("mod2");
  const [posetPreset, setPosetPreset] = useState<string>("div12");
  const [collapseT, setCollapseT] = useState<number>(0);
  const [selectedPosetNode, setSelectedPosetNode] = useState<string | null>(
    "2",
  );

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const curEquiv = EQUIV_DATA[equivPreset] ?? EQUIV_DATA.mod2;
  const curPoset = POSET_DATA[posetPreset] ?? POSET_DATA.div12;

  // Build matrix for Equivalence Mode
  const matrix = useMemo(() => {
    const elems = curEquiv.elements;
    const n = elems.length;
    const m: boolean[][] = Array.from({ length: n }, () =>
      Array(n).fill(false),
    );
    curEquiv.partitions.forEach((part) => {
      part.forEach((a) => {
        part.forEach((b) => {
          const idxA = elems.indexOf(a);
          const idxB = elems.indexOf(b);
          if (idxA >= 0 && idxB >= 0) {
            m[idxA][idxB] = true;
          }
        });
      });
    });
    return m;
  }, [curEquiv]);

  // Node positions in Equivalence Mode
  // Initial: circular layout; Collapsed: grouped to centroid of each partition
  const equivNodePositions = useMemo(() => {
    const elems = curEquiv.elements;
    const n = elems.length;
    const radius = 100;
    const centerX = 200;
    const centerY = 140;

    // Original circular pos
    const origPos: Record<number, { x: number; y: number }> = {};
    elems.forEach((elem, idx) => {
      const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
      origPos[elem] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    // Partition centroids
    const partCentroids: Record<number, { x: number; y: number }> = {};
    const numParts = curEquiv.partitions.length;
    curEquiv.partitions.forEach((part, pIdx) => {
      const pAngle = (pIdx / numParts) * 2 * Math.PI - Math.PI / 2;
      const pDist = numParts === 1 ? 0 : 75;
      const cx = centerX + pDist * Math.cos(pAngle);
      const cy = centerY + pDist * Math.sin(pAngle);
      part.forEach((elem) => {
        partCentroids[elem] = { x: cx, y: cy };
      });
    });

    // Interpolate with collapseT
    const curPos: Record<number, { x: number; y: number; clusterIdx: number }> =
      {};
    curEquiv.partitions.forEach((part, clusterIdx) => {
      part.forEach((elem, inPartIdx) => {
        const orig = origPos[elem];
        const target = partCentroids[elem];
        // small offset in target so they don't completely overlap
        const localOffset =
          (inPartIdx - (part.length - 1) / 2) * 16 * (1 - collapseT);
        curPos[elem] = {
          x: orig.x + (target.x - orig.x) * collapseT + localOffset,
          y: orig.y + (target.y - orig.y) * collapseT,
          clusterIdx,
        };
      });
    });

    return curPos;
  }, [curEquiv, collapseT]);

  // Poset Node screen positions
  const posetScreenPositions = useMemo(() => {
    const nodes = curPoset.nodes;
    const maxLevel = Math.max(...nodes.map((n) => n.level), 1);
    const width = 440;
    const heightPx = 250;
    const startY = heightPx - 40;
    const endY = 40;

    const res: Record<string, { x: number; y: number; node: PosetNode }> = {};
    nodes.forEach((node) => {
      const y = startY - (node.level / maxLevel) * (startY - endY);
      const x = width / 2 + node.xOffset * 90;
      res[node.id] = { x, y, node };
    });
    return res;
  }, [curPoset]);

  // Poset bounds and ideals/filters for selected node
  const posetAnalysis = useMemo(() => {
    if (!selectedPosetNode) return null;
    const sel = selectedPosetNode;
    const uppers: string[] = [];
    const lowers: string[] = [];

    curPoset.nodes.forEach((n) => {
      if (curPoset.lessOrEqual(sel, n.id)) {
        uppers.push(n.label);
      }
      if (curPoset.lessOrEqual(n.id, sel)) {
        lowers.push(n.label);
      }
    });

    return {
      selectedLabel: curPoset.nodes.find((n) => n.id === sel)?.label ?? sel,
      filter: uppers, // 上界/主滤子
      ideal: lowers, // 下界/主理想
    };
  }, [curPoset, selectedPosetNode]);

  return (
    <ExpandableDemo id="set-theory-relations" height={height}>
      <div className="space-y-3">
        {/* Mode Selector */}
        <CapsuleTabs
          options={[
            {
              id: "equivalence",
              label: "模态 1：等价关系与商集划分 (Equivalence & Partition)",
            },
            {
              id: "poset",
              label: "模态 2：偏序集与哈斯图 (Poset & Hasse Diagram)",
            },
          ]}
          value={mode}
          onChange={(newMode) => {
            setMode(newMode as DemoMode);
            setCollapseT(0);
          }}
        />

        {/* Preset Selector */}
        <div className="bg-card/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-2.5">
          <PresetSelector
            label={mode === "equivalence" ? "等价关系预设:" : "偏序格结构预设:"}
            options={mode === "equivalence" ? EQUIV_PRESETS : POSET_PRESETS}
            value={mode === "equivalence" ? equivPreset : posetPreset}
            onChange={(val) => {
              if (mode === "equivalence") {
                setEquivPreset(val);
                setCollapseT(0);
              } else {
                setPosetPreset(val);
                setSelectedPosetNode(POSET_DATA[val]?.nodes[1]?.id ?? null);
              }
            }}
          />
        </div>

        {/* Main Interactive Stage Container */}
        <div
          ref={canvasContainerRef}
          className="relative h-[var(--demo-height,22rem)] w-full overflow-hidden rounded-xl border border-border bg-slate-950 p-3 select-none"
        >
          {/* CanvasToolbar */}
          <CanvasToolbar
            onReset={() => {
              setCollapseT(0);
              if (mode === "poset") {
                setSelectedPosetNode(curPoset.nodes[1]?.id ?? null);
              }
            }}
          />

          {mode === "equivalence" ? (
            /* Mode 1 Layout: Left Relation Matrix, Right Interactive Clustering Graph */
            <div className="flex h-full w-full flex-col gap-3 md:flex-row">
              {/* Matrix Panel */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-slate-900/60 p-3">
                <div className="mb-2 text-[11px] font-semibold text-muted-foreground">
                  0-1 二元关系矩阵{" "}
                  <InlineMath tex="M_R \in \{0, 1\}^{6 \times 6}" />
                </div>
                <div className="grid grid-cols-6 gap-1 rounded bg-slate-950 p-1.5 border border-border/40">
                  {matrix.map((row, rIdx) =>
                    row.map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold transition-all ${
                            val
                              ? isDiag
                                ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                                : "bg-purple-500/25 text-purple-300"
                              : "bg-slate-900/50 text-slate-600"
                          }`}
                          title={`R(${curEquiv.elements[rIdx]}, ${curEquiv.elements[cIdx]}) = ${val ? 1 : 0}`}
                        >
                          {val ? "1" : "0"}
                        </div>
                      );
                    }),
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-cyan-400" />{" "}
                    主对角线全 1 (自反)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-purple-400" />{" "}
                    对称分块 (对称+传递)
                  </span>
                </div>
              </div>

              {/* Graph Panel: SVG Node & Clustering Display */}
              <div className="relative flex-1 overflow-hidden rounded-lg border border-border/60 bg-slate-900/40">
                <svg className="h-full w-full">
                  <defs>
                    <filter
                      id="glow"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite
                        in="SourceGraphic"
                        in2="glow"
                        operator="over"
                      />
                    </filter>
                  </defs>

                  {/* Equivalent Cluster Enclosures when collapseT > 0.3 */}
                  {collapseT > 0.15 &&
                    curEquiv.partitions.map((part, pIdx) => {
                      const col = CLUSTER_COLORS[pIdx % CLUSTER_COLORS.length];
                      // compute bbox of cluster nodes
                      const xs = part.map(
                        (id) => equivNodePositions[id]?.x ?? 0,
                      );
                      const ys = part.map(
                        (id) => equivNodePositions[id]?.y ?? 0,
                      );
                      const minX = Math.min(...xs) - 22;
                      const maxX = Math.max(...xs) + 22;
                      const minY = Math.min(...ys) - 22;
                      const maxY = Math.max(...ys) + 22;
                      const w = maxX - minX;
                      const h = maxY - minY;
                      const midX = (minX + maxX) / 2;
                      const midY = minY - 10;

                      return (
                        <g
                          key={pIdx}
                          style={{
                            opacity: Math.min(1, (collapseT - 0.15) * 1.5),
                          }}
                        >
                          <rect
                            x={minX}
                            y={minY}
                            width={w}
                            height={h}
                            rx={16}
                            fill={col.bg}
                            stroke={col.border}
                            strokeWidth={2}
                            strokeDasharray="4 3"
                          />
                          <text
                            x={midX}
                            y={midY}
                            fill={col.text}
                            fontSize={11}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {`商类 [${part[0]}] = {${part.join(", ")}}`}
                          </text>
                        </g>
                      );
                    })}

                  {/* Intra-cluster Equivalence Arcs */}
                  {curEquiv.partitions.map((part, pIdx) => {
                    const col = CLUSTER_COLORS[pIdx % CLUSTER_COLORS.length];
                    const edges: [number, number][] = [];
                    for (let i = 0; i < part.length; i++) {
                      for (let j = i + 1; j < part.length; j++) {
                        edges.push([part[i], part[j]]);
                      }
                    }
                    return edges.map(([u, v], eIdx) => {
                      const p1 = equivNodePositions[u];
                      const p2 = equivNodePositions[v];
                      if (!p1 || !p2) return null;
                      return (
                        <line
                          key={`${pIdx}-${eIdx}`}
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={col.border}
                          strokeWidth={2}
                          strokeOpacity={Math.max(0.2, 1 - collapseT * 0.7)}
                        />
                      );
                    });
                  })}

                  {/* Nodes */}
                  {curEquiv.elements.map((elem) => {
                    const pos = equivNodePositions[elem];
                    if (!pos) return null;
                    const col =
                      CLUSTER_COLORS[pos.clusterIdx % CLUSTER_COLORS.length];
                    return (
                      <g key={elem} transform={`translate(${pos.x}, ${pos.y})`}>
                        <circle
                          r={16}
                          fill="#0f172a"
                          stroke={col.border}
                          strokeWidth={2.5}
                          filter="url(#glow)"
                        />
                        <text
                          y={4}
                          fill="#f8fafc"
                          fontSize={12}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {elem}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend Overlay */}
                <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm border border-border/40">
                  <span>
                    划分块数 (商集基数 <InlineMath tex="|A/{\sim}|" />
                    ):{" "}
                    <strong className="text-foreground">
                      {curEquiv.partitions.length}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2 Layout: Interactive Hasse Diagram */
            <div className="relative h-full w-full">
              <svg className="h-full w-full">
                {/* Hasse Covering Edges */}
                {curPoset.coveringEdges.map(([fromId, toId], eIdx) => {
                  const pFrom = posetScreenPositions[fromId];
                  const pTo = posetScreenPositions[toId];
                  if (!pFrom || !pTo) return null;

                  const isSelFrom =
                    selectedPosetNode &&
                    curPoset.lessOrEqual(selectedPosetNode, toId) &&
                    curPoset.lessOrEqual(fromId, toId);
                  const isSelTo =
                    selectedPosetNode &&
                    curPoset.lessOrEqual(fromId, selectedPosetNode) &&
                    curPoset.lessOrEqual(fromId, toId);
                  const isHighlighted = isSelFrom || isSelTo;

                  return (
                    <line
                      key={eIdx}
                      x1={pFrom.x}
                      y1={pFrom.y}
                      x2={pTo.x}
                      y2={pTo.y}
                      stroke={isHighlighted ? "#38bdf8" : "#475569"}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      strokeOpacity={isHighlighted ? 0.9 : 0.4}
                    />
                  );
                })}

                {/* Hasse Nodes */}
                {curPoset.nodes.map((node) => {
                  const pos = posetScreenPositions[node.id];
                  if (!pos) return null;

                  const isSelected = selectedPosetNode === node.id;
                  const isUpper =
                    selectedPosetNode &&
                    curPoset.lessOrEqual(selectedPosetNode, node.id);
                  const isLower =
                    selectedPosetNode &&
                    curPoset.lessOrEqual(node.id, selectedPosetNode);

                  let strokeColor = "#64748b";
                  let fillColor = "#0f172a";
                  let textColor = "#e2e8f0";

                  if (isSelected) {
                    strokeColor = "#f59e0b";
                    fillColor = "#78350f";
                    textColor = "#fef3c7";
                  } else if (isUpper) {
                    strokeColor = "#06b6d4";
                    fillColor = "#164e63";
                    textColor = "#cffafe";
                  } else if (isLower) {
                    strokeColor = "#8b5cf6";
                    fillColor = "#4c1d95";
                    textColor = "#ede9fe";
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => setSelectedPosetNode(node.id)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <circle
                        r={18}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      <text
                        y={4}
                        fill={textColor}
                        fontSize={node.label.length > 3 ? 10 : 12}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Poset Instructions & Legend */}
              <div className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1 rounded bg-slate-900/80 p-2 text-[11px] text-muted-foreground backdrop-blur-sm border border-border/40">
                <span className="font-semibold text-foreground">
                  💡 点击节点高亮序结构：
                </span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />{" "}
                  选中基准元素 x
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> 主滤子
                  (所有上界 y ≥ x)
                </span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  <span className="h-2 w-2 rounded-full bg-purple-400" /> 主理想
                  (所有下界 z ≤ x)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Controls based on Mode */}
        {mode === "equivalence" ? (
          <div className="bg-card/40 space-y-1.5 rounded-lg border border-border p-3">
            <ParamSlider
              label={
                <span>
                  商集聚合打包进度 <InlineMath tex="t \in [0, 1]" />
                </span>
              }
              value={collapseT}
              min={0}
              max={1}
              step={0.02}
              onChange={(val) => setCollapseT(val)}
              display={
                collapseT === 0
                  ? "t = 0 (原始离散集合 A)"
                  : collapseT === 1
                    ? "t = 1 (完全聚类为商集 A/~)"
                    : `t = ${collapseT.toFixed(2)}`
              }
            />
            <p className="text-xs text-muted-foreground">
              拖动滑块：等价元素沿关系连线逐步收缩归并，最终打包融合成商集中的单个复合代表元{" "}
              <InlineMath tex="[x] \in A/{\sim}" />
              ，直观印证“商集就是把等价类捏合为点”。
            </p>
          </div>
        ) : (
          <div className="bg-card/40 rounded-lg border border-border p-3 text-xs text-muted-foreground">
            {posetAnalysis && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <strong>当前选中元素:</strong>{" "}
                  <span className="font-mono text-amber-300 font-bold">
                    {posetAnalysis.selectedLabel}
                  </span>
                </div>
                <div>
                  <strong>主滤子 (所有上界):</strong>{" "}
                  <span className="font-mono text-cyan-300">{`{ ${posetAnalysis.filter.join(", ")} }`}</span>
                </div>
                <div>
                  <strong>主理想 (所有下界):</strong>{" "}
                  <span className="font-mono text-purple-300">{`{ ${posetAnalysis.ideal.join(", ")} }`}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Math Summary Card */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {mode === "equivalence"
                ? "等价关系与商集划分基本定理"
                : "偏序集与格理论（Order & Lattice Theory）"}
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {mode === "equivalence"
                ? "A/~ 划分互斥且完备"
                : "DAG 最简覆盖骨架"}
            </span>
          </div>

          {mode === "equivalence" ? (
            <div className="space-y-1.5">
              <p>
                <strong>商集定义:</strong>{" "}
                <InlineMath tex="A/{\sim} = \{ [a] \mid a \in A \}" />
                ，其中等价类{" "}
                <InlineMath tex="[a] = \{ x \in A \mid x \sim a \}" />。
              </p>
              <p>
                <strong>划分基本定理:</strong> 等价关系诱导的等价类集合构成全集{" "}
                <InlineMath tex="A" /> 的一个严格划分，即：
                <InlineMath tex="\bigcup_{[a] \in A/{\sim}} [a] = A" />{" "}
                且任意两个不同商类互斥{" "}
                <InlineMath tex="[a] \cap [b] = \emptyset" />。
              </p>
              <div className="mt-2 rounded-md border border-border/80 bg-background/60 p-2.5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  💡 贯通全站知识网络：
                </span>
                在线性代数中，子空间 <InlineMath tex="U \le V" />{" "}
                诱导向量差等价关系{" "}
                <InlineMath tex="\mathbf{x} \sim \mathbf{y} \iff \mathbf{x} - \mathbf{y} \in U" />
                ，所得到的商集赋予向量运算后即为{" "}
                <strong>
                  商空间 <InlineMath tex="V/U" />
                </strong>
                ；在方阵空间中，相似变换诱导出的等价类即为{" "}
                <strong>相似轨道（Jordan 标准型）</strong>！
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p>
                <strong>偏序公理（Poset）:</strong> 关系满足{" "}
                <strong>自反性</strong>（<InlineMath tex="a \le a" />
                ）、
                <strong>反对称性</strong>（
                <InlineMath tex="a \le b \land b \le a \implies a = b" />
                ）与 <strong>传递性</strong>（
                <InlineMath tex="a \le b \land b \le c \implies a \le c" />
                ）。
              </p>
              <p>
                <strong>哈斯图简化原理:</strong>{" "}
                去除所有自反自环，去除由传递性诱导的冗余边，只保留覆盖关系（Covering
                Relation），并在垂直方向体现偏序次序。
              </p>
              <div className="mt-2 rounded-md border border-border/80 bg-background/60 p-2.5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  💡 计算机图形学灵魂：
                </span>
                现代图形 API（Vulkan、DirectX 12、WebGPU）中的{" "}
                <strong>渲染图（Render Graph）</strong>，各 Pass
                之间的屏障依赖关系本质上是一个偏序集。对哈斯图执行{" "}
                <strong>拓扑排序（Topological Sort）</strong>
                ，就是在寻找该偏序集的一个线性相容全序序列！
              </div>
            </div>
          )}
        </div>
      </div>
    </ExpandableDemo>
  );
}
