import React, { useState, useEffect, useRef, useMemo } from "react";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import KdeWindowShell from "../framework/KdeWindowShell";
import InteractiveLayout from "../framework/InteractiveLayout";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import PresetSelector from "../framework/PresetSelector";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import KdeButton from "../framework/KdeButton";
import KdeInput from "../framework/KdeInput";
import KdeButtonGroup from "../framework/KdeButtonGroup";
import KdeProgressBar from "../framework/KdeProgressBar";
import KdeMessageBar from "../framework/KdeMessageBar";
import CodePlayground from "../framework/CodePlayground";

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

const VIEW_OPTIONS: readonly KdeTabOption<"cbn" | "cbv" | "code_sandbox">[] = [
  { id: "cbn", label: "Call-by-Name (正常序 / 惰性求值)" },
  { id: "cbv", label: "Call-by-Value (应用序 / 严格求值)" },
  { id: "code_sandbox", label: "TS λ 解释器沙盒" },
];

const TS_PLAYGROUND_CODE = `// 纯函数式 TypeScript 无类型 λ 演算微型解释器
type Term =
  | { tag: "Var"; name: string }
  | { tag: "Abs"; param: string; body: Term }
  | { tag: "App"; fn: Term; arg: Term };

const Var = (name: string): Term => ({ tag: "Var", name });
const Abs = (param: string, body: Term): Term => ({ tag: "Abs", param, body });
const App = (fn: Term, arg: Term): Term => ({ tag: "App", fn, arg });

function freeVars(t: Term): Set<string> {
  if (t.tag === "Var") return new Set([t.name]);
  if (t.tag === "Abs") {
    const s = freeVars(t.body);
    s.delete(t.param);
    return s;
  }
  const s = freeVars(t.fn);
  freeVars(t.arg).forEach((v) => s.add(v));
  return s;
}

function subst(t: Term, x: string, s: Term): Term {
  if (t.tag === "Var") return t.name === x ? s : t;
  if (t.tag === "App") return App(subst(t.fn, x, s), subst(t.arg, x, s));
  if (t.param === x) return t;
  const sFVs = freeVars(s);
  if (!sFVs.has(t.param)) return Abs(t.param, subst(t.body, x, s));
  let fresh = t.param + "'";
  while (sFVs.has(fresh) || freeVars(t.body).has(fresh)) fresh += "'";
  const renamedBody = subst(t.body, t.param, Var(fresh));
  return Abs(fresh, subst(renamedBody, x, s));
}

function evalCBN(t: Term): Term {
  if (t.tag === "App") {
    const fn = evalCBN(t.fn);
    if (fn.tag === "Abs") return evalCBN(subst(fn.body, fn.param, t.arg));
    return App(fn, t.arg);
  }
  return t;
}

const TRUE = Abs("x", Abs("y", Var("x")));
const FALSE = Abs("x", Abs("y", Var("y")));
const AND = Abs("p", Abs("q", App(App(Var("p"), Var("q")), Var("p"))));

const result = evalCBN(App(App(AND, TRUE), FALSE));
console.log("AND TRUE FALSE 规约求值结果:", JSON.stringify(result));
`;

