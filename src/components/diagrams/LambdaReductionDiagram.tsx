import React, { useState, useEffect, useRef, useMemo } from "react";
import { AutoMath } from "../framework/AutoMath";
import CapsuleTabs from "../framework/CapsuleTabs";
import PresetSelector from "../framework/PresetSelector";
import ExpandableDemo from "../framework/ExpandableDemo";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";

// ============================================================================
// 1. Lambda Calculus AST, Parser, and Stepper Engine
// ============================================================================

export type Term =
  | { type: "var"; name: string }
  | { type: "abs"; param: string; body: Term }
  | { type: "app"; left: Term; right: Term };

interface RedexInfo {
  left: Term;
  param: string;
  body: Term;
  arg: Term;
  substituted: Term;
  path: ("left" | "right" | "body")[];
}

interface Step {
  term: Term;
  redex?: RedexInfo;
  description: string;
}

// Compute set of free variables FV(t)
function freeVars(t: Term): Set<string> {
  switch (t.type) {
    case "var":
      return new Set([t.name]);
    case "abs": {
      const s = freeVars(t.body);
      s.delete(t.param);
      return s;
    }
    case "app": {
      const s1 = freeVars(t.left);
      const s2 = freeVars(t.right);
      const res = new Set(s1);
      s2.forEach((v) => res.add(v));
      return res;
    }
  }
}

// Generate fresh variable name avoiding a forbidden set
function freshVar(base: string, forbidden: Set<string>): string {
  let name = base;
  let counter = 1;
  while (forbidden.has(name)) {
    name = `${base}${counter}`;
    counter++;
  }
  return name;
}

// Capture-avoiding substitution [x -> s] t
export function substitute(t: Term, x: string, s: Term): Term {
  switch (t.type) {
    case "var":
      return t.name === x ? s : t;
    case "app":
      return {
        type: "app",
        left: substitute(t.left, x, s),
        right: substitute(t.right, x, s),
      };
    case "abs": {
      if (t.param === x) {
        // x is shadowed by this abstraction's parameter
        return t;
      }
      const sFVs = freeVars(s);
      if (!sFVs.has(t.param)) {
        // Safe case: parameter is not in FV(s)
        return {
          type: "abs",
          param: t.param,
          body: substitute(t.body, x, s),
        };
      } else {
        // Variable capture danger! Must alpha-rename parameter
        const allForbidden = new Set<string>();
        sFVs.forEach((v) => allForbidden.add(v));
        freeVars(t.body).forEach((v) => allForbidden.add(v));
        allForbidden.add(x);

        const newParam = freshVar(t.param, allForbidden);
        const renamedBody = substitute(t.body, t.param, {
          type: "var",
          name: newParam,
        });
        return {
          type: "abs",
          param: newParam,
          body: substitute(renamedBody, x, s),
        };
      }
    }
  }
}

// Check if a term is a value (in standard Call-by-Value semantics, values are abstractions or free variables)
function isValue(t: Term): boolean {
  return t.type === "abs" || t.type === "var";
}

// One step reduction under Call-by-Name (Normal Order / Lazy)
function stepCBN(
  t: Term,
  path: ("left" | "right" | "body")[] = [],
): { term: Term; redex: RedexInfo } | null {
  if (t.type === "app") {
    if (t.left.type === "abs") {
      // Outermost Beta-redex found!
      const sub = substitute(t.left.body, t.left.param, t.right);
      return {
        term: sub,
        redex: {
          left: t.left,
          param: t.left.param,
          body: t.left.body,
          arg: t.right,
          substituted: sub,
          path,
        },
      };
    }
    // Try reducing left first
    const leftRes = stepCBN(t.left, [...path, "left"]);
    if (leftRes) {
      return {
        term: { type: "app", left: leftRes.term, right: t.right },
        redex: leftRes.redex,
      };
    }
    // Then try reducing right
    const rightRes = stepCBN(t.right, [...path, "right"]);
    if (rightRes) {
      return {
        term: { type: "app", left: t.left, right: rightRes.term },
        redex: rightRes.redex,
      };
    }
  } else if (t.type === "abs") {
    // Under full normal order, we also reduce inside abstraction body
    const bodyRes = stepCBN(t.body, [...path, "body"]);
    if (bodyRes) {
      return {
        term: { type: "abs", param: t.param, body: bodyRes.term },
        redex: bodyRes.redex,
      };
    }
  }
  return null;
}

