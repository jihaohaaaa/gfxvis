import React, { useState, useRef, useMemo, useCallback } from "react";
import CapsuleTabs from "../framework/CapsuleTabs";
import CanvasToolbar from "../framework/CanvasToolbar";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import PresetSelector, { type PresetOption } from "../framework/PresetSelector";

type SetCount = 2 | 3;

interface CircleState {
  id: "A" | "B" | "C";
  x: number;
  y: number;
  r: number;
  color: string;
  name: string;
}

const PRESETS_2: PresetOption[] = [
  { id: "custom", label: "自定义区域点选" },
  { id: "intersection", label: "交集 A ∩ B" },
  { id: "union", label: "并集 A ∪ B" },
  { id: "diff_A_B", label: "差集 A \\ B" },
  { id: "diff_B_A", label: "差集 B \\ A" },
  { id: "sym_diff", label: "对称差 A △ B (XOR)" },
  { id: "comp_union", label: "并集之补 (A ∪ B)ᶜ" },
  { id: "comp_inter", label: "交集之补 (A ∩ B)ᶜ" },
  { id: "de_morgan_1_left", label: "德·摩根律 ① 左式: (A ∪ B)ᶜ" },
  { id: "de_morgan_1_right", label: "德·摩根律 ① 右式: Aᶜ ∩ Bᶜ" },
  { id: "de_morgan_2_left", label: "德·摩根律 ② 左式: (A ∩ B)ᶜ" },
  { id: "de_morgan_2_right", label: "德·摩根律 ② 右式: Aᶜ ∪ Bᶜ" },
];

const PRESETS_3: PresetOption[] = [
  { id: "custom", label: "自定义区域点选" },
  { id: "inter_all", label: "三者之交 A ∩ B ∩ C" },
  { id: "union_all", label: "三者之并 A ∪ B ∪ C" },
  { id: "pairwise_inter", label: "两两相交 (A∩B) ∪ (B∩C) ∪ (C∩A)" },
  { id: "only_one", label: "恰属于一个集合 (独占区域)" },
  { id: "only_two", label: "恰属于两个集合" },
  { id: "comp_union_all", label: "三集并之补 (A ∪ B ∪ C)ᶜ" },
  { id: "de_morgan_3_left", label: "三集对偶左式: (A ∪ B ∪ C)ᶜ" },
  { id: "de_morgan_3_right", label: "三集对偶右式: Aᶜ ∩ Bᶜ ∩ Cᶜ" },
];