export default function LambdaReductionDiagram() {
  const [viewMode, setViewMode] = useState<"cbn" | "cbv" | "code_sandbox">(
    "cbn",
  );
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
    setPresetKey("bool_and");
    setRawInput(PRESETS[0].code);
    setParseError(null);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setViewMode("cbn");
    setStrategy("CBN");
  };

  const handleTabChange = (val: "cbn" | "cbv" | "code_sandbox") => {
    setViewMode(val);
    if (val === "cbn") setStrategy("CBN");
    else if (val === "cbv") setStrategy("CBV");
  };

  return (
    <AutoMath>
      <ExpandableDemo id="lambda-reduction-stepper">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · λ-CALCULUS"
          mark="λ"
          modeTag="DENSE-DOCK"
          title="无类型 λ 演算单步归约与求值策略探针"
        >
          <InteractiveLayout
            preset="dense-dock"
            top={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--kde-muted)]">
                    求值策略：
                  </span>
                  <KdeTabs
                    onChange={handleTabChange}
                    options={VIEW_OPTIONS}
                    size="sm"
                    value={viewMode}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <KdeBadge
                    variant={
                      isDivergent
                        ? "danger"
                        : isFinished
                          ? "success"
                          : "primary"
                    }
                  >
                    {isDivergent
                      ? "⚠️ 发散振荡态"
                      : isFinished
                        ? "✅ 达成正规型"
                        : "⚡ 归约进行中"}
                  </KdeBadge>
                </div>
              </div>
            }
            main={
              <div className="relative flex h-[var(--demo-height,28rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--kde-border)] bg-[var(--kde-canvas)] p-6 shadow-inner">
                <CanvasToolbar onReset={handleReset} />

                {viewMode === "code_sandbox" ? (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                    <CodePlayground
                      code={TS_PLAYGROUND_CODE}
                      description="纯 TypeScript 实现的 λ 演算 AST、自由变量分析、捕获规避代换与单步规约求值器。"
                      lang="ts"
                      maxHeight="20rem"
                      title="TypeScript λ 解释器在线沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Stepper Toolbar */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kde-border)] pb-3 pr-12">
                      <KdeButtonGroup attached size="xs">
                        <KdeButton
                          size="xs"
                          disabled={currentStepIndex <= 0}
                          onClick={() => setCurrentStepIndex(0)}
                          title="回到初始状态"
                        >
                          ⏮ 初始
                        </KdeButton>
                        <KdeButton
                          size="xs"
                          disabled={currentStepIndex <= 0}
                          onClick={() =>
                            setCurrentStepIndex((prev) => Math.max(0, prev - 1))
                          }
                          title="单步回退"
                        >
                          ◀ 单步回退
                        </KdeButton>
                        <KdeButton
                          size="xs"
                          variant={isPlaying ? "warning" : "primary"}
                          disabled={isFinished}
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? "⏸ 暂停" : "▶ 自动步进"}
                        </KdeButton>
                        <KdeButton
                          size="xs"
                          disabled={isFinished}
                          onClick={() =>
                            setCurrentStepIndex((prev) =>
                              Math.min(trace.length - 1, prev + 1),
                            )
                          }
                          title="单步步进"
                        >
                          单步步进 ▶
                        </KdeButton>
                      </KdeButtonGroup>

                      {/* Step Counter Badge & Progress */}
                      <div className="flex items-center gap-2.5">
                        <KdeProgressBar
                          steps={trace.length}
                          value={currentStepIndex + 1}
                          size="sm"
                          className="w-28"
                          showLabel={false}
                        />
                        <span className="font-mono text-xs font-semibold text-[var(--kde-muted)]">
                          步数：{currentStepIndex + 1} / {trace.length}
                        </span>
                        {isFinished ? (
                          <KdeBadge
                            variant={isDivergent ? "danger" : "success"}
                          >
                            {isDivergent
                              ? "⚠️ 发散振荡态"
                              : "✅ 达成正规型 (Normal Form)"}
                          </KdeBadge>
                        ) : (
                          <KdeBadge variant="primary">⚡ 归约进行中</KdeBadge>
                        )}
                      </div>
                    </div>

                    {/* Stepper Main Display Area */}
                    <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto text-center">
                      {parsedTerm && currentStep ? (
                        <div className="space-y-4 py-2">
                          <div className="text-xs font-semibold text-[var(--kde-muted)]">
                            {currentStep.description}
                          </div>

                          {/* Main Term Rendering with KaTeX */}
                          <div className="flex items-center justify-center overflow-x-auto px-4 py-3">
                            <div className="rounded-2xl border border-[var(--kde-border)] bg-[var(--kde-raised)] px-6 py-4 shadow-lg backdrop-blur-md">
                              <div className="font-mono text-lg font-bold text-[var(--kde-ink)] sm:text-xl">
                                {`$${termToLatex(currentStep.term)}$`}
                              </div>
                            </div>
                          </div>

                          {/* Redex Indicator Banner */}
                          {currentStep.redex && (
                            <div className="mx-auto max-w-lg">
                              <KdeMessageBar
                                variant="warning"
                                mode="inline"
                                title="活动 Redex："
                              >
                                <span className="font-mono font-bold">
                                  {`$(\\lambda ${currentStep.redex.param}.\\, ${termToLatex(
                                    currentStep.redex.body,
                                  )}) \\; ${termToLatex(currentStep.redex.arg)}$`}
                                </span>
                              </KdeMessageBar>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mx-auto max-w-md">
                          <KdeMessageBar variant="danger" mode="card">
                            表达式语法解析失败，请检查括号与形参格式。
                          </KdeMessageBar>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
              </div>
            }
            side={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <KdeCard title="预设 λ 运算与理论实验" variant="dense">
                  <PresetSelector
                    layout="vertical"
                    size="xs"
                    onChange={handlePresetChange}
                    options={PRESETS.map((p) => ({
                      id: p.key,
                      label: p.label,
                      description: p.desc,
                    }))}
                    value={presetKey}
                  />
                </KdeCard>

                <KdeCard title="表达式源码输入与解析" variant="dense">
                  <div className="space-y-2 text-xs">
                    <KdeInput
                      label="支持 \x. y 或 λx. y："
                      error={parseError}
                      mono
                      size="xs"
                      value={rawInput}
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
                    />
                  </div>
                </KdeCard>

                <KdeCard title="活动 Redex 与代换剖析" variant="dense">
                  <div className="space-y-2 text-xs">
                    {currentStep?.redex ? (
                      <>
                        <div className="p-1.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)] overflow-x-auto">
                          {`$[${currentStep.redex.param} \\mapsto ${termToLatex(
                            currentStep.redex.arg,
                          )}]$`}
                        </div>
                        <div className="text-[11px] text-[var(--kde-muted)]">
                          目标：{`$${termToLatex(currentStep.redex.body)}$`}
                        </div>
                      </>
                    ) : (
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                        ✅ 达成最终正规型 (Normal Form)
                      </div>
                    )}
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KdeCard title="当前归约步骤形式化代换剖析">
                  <div className="text-xs text-[var(--kde-ink)]">
                    {currentStep?.redex ? (
                      <div className="space-y-1.5">
                        <div>
                          代换操作：
                          <span className="font-semibold text-[var(--kde-accent)]">
                            {`$[${currentStep.redex.param} \\mapsto ${termToLatex(
                              currentStep.redex.arg,
                            )}]$`}
                          </span>
                        </div>
                        <div>
                          目标函数体：
                          {`$${termToLatex(currentStep.redex.body)}$`}
                        </div>
                        <div className="pt-1 text-[11px] leading-relaxed text-[var(--kde-muted)]">
                          💡
                          捕获规避代换保证自由变量不会与函数体内部的同名绑定形参发生误冲突。
                        </div>
                      </div>
                    ) : (
                      <div className="text-[var(--kde-muted)]">
                        当前项已经不存在任何可归约项（{"$\\text{Redex}$"}
                        ），已达到最终正规型（{"$\\text{Normal Form}$"}）。
                      </div>
                    )}
                  </div>
                </KdeCard>

                <KdeCard
                  title={
                    strategy === "CBN"
                      ? "Call-by-Name 正常序行为特征"
                      : "Call-by-Value 应用序行为特征"
                  }
                >
                  <div className="text-xs leading-relaxed text-[var(--kde-ink)]">
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
                </KdeCard>
              </div>
            }
          />
        </KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