// One step reduction under Call-by-Value (Applicative Order / Strict)
function stepCBV(
  t: Term,
  path: ("left" | "right" | "body")[] = [],
): { term: Term; redex: RedexInfo } | null {
  if (t.type === "app") {
    if (!isValue(t.left)) {
      const leftRes = stepCBV(t.left, [...path, "left"]);
      if (leftRes) {
        return {
          term: { type: "app", left: leftRes.term, right: t.right },
          redex: leftRes.redex,
        };
      }
    }
    if (!isValue(t.right)) {
      const rightRes = stepCBV(t.right, [...path, "right"]);
      if (rightRes) {
        return {
          term: { type: "app", left: t.left, right: rightRes.term },
          redex: rightRes.redex,
        };
      }
    }
    if (t.left.type === "abs" && isValue(t.right)) {
      const sub = substitute(t.left.body, t.left.param, t.right);
      return {
        term: sub,
        redex: {
          left: t.left,
          param: t.left.param,
          body: t.left.body,
          arg: t.right,
          substituted: sub,
          path,
        },
      };
    }
  }
  return null;
}

// Stringifier with LaTeX formatting
export function termToLatex(
  t: Term,
  parentType?: "app-left" | "app-right" | "abs",
): string {
  switch (t.type) {
    case "var":
      return t.name;
    case "abs": {
      const str = `\\lambda ${t.param}.\\, ${termToLatex(t.body, "abs")}`;
      return parentType === "app-left" || parentType === "app-right"
        ? `(${str})`
        : str;
    }
    case "app": {
      const lStr = termToLatex(t.left, "app-left");
      const rStr = termToLatex(t.right, "app-right");
      const str = `${lStr} \\; ${rStr}`;
      return parentType === "app-right" ? `(${str})` : str;
    }
  }
}

// Pure text formatter for diagnostics and human readability
export function termToString(
  t: Term,
  parentType?: "app-left" | "app-right" | "abs",
): string {
  switch (t.type) {
    case "var":
      return t.name;
    case "abs": {
      const str = `λ${t.param}. ${termToString(t.body, "abs")}`;
      return parentType === "app-left" || parentType === "app-right"
        ? `(${str})`
        : str;
    }
    case "app": {
      const lStr = termToString(t.left, "app-left");
      const rStr = termToString(t.right, "app-right");
      const str = `${lStr} ${rStr}`;
      return parentType === "app-right" ? `(${str})` : str;
    }
  }
}