export default function SetOperationsVennDemo() {
  const [setCount, setSetCount] = useState<SetCount>(2);
  const [presetId, setPresetId] = useState<string>("union");

  // Mask bits represent whether minterm index i is selected.
  // 2-set: 4 minterms (0 to 3), A=bit0, B=bit1
  // 3-set: 8 minterms (0 to 7), A=bit0, B=bit1, C=bit2
  const [activeMask, setActiveMask] = useState<number>(0b1110); // A ∪ B
  const [hoveredMinterm, setHoveredMinterm] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Logical coordinate system: base width 700, height 440
  const BASE_WIDTH = 700;
  const BASE_HEIGHT = 440;
  const U_BOX_MARGIN = 14;

  // Draggable circles in logical coordinates
  const [circles2, setCircles2] = useState<CircleState[]>([
    { id: "A", x: 275, y: 220, r: 135, color: "#3b82f6", name: "A" },
    { id: "B", x: 425, y: 220, r: 135, color: "#ec4899", name: "B" },
  ]);

  const [circles3, setCircles3] = useState<CircleState[]>([
    { id: "A", x: 290, y: 175, r: 125, color: "#3b82f6", name: "A" },
    { id: "B", x: 410, y: 175, r: 125, color: "#ec4899", name: "B" },
    { id: "C", x: 350, y: 275, r: 125, color: "#10b981", name: "C" },
  ]);

  const draggingRef = useRef<{
    id: "A" | "B" | "C";
    type: "center" | "radius";
    startMouseX: number;
    startMouseY: number;
    initialCircle: CircleState;
  } | null>(null);

  const currentCircles = setCount === 2 ? circles2 : circles3;
  const setCurrentCircles = setCount === 2 ? setCircles2 : setCircles3;

  const applyPreset = useCallback((id: string, count: SetCount) => {
    setPresetId(id);
    if (count === 2) {
      switch (id) {
        case "intersection":
          setActiveMask(0b1000); // m3
          break;
        case "union":
          setActiveMask(0b1110); // m1 | m2 | m3
          break;
        case "diff_A_B":
          setActiveMask(0b0010); // m1
          break;
        case "diff_B_A":
          setActiveMask(0b0100); // m2
          break;
        case "sym_diff":
          setActiveMask(0b0110); // m1 | m2
          break;
        case "comp_union":
        case "de_morgan_1_left":
        case "de_morgan_1_right":
          setActiveMask(0b0001); // m0
          break;
        case "comp_inter":
        case "de_morgan_2_left":
        case "de_morgan_2_right":
          setActiveMask(0b0111); // m0 | m1 | m2
          break;
        default:
          break;
      }
    } else {
      switch (id) {
        case "inter_all":
          setActiveMask(0b10000000); // m7
          break;
        case "union_all":
          setActiveMask(0b11111110); // m1..m7
          break;
        case "pairwise_inter":
          setActiveMask((1 << 3) | (1 << 5) | (1 << 6) | (1 << 7));
          break;
        case "only_one":
          setActiveMask((1 << 1) | (1 << 2) | (1 << 4));
          break;
        case "only_two":
          setActiveMask((1 << 3) | (1 << 5) | (1 << 6));
          break;
        case "comp_union_all":
        case "de_morgan_3_left":
        case "de_morgan_3_right":
          setActiveMask(0b00000001); // m0
          break;
        default:
          break;
      }
    }
  }, []);

  const handleSetCountChange = (count: SetCount) => {
    setSetCount(count);
    applyPreset(count === 2 ? "union" : "union_all", count);
  };

  const handleReset = () => {
    if (setCount === 2) {
      setCircles2([
        { id: "A", x: 275, y: 220, r: 135, color: "#3b82f6", name: "A" },
        { id: "B", x: 425, y: 220, r: 135, color: "#ec4899", name: "B" },
      ]);
      applyPreset("union", 2);
    } else {
      setCircles3([
        { id: "A", x: 290, y: 175, r: 125, color: "#3b82f6", name: "A" },
        { id: "B", x: 410, y: 175, r: 125, color: "#ec4899", name: "B" },
        { id: "C", x: 350, y: 275, r: 125, color: "#10b981", name: "C" },
      ]);
      applyPreset("union_all", 3);
    }
  };

  // Convert client cursor coords into SVG viewBox (700x440) coordinates
  const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const getPointMinterm = useCallback(
    (px: number, py: number, circles: CircleState[]): number => {
      // 1. If point is outside the Universe box, it belongs to no minterm (-1)
      if (
        px < U_BOX_MARGIN ||
        px > BASE_WIDTH - U_BOX_MARGIN ||
        py < U_BOX_MARGIN ||
        py > BASE_HEIGHT - U_BOX_MARGIN
      ) {
        return -1;
      }

      // 2. Otherwise compute minterm bits
      let minterm = 0;
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const dx = px - c.x;
        const dy = py - c.y;
        if (dx * dx + dy * dy <= c.r * c.r) {
          minterm |= 1 << i;
        }
      }
      return minterm;
    },
    [],
  );

  const handlePointerDownCenter = (
    e: React.PointerEvent,
    circle: CircleState,
  ) => {
    e.stopPropagation();
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
    draggingRef.current = {
      id: circle.id,
      type: "center",
      startMouseX: x,
      startMouseY: y,
      initialCircle: { ...circle },
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerDownRadius = (
    e: React.PointerEvent,
    circle: CircleState,
  ) => {
    e.stopPropagation();
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
    draggingRef.current = {
      id: circle.id,
      type: "radius",
      startMouseX: x,
      startMouseY: y,
      initialCircle: { ...circle },
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
    const m = getPointMinterm(x, y, currentCircles);
    if (m === -1) return;
    setActiveMask((prev) => {
      const next = prev ^ (1 << m);
      setPresetId("custom");
      return next;
    });
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);

    if (draggingRef.current) {
      const { id, type, startMouseX, startMouseY, initialCircle } =
        draggingRef.current;
      const dx = x - startMouseX;
      const dy = y - startMouseY;

      setCurrentCircles((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (type === "center") {
            const nextX = Math.max(
              70,
              Math.min(BASE_WIDTH - 70, initialCircle.x + dx),
            );
            const nextY = Math.max(
              70,
              Math.min(BASE_HEIGHT - 70, initialCircle.y + dy),
            );
            return { ...c, x: nextX, y: nextY };
          } else {
            // Adjust radius based on distance to center
            const curDist = Math.hypot(x - c.x, y - c.y);
            const nextR = Math.max(50, Math.min(190, curDist));
            return { ...c, r: nextR };
          }
        }),
      );
    } else {
      const m = getPointMinterm(x, y, currentCircles);
      setHoveredMinterm(m === -1 ? null : m);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingRef.current) {
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      draggingRef.current = null;
    }
  };

  const handleSvgPointerLeave = () => {
    setHoveredMinterm(null);
  };

  const mintermInfo = useMemo(() => {
    if (setCount === 2) {
      return [
        {
          index: 0,
          label: "m₀",
          tex: "A^c \\cap B^c = (A \\cup B)^c",
          name: "全集补集 (两集合之外)",
          bits: "00",
        },
        {
          index: 1,
          label: "m₁",
          tex: "A \\cap B^c = A \\setminus B",
          name: "A 独占差集",
          bits: "01",
        },
        {
          index: 2,
          label: "m₂",
          tex: "A^c \\cap B = B \\setminus A",
          name: "B 独占差集",
          bits: "10",
        },
        {
          index: 3,
          label: "m₃",
          tex: "A \\cap B",
          name: "核心交集",
          bits: "11",
        },
      ];
    } else {
      return [
        {
          index: 0,
          label: "m₀",
          tex: "A^c \\cap B^c \\cap C^c = (A \\cup B \\cup C)^c",
          name: "三集合全域之外",
          bits: "000",
        },
        {
          index: 1,
          label: "m₁",
          tex: "A \\cap B^c \\cap C^c = A \\setminus (B \\cup C)",
          name: "仅属于 A (A 独占)",
          bits: "001",
        },
        {
          index: 2,
          label: "m₂",
          tex: "A^c \\cap B \\cap C^c = B \\setminus (A \\cup C)",
          name: "仅属于 B (B 独占)",
          bits: "010",
        },
        {
          index: 3,
          label: "m₃",
          tex: "A \\cap B \\cap C^c = (A \\cap B) \\setminus C",
          name: "仅 A 与 B 相交 (无 C)",
          bits: "011",
        },
        {
          index: 4,
          label: "m₄",
          tex: "A^c \\cap B^c \\cap C = C \\setminus (A \\cup B)",
          name: "仅属于 C (C 独占)",
          bits: "100",
        },
        {
          index: 5,
          label: "m₅",
          tex: "A \\cap B^c \\cap C = (A \\cap C) \\setminus B",
          name: "仅 A 与 C 相交 (无 B)",
          bits: "101",
        },
        {
          index: 6,
          label: "m₆",
          tex: "A^c \\cap B \\cap C = (B \\cap C) \\setminus A",
          name: "仅 B 与 C 相交 (无 A)",
          bits: "110",
        },
        {
          index: 7,
          label: "m₇",
          tex: "A \\cap B \\cap C",
          name: "三者共同交集 (核心三交)",
          bits: "111",
        },
      ];
    }
  }, [setCount]);

  const derivedFormula = useMemo(() => {
    const numMinterms = 1 << setCount;
    if (activeMask === 0) return "\\varnothing \\quad \\text{(空集)}";
    if (activeMask === (1 << numMinterms) - 1) return "U \\quad \\text{(全集)}";

    if (setCount === 2) {
      if (activeMask === 0b1000) return "A \\cap B";
      if (activeMask === 0b1110) return "A \\cup B";
      if (activeMask === 0b0010) return "A \\setminus B";
      if (activeMask === 0b0100) return "B \\setminus A";
      if (activeMask === 0b0110)
        return "A \\triangle B = (A \\setminus B) \\cup (B \\setminus A)";
      if (activeMask === 0b0001) return "(A \\cup B)^c = A^c \\cap B^c";
      if (activeMask === 0b0111) return "(A \\cap B)^c = A^c \\cup B^c";
      if (activeMask === 0b1010) return "A";
      if (activeMask === 0b1100) return "B";
    } else {
      if (activeMask === 0b10000000) return "A \\cap B \\cap C";
      if (activeMask === 0b11111110) return "A \\cup B \\cup C";
      if (activeMask === 0b00000001)
        return "(A \\cup B \\cup C)^c = A^c \\cap B^c \\cap C^c";
    }

    const selectedTerms = mintermInfo.filter(
      (m) => (activeMask & (1 << m.index)) !== 0,
    );
    return selectedTerms.map((t) => t.label).join(" \\;\\cup\\; ");
  }, [activeMask, setCount, mintermInfo]);

  const isDeMorganMode =
    presetId.startsWith("de_morgan_") ||
    presetId === "comp_union" ||
    presetId === "comp_inter" ||
    presetId === "comp_union_all";

  const numMinterms = 1 << currentCircles.length;

  return (
    <ExpandableDemo id="set-operations-venn" height="24rem">
      <div className="flex flex-col gap-3">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-surface/70 p-2.5 backdrop-blur-sm">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted">
              集合数目：
            </span>
            <CapsuleTabs
              size="xs"
              value={String(setCount)}
              onChange={(val) => handleSetCountChange(Number(val) as SetCount)}
              options={[
                { id: "2", label: "2 集合 (A, B)" },
                { id: "3", label: "3 集合 (A, B, C)" },
              ]}
            />
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <PresetSelector
              label="运算预设:"
              options={setCount === 2 ? PRESETS_2 : PRESETS_3}
              value={presetId}
              onChange={(id) => applyPreset(id, setCount)}
            />
          </div>
        </div>

        {/* Pure SVG Vector Workspace */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-slate-950/80 h-[var(--demo-height,24rem)] shadow-inner select-none">
          <CanvasToolbar onReset={handleReset} resetLabel="复位位置" />

          {/* Floating Hint Overlay */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border/60 bg-surface/85 px-2.5 py-1.5 text-[11px] text-text-muted shadow-sm backdrop-blur-md pointer-events-none">
            <div className="flex items-center gap-1.5 font-medium text-text">
              <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
              矢量交互提示
            </div>
            <span>• 拖拽圆心调整相对位置；拖拽圆周外沿手柄缩放半径</span>
            <span>• 点击 Venn 图中任意分割区域可直接切换包含状态</span>
            {hoveredMinterm !== null && (
              <span className="text-amber-400 font-mono font-medium">
                当前探针：{mintermInfo[hoveredMinterm]?.label} (
                {mintermInfo[hoveredMinterm]?.name})
              </span>
            )}
          </div>

          {/* Infinite-Resolution SVG */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerLeave={handleSvgPointerLeave}
            className="h-full w-full cursor-crosshair touch-none"
          >
            <defs>
              {/* Soft glow filter */}
              <filter
                id="venn-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Individual circle masks (pure white fill inside circle) */}
              {currentCircles.map((c) => (
                <mask key={`mask-circle-${c.id}`} id={`mask-circle-${c.id}`}>
                  <rect width={BASE_WIDTH} height={BASE_HEIGHT} fill="black" />
                  <circle cx={c.x} cy={c.y} r={c.r} fill="white" />
                </mask>
              ))}

              {/* Minterm exact geometric intersection masks */}
              {Array.from({ length: numMinterms }).map((_, m) => {
                const posCircleIndices = currentCircles
                  .map((_, i) => (((m >> i) & 1) === 1 ? i : -1))
                  .filter((idx) => idx !== -1);

                return (
                  <mask key={`minterm-mask-${m}`} id={`minterm-mask-${m}`}>
                    {m === 0 ? (
                      // m0: Start with universe white rect, then subtract ALL circles with black
                      <>
                        <rect
                          x={U_BOX_MARGIN}
                          y={U_BOX_MARGIN}
                          width={BASE_WIDTH - U_BOX_MARGIN * 2}
                          height={BASE_HEIGHT - U_BOX_MARGIN * 2}
                          rx={12}
                          fill="white"
                        />
                        {currentCircles.map((c) => (
                          <circle
                            key={`cut-all-${c.id}`}
                            cx={c.x}
                            cy={c.y}
                            r={c.r}
                            fill="black"
                          />
                        ))}
                      </>
                    ) : (
                      // m > 0: Start with base black rect
                      <>
                        <rect
                          width={BASE_WIDTH}
                          height={BASE_HEIGHT}
                          fill="black"
                        />
                        {/* Positive circle white base (intersection of all positive circles) */}
                        <g
                          mask={
                            posCircleIndices.length > 1
                              ? `url(#mask-circle-${currentCircles[posCircleIndices[1]].id})`
                              : undefined
                          }
                        >
                          {posCircleIndices.length > 2 ? (
                            <g
                              mask={`url(#mask-circle-${currentCircles[posCircleIndices[2]].id})`}
                            >
                              <circle
                                cx={currentCircles[posCircleIndices[0]].x}
                                cy={currentCircles[posCircleIndices[0]].y}
                                r={currentCircles[posCircleIndices[0]].r}
                                fill="white"
                              />
                            </g>
                          ) : (
                            <circle
                              cx={currentCircles[posCircleIndices[0]].x}
                              cy={currentCircles[posCircleIndices[0]].y}
                              r={currentCircles[posCircleIndices[0]].r}
                              fill="white"
                            />
                          )}
                        </g>

                        {/* Negative circles (0-bits) cut out with black */}
                        {currentCircles.map((c, i) => {
                          const isInside = ((m >> i) & 1) === 1;
                          if (!isInside) {
                            return (
                              <circle
                                key={`cut-neg-${c.id}`}
                                cx={c.x}
                                cy={c.y}
                                r={c.r}
                                fill="black"
                              />
                            );
                          }
                          return null;
                        })}
                      </>
                    )}
                  </mask>
                );
              })}
            </defs>

            {/* 1. Universe Box U */}
            <rect
              x={U_BOX_MARGIN}
              y={U_BOX_MARGIN}
              width={BASE_WIDTH - U_BOX_MARGIN * 2}
              height={BASE_HEIGHT - U_BOX_MARGIN * 2}
              rx={12}
              className={`transition-colors duration-150 ${
                hoveredMinterm === 0
                  ? "fill-slate-900/50 stroke-amber-400/80 stroke-2"
                  : "fill-slate-900/40 stroke-slate-600/50 stroke-[1.8]"
              }`}
            />
            <text
              x={U_BOX_MARGIN + 16}
              y={U_BOX_MARGIN + 24}
              className="fill-slate-400 font-sans font-bold text-xs pointer-events-none select-none"
            >
              全集 U (Universe)
            </text>

            {/* 2. Vector Minterm Shaded Regions with Crisp Anti-aliasing */}
            {Array.from({ length: numMinterms }).map((_, m) => {
              const isSelected = (activeMask & (1 << m)) !== 0;
              const isHovered = hoveredMinterm === m;

              if (!isSelected && !isHovered) return null;

              // For m0 (outside space), do not blast bright yellow across the whole canvas on hover.
              // Instead, keep it subtle or only show when actually selected.
              return (
                <rect
                  key={`region-${m}`}
                  x={U_BOX_MARGIN}
                  y={U_BOX_MARGIN}
                  width={BASE_WIDTH - U_BOX_MARGIN * 2}
                  height={BASE_HEIGHT - U_BOX_MARGIN * 2}
                  rx={12}
                  mask={`url(#minterm-mask-${m})`}
                  className={`transition-colors duration-150 ${
                    m === 0
                      ? isHovered
                        ? isSelected
                          ? "fill-indigo-500/25"
                          : "fill-amber-400/10"
                        : "fill-indigo-500/20"
                      : isHovered
                        ? "fill-amber-400/65"
                        : "fill-indigo-500/50"
                  }`}
                />
              );
            })}

            {/* 3. Circle Perimeter Outlines, Centers, and Handles */}
            {currentCircles.map((c, i) => {
              const angle =
                setCount === 2
                  ? i === 0
                    ? Math.PI * 0.8
                    : Math.PI * 0.2
                  : i === 0
                    ? Math.PI * 0.85
                    : i === 1
                      ? Math.PI * 0.15
                      : Math.PI * 0.5;

              const lx = c.x + (c.r + 24) * Math.cos(angle);
              const ly = c.y - (c.r + 24) * Math.sin(angle);

              // Radius resize handle placed at bottom-right of circle
              const hx = c.x + c.r * Math.cos(Math.PI * 0.25);
              const hy = c.y + c.r * Math.sin(Math.PI * 0.25);

              return (
                <g key={`circle-group-${c.id}`}>
                  {/* Crisp Outlined Circle */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={c.r}
                    stroke={c.color}
                    strokeWidth={2.5}
                    fill="transparent"
                    filter="url(#venn-glow)"
                    className="pointer-events-none"
                  />

                  {/* Circle Name Label */}
                  <text
                    x={lx}
                    y={ly}
                    fill={c.color}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-sans font-bold text-xl drop-shadow pointer-events-none select-none"
                  >
                    {c.name}
                  </text>

                  {/* Center Drag Handle */}
                  <g
                    className="cursor-move"
                    onPointerDown={(e) => handlePointerDownCenter(e, c)}
                  >
                    <circle cx={c.x} cy={c.y} r={14} fill="transparent" />
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={5.5}
                      fill={c.color}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  </g>

                  {/* Perimeter Radius Resize Handle */}
                  <g
                    className="cursor-nwse-resize"
                    onPointerDown={(e) => handlePointerDownRadius(e, c)}
                  >
                    <circle cx={hx} cy={hy} r={10} fill="transparent" />
                    <circle
                      cx={hx}
                      cy={hy}
                      r={4.5}
                      fill={c.color}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Information & Status Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Active Algebraic Formula */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/80 bg-surface/60 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">
                当前选中区域代数表达式：
              </span>
              <span className="font-mono text-[11px] text-accent">
                包含 {(activeMask.toString(2).match(/1/g) || []).length} /{" "}
                {1 << setCount} 极小项
              </span>
            </div>
            <div className="flex min-h-[36px] items-center justify-center rounded border border-border/40 bg-canvas/60 px-3 py-1 text-center font-mono">
              <InlineMath tex={derivedFormula} />
            </div>
          </div>

          {/* De Morgan & Dual Laws Insight */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/80 bg-surface/60 p-2.5 text-xs">
            <span className="font-semibold text-text">
              对偶律与布尔位操作视角：
            </span>
            <div className="flex flex-col gap-1 text-[11px] text-text-muted leading-relaxed">
              {isDeMorganMode ? (
                <div className="text-accent font-medium">
                  ★
                  德·摩根定律保证了：取补操作将交集（AND）完全翻转为并集（OR），阴影区域与右侧对偶形态严格相等。
                </div>
              ) : (
                <div>
                  在计算机科学中，集合通过特征向量编码：交集对应位与（
                  <code className="font-mono text-accent">&</code>
                  ），并集对应位或（
                  <code className="font-mono text-accent">|</code>
                  ），对称差对应异或（
                  <code className="font-mono text-accent">^</code>
                  ）。
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minterms Grid Toggle Buttons */}
        <div className="rounded-lg border border-border/80 bg-surface/40 p-2 text-xs">
          <div className="mb-1.5 font-semibold text-text-muted">
            基本析取项（极小项 Minterms）开关阵列：
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {mintermInfo.map((m) => {
              const isSelected = (activeMask & (1 << m.index)) !== 0;
              return (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => {
                    setActiveMask((prev) => prev ^ (1 << m.index));
                    setPresetId("custom");
                  }}
                  onMouseEnter={() => setHoveredMinterm(m.index)}
                  onMouseLeave={() => setHoveredMinterm(null)}
                  className={`flex flex-col items-start rounded border px-2 py-1 transition-all ${
                    isSelected
                      ? "border-accent/80 bg-accent/15 text-text shadow-sm"
                      : "border-border/60 bg-surface/80 text-text-muted hover:border-border"
                  }`}
                >
                  <div className="flex w-full items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-accent">
                      {m.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      [{m.bits}]
                    </span>
                  </div>
                  <span className="truncate text-[10px]">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
