import { useEffect, useMemo, useState } from "react";
import Checkbox from "../framework/Checkbox";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";

const ALL_SYMBOLS = ["A", "B", "C", "D", "E"];

const SYMBOL_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  A: {
    bg: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    border: "#38bdf8",
    text: "#38bdf8",
  },
  B: {
    bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    border: "#34d399",
    text: "#34d399",
  },
  C: {
    bg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    border: "#fbbf24",
    text: "#fbbf24",
  },
  D: {
    bg: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    border: "#c084fc",
    text: "#c084fc",
  },
  E: {
    bg: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    border: "#fb7185",
    text: "#fb7185",
  },
};

function factorial(n: number): number {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Generate all permutations of an array
function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(remaining)) {
      res.push([current, ...p]);
    }
  }
  return res;
}

// Circular equivalence classes (representatives starting with first symbol)
function getCircularClasses(symbols: string[]): string[][] {
  const first = symbols[0];
  const rest = symbols.slice(1);
  const restPerms = permute(rest);
  return restPerms.map((p) => [first, ...p]);
}

// Necklace equivalence classes (fixing first element, folding mirror symmetry)
function getNecklaceClasses(symbols: string[]): string[][] {
  const circular = getCircularClasses(symbols);
  const seen = new Set<string>();
  const res: string[][] = [];

  for (const c of circular) {
    const str = c.join("");
    if (seen.has(str)) continue;

    res.push(c);
    seen.add(str);

    // Reversed circular representation starting with first symbol
    const rev = [c[0], ...c.slice(1).reverse()].join("");
    seen.add(rev);
  }
  return res;
}