// Simple Tokenizer and Recursive Descent Parser
export function parseLambda(input: string): Term {
  const cleaned = input
    .replace(/\\/g, "λ")
    .replace(/->/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  let pos = 0;

  function peek(): string | null {
    while (pos < cleaned.length && cleaned[pos] === " ") pos++;
    return pos < cleaned.length ? cleaned[pos] : null;
  }

  function getChar(): string {
    const ch = peek()!;
    pos++;
    return ch;
  }

  function parseAtom(): Term {
    const ch = peek();
    if (!ch) throw new Error("意外到达表达式末尾");

    if (ch === "(") {
      getChar(); // '('
      const term = parseApp();
      const next = peek();
      if (next !== ")") throw new Error("缺少匹配的右括号 ')'");
      getChar(); // ')'
      return term;
    }

    if (ch === "λ") {
      getChar(); // 'λ'
      // Parse param name
      let param = "";
      while (peek() && /[a-zA-Z0-9_]/.test(peek()!)) {
        param += getChar();
      }
      if (!param) throw new Error("λ 抽象缺少形参变量名");

      const dot = peek();
      if (dot === ".") {
        getChar(); // '.'
      } else if (dot === "λ" || /[a-zA-Z0-9_]/.test(dot || "")) {
        // Multi-param shorthand \x y. t -> \x. \y. t
        const body = parseAtom();
        return { type: "abs", param, body };
      }

      const body = parseApp();
      return { type: "abs", param, body };
    }

    // Variable
    let name = "";
    while (peek() && /[a-zA-Z0-9_]/.test(peek()!)) {
      name += getChar();
    }
    if (name) {
      return { type: "var", name };
    }

    throw new Error(`无法解析的符号: '${ch}'`);
  }

  function parseApp(): Term {
    let left = parseAtom();
    while (true) {
      const next = peek();
      if (!next || next === ")") break;
      const right = parseAtom();
      left = { type: "app", left, right };
    }
    return left;
  }

  const result = parseApp();
  if (pos < cleaned.length) {
    throw new Error(`未解析完全的尾部内容: '${cleaned.slice(pos)}'`);
  }
  return result;
}

// Generate execution trace (up to maxSteps to avoid infinite loops)
function generateTrace(
  initial: Term,
  strategy: "CBN" | "CBV",
  maxSteps = 40,
): Step[] {
  const steps: Step[] = [
    { term: initial, description: "初始输入项 (Initial Term)" },
  ];
  let current = initial;
  const seenHashes = new Set<string>();
  seenHashes.add(termToString(initial));

  for (let i = 0; i < maxSteps; i++) {
    const stepResult = strategy === "CBN" ? stepCBN(current) : stepCBV(current);
    if (!stepResult) {
      break;
    }
    const { term: next, redex } = stepResult;
    const hash = termToString(next);
    if (seenHashes.has(hash)) {
      steps.push({
        term: next,
        redex,
        description: "⚠️ 检测到进入循环震荡（Divergence / Ω 发散态）",
      });
      break;
    }
    seenHashes.add(hash);

    steps.push({
      term: next,
      redex,
      description: `β-归约：[${redex.param} ↦ ${termToString(redex.arg)}]`,
    });
    current = next;
  }

  return steps;
}

// ============================================================================
// 2. Presets Definition
// ============================================================================

const PRESETS = [
  {
    key: "bool_and",
    label: "1. 逻辑与 AND TRUE FALSE",
    desc: "验证 Church 布尔乘积演算",
    code: "(\\p. \\q. p q p) (\\x. \\y. x) (\\x. \\y. y)",
  },
  {
    key: "bool_or",
    label: "2. 逻辑或 OR FALSE TRUE",
    desc: "验证 Church 逻辑选择分支",
    code: "(\\p. \\q. p p q) (\\x. \\y. y) (\\x. \\y. x)",
  },
  {
    key: "nat_plus",
    label: "3. 自然数加法 PLUS 1 1",
    desc: "Church 数函数复合累加",
    code: "(\\m. \\n. \\f. \\x. m f (n f x)) (\\f. \\x. f x) (\\f. \\x. f x)",
  },
  {
    key: "nat_mult",
    label: "4. 自然数乘法 MULT 2 1",
    desc: "高阶函数映射复合",
    code: "(\\m. \\n. \\f. m (n f)) (\\f. \\x. f (f x)) (\\f. \\x. f x)",
  },
  {
    key: "omega_diverge",
    label: "5. 死循环发散 Ω 组合子",
    desc: "自复制项无穷无尽的规约震荡",
    code: "(\\x. x x) (\\x. x x)",
  },
  {
    key: "lazy_short_circuit",
    label: "6. 惰性短路求值 (K I Ω)",
    desc: "对比 Call-by-Name 与 Call-by-Value 的生死差异",
    code: "(\\x. \\y. x) (\\z. z) ((\\x. x x) (\\x. x x))",
  },
];

const STRATEGY_OPTIONS = [
  { id: "CBN", label: "Call-by-Name (正常序 / 惰性求值)" },
  { id: "CBV", label: "Call-by-Value (应用序 / 严格求值)" },
];

export default function LambdaReductionDiagram() {
  const [strategy, setStrategy] = useState<"CBN" | "CBV">("CBN");
  const [presetKey, setPresetKey] = useState<string>("bool_and");
  const [rawInput, setRawInput] = useState<string>(PRESETS[0].code);
  const [parseError, setParseError] = useState<string | null>(null);

  // Stepper state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse term & generate execution steps
  const { parsedTerm, trace } = useMemo(() => {
    try {
      const term = parseLambda(rawInput);
      const steps = generateTrace(term, strategy);
      return { parsedTerm: term, trace: steps };
    } catch {
      return { parsedTerm: null, trace: [] };
    }
  }, [rawInput, strategy]);

  // Sync step index on preset or strategy change
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [presetKey, strategy, rawInput]);

  // Autoplay control
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, trace.length]);

  const currentStep = trace[currentStepIndex] || trace[0];
  const isFinished = trace.length > 0 && currentStepIndex === trace.length - 1;
  const isDivergent = trace.some((s) => s.description.includes("发散态"));

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    const p = PRESETS.find((item) => item.key === key);
    if (p) {
      setRawInput(p.code);
      setParseError(null);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  return (
    <AutoMath>
      <ExpandableDemo id="lambda-reduction-stepper">
        <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                无类型 λ 演算单步归约与求值策略探针
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ✨ <strong>单步观察计算的心跳</strong>：自由切换{" "}
                {"$\\text{Call-by-Name}$"} 与 {"$\\text{Call-by-Value}$"}
                ，探查可归约项（
                {"$\\text{Redex}$"}
                ）与代换展开
              </p>
            </div>
          </div>

          {/* Strategy Selector Tabs */}
          <div className="mb-4 overflow-x-auto pb-1">
            <CapsuleTabs
              onChange={(val) => setStrategy(val as "CBN" | "CBV")}
              options={STRATEGY_OPTIONS}
              value={strategy}
            />
          </div>

          {/* Preset Selector */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              精选 λ 运算与理论实验预设：
            </div>
            <PresetSelector
              onChange={handlePresetChange}
              options={PRESETS.map((p) => ({
                id: p.key,
                label: p.label,
                description: p.desc,
              }))}
              value={presetKey}
            />
          </div>

          {/* Custom Input Bar */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>表达式源码输入（支持 \x. y 或 λx. y）：</span>
              {parseError && (
                <span className="text-rose-500">{parseError}</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 transition focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setPresetKey("custom");
                  try {
                    parseLambda(e.target.value);
                    setParseError(null);
                  } catch (err: unknown) {
                    setParseError(
                      err instanceof Error ? err.message : String(err),
                    );
                  }
                }}
                placeholder="输入合法 λ 表达式，例如: (\x. \y. x) a b"
                type="text"
                value={rawInput}
              />
            </div>
          </div>

          {/* Visual Stepper Viewport Container */}
          <div className="relative mb-5 flex h-[var(--demo-height,20rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 p-6 shadow-inner dark:border-slate-800">
            <CanvasToolbar onReset={handleReset} />

            {/* Stepper Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex <= 0}
                  onClick={() => setCurrentStepIndex(0)}
                  title="回到初始状态"
                  type="button"
                >
                  ⏮ 初始
                </button>
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex <= 0}
                  onClick={() =>
                    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
                  }
                  title="单步回退"
                  type="button"
                >
                  ◀ 单步回退
                </button>
                <button
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    isPlaying
                      ? "bg-amber-600 text-white hover:bg-amber-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                  } disabled:opacity-40`}
                  disabled={isFinished}
                  onClick={() => setIsPlaying(!isPlaying)}
                  type="button"
                >
                  {isPlaying ? "⏸ 暂停" : "▶ 自动步进"}
                </button>
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={isFinished}
                  onClick={() =>
                    setCurrentStepIndex((prev) =>
                      Math.min(trace.length - 1, prev + 1),
                    )
                  }
                  title="单步步进"
                  type="button"
                >
                  单步步进 ▶
                </button>
              </div>

              {/* Step Counter Badge */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-400">
                  步数：{currentStepIndex + 1} / {trace.length}
                </span>
                {isFinished ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isDivergent
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {isDivergent
                      ? "⚠️ 发散振荡态"
                      : "✅ 达成正规型 (Normal Form)"}
                  </span>
                ) : (
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                    ⚡ 归约进行中
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Main Display Area */}
            <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto text-center">
              {parsedTerm && currentStep ? (
                <div className="space-y-4 py-2">
                  <div className="text-xs font-semibold text-slate-400">
                    {currentStep.description}
                  </div>

                  {/* Main Term Rendering with KaTeX */}
                  <div className="flex items-center justify-center overflow-x-auto px-4 py-3">
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 px-6 py-4 shadow-lg backdrop-blur-sm">
                      <div className="font-mono text-lg text-slate-100 sm:text-xl">
                        {`$${termToLatex(currentStep.term)}$`}
                      </div>
                    </div>
                  </div>

                  {/* Redex Indicator Banner */}
                  {currentStep.redex && (
                    <div className="mx-auto inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                      <span>活动 Redex：</span>
                      <span className="font-mono font-bold">
                        {`$(\\lambda ${currentStep.redex.param}.\\, ${termToLatex(
                          currentStep.redex.body,
                        )}) \\; ${termToLatex(currentStep.redex.arg)}$`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-rose-400">
                  表达式语法解析失败，请检查括号与形参格式。
                </div>
              )}
            </div>
            <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
          </div>

          {/* Diagnostics & Theoretical Comparison Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Card 1: Redex & Substitution Insight */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                当前归约步骤形式化代换剖析
              </div>
              <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                {currentStep?.redex ? (
                  <div className="space-y-1.5">
                    <div>
                      代换操作：
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {`$[${currentStep.redex.param} \\mapsto ${termToLatex(
                          currentStep.redex.arg,
                        )}]$`}
                      </span>
                    </div>
                    <div>
                      目标函数体：
                      {`$${termToLatex(currentStep.redex.body)}$`}
                    </div>
                    <div className="pt-1 text-[11px] leading-relaxed text-slate-500">
                      💡
                      捕获规避代换保证自由变量不会与函数体内部的同名绑定形参发生误冲突。
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    当前项已经不存在任何可归约项（
                    {"$\\text{Redex}$"}
                    ），已达到最终正规型（
                    {"$\\text{Normal Form}$"}
                    ）。
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Strategy Comparison Insight */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                求值策略（
                {strategy === "CBN"
                  ? "Call-by-Name 正常序"
                  : "Call-by-Value 应用序"}
                ）行为特征
              </div>
              <div className="mt-2 text-xs leading-relaxed text-indigo-800 dark:text-indigo-200">
                {strategy === "CBN" ? (
                  <p>
                    🚀 <strong>正常序（Call-by-Name）</strong>
                    ：优先归约最外层 Redex。参数在传入时
                    <strong>绝不提前求值</strong>
                    ，哪怕参数是发散死循环（如预设 6 中的 {"$\\Omega$"}
                    ），只要函数体内未读取该参数，程序即可
                    <strong>安全终止并短路返回</strong>！
                  </p>
                ) : (
                  <p>
                    ⚡ <strong>应用序（Call-by-Value）</strong>
                    ：函数调用前必须先将所有参数严格求值为最终值（
                    {"$\\text{Value}$"}
                    ）。若参数包含死循环，程序将立即发散无法终止。这是
                    C、Rust、JavaScript 等现代主流编程语言的底层执行模式。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ExpandableDemo>
    </AutoMath>
  );
}