export default function CircularPermutationDemo() {
  const [n, setN] = useState<number>(4);
  const [necklaceMode, setNecklaceMode] = useState<boolean>(false);
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const [rotationStep, setRotationStep] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const symbols = useMemo(() => ALL_SYMBOLS.slice(0, n), [n]);

  const classes = useMemo(() => {
    return necklaceMode
      ? getNecklaceClasses(symbols)
      : getCircularClasses(symbols);
  }, [symbols, necklaceMode]);

  // Adjust selection if out of bounds
  const currentClass = classes[selectedClassIndex] ?? classes[0] ?? symbols;

  // Auto rotation timer: continuously increment step to avoid 360->0 jump
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setRotationStep((prev) => prev + 1);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle parameter changes
  const handleNChange = (newN: number) => {
    setN(newN);
    setSelectedClassIndex(0);
    setRotationStep(0);
    setIsFlipped(false);
    setIsPlaying(false);
  };

  const handleModeChange = (checked: boolean) => {
    setNecklaceMode(checked);
    setSelectedClassIndex(0);
    setRotationStep(0);
    setIsFlipped(false);
  };

  const handleReset = () => {
    setSelectedClassIndex(0);
    setRotationStep(0);
    setIsFlipped(false);
    setIsPlaying(false);
  };

  // Jump to specific rotation index via shortest path
  const handleRotateToIdx = (targetIdx: number) => {
    const currentIdx = ((-rotationStep % n) + n) % n;
    let diff = targetIdx - currentIdx;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    setRotationStep((prev) => prev - diff);
  };

  // Generate all n forward rotations
  const forwardRotations = useMemo(() => {
    const arr = currentClass;
    const list: string[][] = [];
    for (let shift = 0; shift < n; shift++) {
      list.push(arr.map((_, i) => arr[(i + shift) % n]));
    }
    return list;
  }, [currentClass, n]);

  // Generate all n reflected / flipped rotations
  const reflectedRotations = useMemo(() => {
    const rev = [currentClass[0], ...currentClass.slice(1).reverse()];
    const list: string[][] = [];
    for (let shift = 0; shift < n; shift++) {
      list.push(rev.map((_, i) => rev[(i + shift) % n]));
    }
    return list;
  }, [currentClass, n]);

  // Total counts
  const totalLinear = factorial(n);
  const totalCircular = factorial(n - 1);
  const totalNecklace = Math.max(1, factorial(n - 1) / 2);

  // SVG Geometry
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const tableRadius = 88;
  const seatRadius = 114;

  // Angle step for each seat (top seat is at -90 degrees)
  const angleStep = (2 * Math.PI) / n;

  return (
    <ExpandableDemo id="circular-permutation-demo">
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4 bg-card/40">
        {/* Controls header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-6">
            <ParamSlider
              label={
                <span>
                  元素数 <InlineMath tex="n" />
                </span>
              }
              value={n}
              min={3}
              max={5}
              step={1}
              digits={0}
              onChange={handleNChange}
            />
            <Checkbox
              label="项链模式（允许翻面）"
              checked={necklaceMode}
              onChange={handleModeChange}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-border/40 transition-colors"
            >
              {isPlaying ? "⏸ 暂停" : "▶ 自动旋转"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-muted hover:text-text-primary hover:bg-border/40 transition-colors"
            >
              复位
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Table */}
          <div className="lg:col-span-5 flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center p-2 rounded-xl bg-bg-elevated/40 border border-border/50 w-full max-w-[320px]">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-auto select-none"
                style={{ maxHeight: "300px" }}
              >
                {/* Table Surface */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={tableRadius}
                  className="fill-bg-elevated stroke-border"
                  strokeWidth="2"
                />
                {/* Inner decorative rim */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={tableRadius - 18}
                  fill="none"
                  className="stroke-border/40"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Center table label */}
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  className="fill-muted text-[11px] font-sans"
                >
                  {necklaceMode ? "项链 / 圆桌" : "圆桌"}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  className="fill-text-primary font-mono text-[13px] font-semibold"
                >
                  {currentClass.join(necklaceMode && isFlipped ? "⤹" : " → ")}
                </text>

                {/* Fixed Seat Indicators (Seat 1, 2, ..., n) */}
                {Array.from({ length: n }).map((_, i) => {
                  const angle = -Math.PI / 2 + i * angleStep;
                  const sx = cx + (tableRadius - 28) * Math.cos(angle);
                  const sy = cy + (tableRadius - 28) * Math.sin(angle);
                  return (
                    <g key={`seat-label-${i}`}>
                      <circle
                        cx={sx}
                        cy={sy}
                        r="9"
                        className="fill-bg-card stroke-border/60"
                        strokeWidth="1"
                      />
                      <text
                        x={sx}
                        y={sy + 3.5}
                        textAnchor="middle"
                        className="fill-muted text-[10px] font-mono font-bold"
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Rotating Elements Group */}
                <g
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${rotationStep * (360 / n)}deg) ${
                      isFlipped ? "scale(-1, 1)" : ""
                    }`,
                    transition:
                      "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  {currentClass.map((symbol, i) => {
                    const angle = -Math.PI / 2 + i * angleStep;
                    const ex = cx + seatRadius * Math.cos(angle);
                    const ey = cy + seatRadius * Math.sin(angle);
                    const color = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.A;

                    return (
                      <g key={`elem-${symbol}-${i}`}>
                        {/* Connecting line to center */}
                        <line
                          x1={cx + (tableRadius - 10) * Math.cos(angle)}
                          y1={cy + (tableRadius - 10) * Math.sin(angle)}
                          x2={ex}
                          y2={ey}
                          stroke={color.border}
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                          opacity="0.6"
                        />
                        {/* Element Badge */}
                        <circle
                          cx={ex}
                          cy={ey}
                          r="18"
                          fill="var(--color-bg-card)"
                          stroke={color.border}
                          strokeWidth="2.5"
                          className="drop-shadow-sm"
                        />
                        {/* Maintain upright text even when parent rotated */}
                        <text
                          x={ex}
                          y={ey + 5}
                          textAnchor="middle"
                          fill={color.text}
                          className="font-mono text-[15px] font-bold"
                          style={{
                            transformOrigin: `${ex}px ${ey}px`,
                            transform: `${isFlipped ? "scale(-1, 1)" : ""} rotate(${
                              -rotationStep * (360 / n)
                            }deg)`,
                            transition:
                              "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        >
                          {symbol}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Reading direction compass pointer at Seat 1 */}
                <path
                  d={`M ${cx - 14} 18 A ${seatRadius + 24} ${seatRadius + 24} 0 0 1 ${cx + 14} 18`}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 6 6"
                    refX="4"
                    refY="3"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--color-accent)" />
                  </marker>
                </defs>
              </svg>
            </div>

            {/* Rotation and Flip Control Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setRotationStep((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs text-text-primary hover:border-accent hover:text-accent transition-colors"
                title="逆时针旋转一位"
              >
                ⟲ 逆时针
              </button>
              <button
                type="button"
                onClick={() => setRotationStep((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs text-text-primary hover:border-accent hover:text-accent transition-colors"
                title="顺时针旋转一位"
              >
                ⟳ 顺时针
              </button>
              <button
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  isFlipped
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-border bg-bg-card text-text-primary hover:border-accent"
                }`}
                title="沿垂直中轴翻面查看镜像"
              >
                ⇄ 翻面镜像 {isFlipped ? "(已翻面)" : ""}
              </button>
            </div>
          </div>

          {/* Right Column: Breakdown & Classes */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Formula & Calculation Box */}
            <div className="p-3.5 rounded-lg border border-border bg-bg-elevated/20 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  {necklaceMode ? "项链排列计数公式" : "圆排列计数公式"}
                </span>
                <span className="text-xs font-mono text-muted">
                  总线形排列数 <InlineMath tex={`n! = ${totalLinear}`} />
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-1 border-t border-border/40">
                {necklaceMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">总项链数：</span>
                    <span className="font-mono font-semibold text-accent text-base">
                      {totalNecklace}
                    </span>
                    <span className="text-xs text-muted">
                      <InlineMath
                        tex={`= \\dfrac{n!}{2n} = \\dfrac{(${n}-1)!}{2} = \\dfrac{${totalLinear}}{${2 * n}} = ${totalNecklace}`}
                      />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">总圆排列数：</span>
                    <span className="font-mono font-semibold text-accent text-base">
                      {totalCircular}
                    </span>
                    <span className="text-xs text-muted">
                      <InlineMath
                        tex={`= (${n}-1)! = \\dfrac{n!}{n} = \\dfrac{${totalLinear}}{${n}} = ${totalCircular}`}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Equivalence breakdown for Current Selection */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  当前等价类包含的{" "}
                  <span className="font-mono text-accent font-bold">
                    {necklaceMode ? 2 * n : n}
                  </span>{" "}
                  种等价线形读序：
                </span>
                <span className="text-[11px] text-muted">
                  （点击任意一项切换视角）
                </span>
              </div>

              {/* Forward Rotations */}
              <div className="flex flex-col gap-1">
                {necklaceMode && (
                  <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                    <span>↻ 正面顺时针旋转（{n} 种）</span>
                    {!isFlipped && (
                      <span className="text-[10px] text-accent font-sans">
                        [当前正面]
                      </span>
                    )}
                  </span>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {forwardRotations.map((perm, idx) => {
                    const activeIdx = ((-rotationStep % n) + n) % n;
                    const isCurrent = !isFlipped && activeIdx === idx;
                    const str = perm.join("");
                    return (
                      <button
                        key={`fwd-rot-${str}-${idx}`}
                        type="button"
                        onClick={() => {
                          setIsFlipped(false);
                          handleRotateToIdx(idx);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                          isCurrent
                            ? "border-accent bg-accent/15 text-accent shadow-sm"
                            : "border-border/60 bg-bg-elevated/30 text-text-primary hover:border-border hover:bg-bg-elevated/60"
                        }`}
                      >
                        <span className="text-[10px] text-muted">
                          从 {idx + 1} 号位起
                        </span>
                        <span className="font-mono font-bold tracking-wider text-xs sm:text-sm">
                          {str}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reflected Rotations (only in necklace mode) */}
              {necklaceMode && (
                <div className="flex flex-col gap-1 pt-1.5 border-t border-border/30">
                  <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                    <span>⇄ 翻面镜像读序（{n} 种）</span>
                    {isFlipped && (
                      <span className="text-[10px] text-accent font-sans">
                        [当前已翻面]
                      </span>
                    )}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {reflectedRotations.map((perm, idx) => {
                      const activeIdx = ((-rotationStep % n) + n) % n;
                      const isCurrent = isFlipped && activeIdx === idx;
                      const str = perm.join("");
                      return (
                        <button
                          key={`rev-rot-${str}-${idx}`}
                          type="button"
                          onClick={() => {
                            setIsFlipped(true);
                            handleRotateToIdx(idx);
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                            isCurrent
                              ? "border-accent bg-accent/15 text-accent shadow-sm"
                              : "border-border/60 bg-bg-elevated/30 text-text-primary hover:border-border hover:bg-bg-elevated/60"
                          }`}
                        >
                          <span className="text-[10px] text-muted">
                            镜像 {idx + 1} 位起
                          </span>
                          <span className="font-mono font-bold tracking-wider text-xs sm:text-sm">
                            {str}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* All Distinct Classes Selector */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  全部{" "}
                  <span className="font-mono text-accent font-bold">
                    {necklaceMode ? totalNecklace : totalCircular}
                  </span>{" "}
                  个独立{necklaceMode ? "项链排列" : "圆排列"}（固定 A
                  开头代表元）：
                </span>
                <span className="text-[11px] text-muted">
                  （点击切换圆桌布局）
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1 border border-border/40 rounded-md bg-bg-elevated/20">
                {classes.map((cls, idx) => {
                  const isSelected = selectedClassIndex === idx;
                  const str = cls.join("");
                  return (
                    <button
                      key={`class-${str}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedClassIndex(idx);
                        setRotationStep(0);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                        isSelected
                          ? "bg-accent text-white shadow-sm"
                          : "bg-bg-card border border-border text-text-primary hover:border-accent/60"
                      }`}
                    >
                      {str}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
