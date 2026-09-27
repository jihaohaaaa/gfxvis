import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import PresetSelector from "../framework/PresetSelector";

// ============================================================================
// Types & Presets for System F
// ============================================================================

export interface ReductionStep {
  phaseTitle: string;
  phaseBadge: string;
  badgeColor: string;
  expressionTex: string;
  actionDesc: string;
  ruleTex: string;
}

export interface SystemFPreset {
  id: string;
  label: string;
  desc: string;
  typeSignatureTex: string;
  termTex: string;
  insight: string;
  freeTheoremPropTex: string;
  freeTheoremEquationTex: string;
  generateSteps: (instType: string) => ReductionStep[];
}

const TYPE_OPTIONS = [
  { id: "Bool", label: "Bool (布尔类型)" },
  { id: "Nat", label: "Nat (自然数类型)" },
  { id: "String", label: "String (字符串类型)" },
  { id: "PolyId", label: "∀Y. Y → Y (自实例化非直谓类型)" },
];

const PRESETS: SystemFPreset[] = [
  {
    id: "id_poly",
    label: "1. 多态恒等子 (Polymorphic Identity)",
    desc: "最纯粹的参数多态函数：id = ΛX. λx:X. x",
    typeSignatureTex: "\\forall X.\\, X \\to X",
    termTex: "\\Lambda X.\\, \\lambda x:X.\\, x",
    insight:
      "多态恒等函数不仅在概念上适用于所有类型，而且在二阶演算中具有严格的两阶段求值：先传入具体类型 X 消除类型量词，再传入该类型的实体值进行普通 β-归约。",
    freeTheoremPropTex:
      "\\text{对任意类型 } A, B \\text{ 与任意映射 } g: A \\to B",
    freeTheoremEquationTex:
      "g \\circ (\\text{id}\\, [A]) \\equiv (\\text{id}\\, [B]) \\circ g",
    generateSteps: (instType: string) => {
      const typeTex =
        instType === "PolyId" ? "(\\forall Y.\\, Y \\to Y)" : instType;
      const sampleVal =
        instType === "Bool"
          ? "\\text{true}"
          : instType === "Nat"
            ? "42"
            : instType === "String"
              ? '\\text{"lambda"}'
              : "(\\Lambda Z.\\, \\lambda z:Z.\\, z)";

      return [
        {
          phaseTitle: "初始全称量化项与类型实参",
          phaseBadge: "未归约初态",
          badgeColor:
            "bg-slate-500/20 text-slate-300 border border-slate-500/40",
          expressionTex: `(\\Lambda X.\\, \\lambda x:X.\\, x) \\; [${typeTex}] \\; ${sampleVal}`,
          actionDesc: "准备执行二阶类型应用：将类型实参注入到全称类型抽象中。",
          ruleTex: "\\text{T-TApp / Type Application}",
        },
        {
          phaseTitle: "阶段一：二阶类型 β-归约 (Type Substitution)",
          phaseBadge: "类型代换完成",
          badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
          expressionTex: `(\\lambda x:${typeTex}.\\, x) \\; ${sampleVal}`,
          actionDesc: `类型变量 X 被全局具象化代换为 [X ↦ ${typeTex}]，类型抽象符 ΛX 消除，蜕变为一阶函数抽象。`,
          ruleTex:
            "(\\Lambda X.\\, t) \\; [T] \\longrightarrow_{\\beta_{\\text{type}}} [X \\mapsto T]t",
        },
        {
          phaseTitle: "阶段二：一阶值 β-归约 (Value Substitution)",
          phaseBadge: "达成正规型 (Normal Form)",
          badgeColor:
            "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
          expressionTex: sampleVal,
          actionDesc: `普通实参值 ${sampleVal} 代入形参 x，函数调用完成，产出最终结果。`,
          ruleTex:
            "(\\lambda x:T.\\, t) \\; v \\longrightarrow_{\\beta_{\\text{val}}} [x \\mapsto v]t",
        },
      ];
    },
  },
  {
    id: "impredicative",
    label: "2. 自应用与非直谓性 (Impredicative Self-Application)",
    desc: "全称类型作为自身的类型实参：id [∀Y. Y → Y] id",
    typeSignatureTex:
      "(\\forall Y.\\, Y \\to Y) \\to (\\forall Y.\\, Y \\to Y)",
    termTex:
      "(\\Lambda X.\\, \\lambda x:X.\\, x) \\; [\\forall Y.\\, Y \\to Y] \\; (\\Lambda Y.\\, \\lambda y:Y.\\, y)",
    insight:
      "非直谓性（Impredicativity）是 System F 最震撼的特征：被全称量词 ∀X 约束的类型域，竟然包含了包含 ∀ 自身的所有高阶多态类型！因此 id 可以将‘多态 id 自身的类型’作为类型参数传给自己。",
    freeTheoremPropTex:
      "\\text{自引用的良基性由 Girard 的可规约性候选者（Candidats de réductibilité）保证}",
    freeTheoremEquationTex:
      "\\text{id} \\; [\\forall Y.\\, Y \\to Y] \\; \\text{id} \\longrightarrow^* \\text{id}",
    generateSteps: () => [
      {
        phaseTitle: "初始全称量化项与多态类型实参",
        phaseBadge: "高阶非直谓注入",
        badgeColor:
          "bg-purple-500/20 text-purple-300 border border-purple-500/40",
        expressionTex:
          "(\\Lambda X.\\, \\lambda x:X.\\, x) \\; [\\forall Y.\\, Y \\to Y] \\; (\\Lambda Y.\\, \\lambda y:Y.\\, y)",
        actionDesc:
          "类型变量 X 接收的不是基底类型，而是高阶全称类型 (∀Y. Y → Y)。",
        ruleTex: "\\text{Impredicative Instantiation}",
      },
      {
        phaseTitle: "阶段一：高阶类型代换",
        phaseBadge: "多态类型消除",
        badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        expressionTex:
          "(\\lambda x:(\\forall Y.\\, Y \\to Y).\\, x) \\; (\\Lambda Y.\\, \\lambda y:Y.\\, y)",
        actionDesc:
          "形参 x 的类型被固定为多态签名 (∀Y. Y → Y)，参数为多态恒等子自身。",
        ruleTex: "[X \\mapsto \\forall Y.\\, Y \\to Y]",
      },
      {
        phaseTitle: "阶段二：值代换与恒等闭包还原",
        phaseBadge: "达成正规型 (Normal Form)",
        badgeColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        expressionTex: "\\Lambda Y.\\, \\lambda y:Y.\\, y",
        actionDesc:
          "值规约完成，输出项依然是多态恒等子本身，体现了非直谓代换的自洽性。",
        ruleTex: "\\beta\\text{-Reduction Complete}",
      },
    ],
  },
  {
    id: "church_bool",
    label: "3. 纯多态丘奇布尔值 (Church Boolean in System F)",
    desc: "Bool = ∀X. X → X → X 与条件分支选择",
    typeSignatureTex: "\\text{Bool} \\triangleq \\forall X.\\, X \\to X \\to X",
    termTex: "\\Lambda X.\\, \\lambda t:X.\\, \\lambda f:X.\\, t",
    insight:
      "在 System F 中无需引入任何 primitive 基础类型，布尔真假直接被编码为‘接收类型 X 并从两个类型为 X 的备选值中挑选第一个’的多态函数。",
    freeTheoremPropTex:
      "\\text{纯多态布尔函数无法泄露环境：要么总是返回第一个参数，要么总是返回第二个}",
    freeTheoremEquationTex:
      "\\forall b: \\text{Bool}, \\; g(b \\; [A] \\; v_1 \\; v_2) \\equiv b \\; [B] \\; (g \\, v_1) \\; (g \\, v_2)",
    generateSteps: (instType: string) => {
      const typeTex =
        instType === "PolyId" ? "(\\forall Y.\\, Y \\to Y)" : instType;
      const v1 = instType === "Bool" ? "\\text{true}" : "100";
      const v2 = instType === "Bool" ? "\\text{false}" : "0";

      return [
        {
          phaseTitle: "丘奇 TRUE 的类型实例化应用",
          phaseBadge: "Bool 具象化",
          badgeColor:
            "bg-slate-500/20 text-slate-300 border border-slate-500/40",
          expressionTex: `(\\Lambda X.\\, \\lambda t:X.\\, \\lambda f:X.\\, t) \\; [${typeTex}] \\; ${v1} \\; ${v2}`,
          actionDesc: `将通用二选一逻辑特化至返回类型 ${typeTex}。`,
          ruleTex: "\\text{T-TApp}",
        },
        {
          phaseTitle: "阶段一：二阶类型消去",
          phaseBadge: "类型特化完成",
          badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
          expressionTex: `(\\lambda t:${typeTex}.\\, \\lambda f:${typeTex}.\\, t) \\; ${v1} \\; ${v2}`,
          actionDesc:
            "两个分支参数的类型均被严格约束为统一的类型，消除了类型不一致的风险。",
          ruleTex: "[X \\mapsto " + typeTex + "]",
        },
        {
          phaseTitle: "阶段二：双参数值调用",
          phaseBadge: "达成正规型 (Normal Form)",
          badgeColor:
            "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
          expressionTex: v1,
          actionDesc: `条件分支执行完毕，确定性选中并返回首个分支值 ${v1}。`,
          ruleTex: "\\text{Branch 1 Selected}",
        },
      ];
    },
  },
  {
    id: "church_nat",
    label: "4. 纯多态丘奇自然数 (Church Numeral in System F)",
    desc: "Nat = ∀X. (X → X) → X → X 上的自迭代",
    typeSignatureTex:
      "\\text{Nat} \\triangleq \\forall X.\\, (X \\to X) \\to X \\to X",
    termTex:
      "\\Lambda X.\\, \\lambda s:(X \\to X).\\, \\lambda z:X.\\, s \\; (s \\; z)",
    insight:
      "自然数 2 在 System F 中是一个高阶全称量化函数：对任意类型 X，给定一个变换函数 s: X → X 与基底初值 z: X，将 s 作用于 z 恰好两次。",
    freeTheoremPropTex:
      "\\text{自然数的免费定理断言：对任意与 } s \\text{ 交换的态射 } g, \\text{ 迭代保持结构同态}",
    freeTheoremEquationTex:
      "g(n \\; [A] \\; s_A \\; z_A) \\equiv n \\; [B] \\; s_B \\; (g \\, z_A)",
    generateSteps: (instType: string) => {
      const typeTex =
        instType === "PolyId" ? "(\\forall Y.\\, Y \\to Y)" : instType;
      const succFn = instType === "Nat" ? "(+1)" : "\\text{succ}";
      const zeroVal = instType === "Nat" ? "0" : "\\text{zero}";

      return [
        {
          phaseTitle: "自然数 2 的多态实例化",
          phaseBadge: "Nat 迭代特化",
          badgeColor:
            "bg-slate-500/20 text-slate-300 border border-slate-500/40",
          expressionTex: `(\\Lambda X.\\, \\lambda s:(X \\to X).\\, \\lambda z:X.\\, s \\; (s \\; z)) \\; [${typeTex}] \\; ${succFn} \\; ${zeroVal}`,
          actionDesc: `指定迭代载体类型为 ${typeTex}。`,
          ruleTex: "\\text{Type Application on Church 2}",
        },
        {
          phaseTitle: "阶段一：消除类型抽象",
          phaseBadge: "函数特化",
          badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
          expressionTex: `(\\lambda s:(${typeTex} \\to ${typeTex}).\\, \\lambda z:${typeTex}.\\, s \\; (s \\; z)) \\; ${succFn} \\; ${zeroVal}`,
          actionDesc:
            "生成专属于该类型的二阶迭代器，类型系统在编译期锁定类型签名。",
          ruleTex: "[X \\mapsto " + typeTex + "]",
        },
        {
          phaseTitle: "阶段二：两次函数复合求值",
          phaseBadge: "达成正规型 (Normal Form)",
          badgeColor:
            "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
          expressionTex: `${succFn} \\; (${succFn} \\; ${zeroVal})`,
          actionDesc: "成功展开为两次后继函数调用的标准复合项。",
          ruleTex: "\\text{Double Function Composition}",
        },
      ];
    },
  },
  {
    id: "poly_pair",
    label: "5. 纯多态二元组 (Polymorphic Pair)",
    desc: "A × B 编码为 ∀R. (A → B → R) → R 连续传递风格 (CPS)",
    typeSignatureTex:
      "A \\times B \\triangleq \\forall R.\\, (A \\to B \\to R) \\to R",
    termTex:
      "\\Lambda A.\\, \\Lambda B.\\, \\lambda a:A.\\, \\lambda b:B.\\, (\\Lambda R.\\, \\lambda k:(A \\to B \\to R).\\, k \\; a \\; b)",
    insight:
      "System F 用全称量化完美模拟了连续传递风格（CPS）的积类型：一个元组 (a, b) 本质上是一个接收访问函数 k 并将 a 和 b 传给它的高阶多态调度器。",
    freeTheoremPropTex:
      "\\text{积类型的免费定理保证：元组投影视角 } \\text{fst} \\text{ 与 } \\text{snd} \\text{ 的独立性}",
    freeTheoremEquationTex:
      "\\text{fst} \\; (g_1 \\; a, \\, g_2 \\; b) \\equiv g_1 \\; (\\text{fst} \\; (a, b))",
    generateSteps: () => [
      {
        phaseTitle: "构造多态元组并请求投影 fst",
        phaseBadge: "CPS 积类型求值",
        badgeColor: "bg-slate-500/20 text-slate-300 border border-slate-500/40",
        expressionTex:
          "\\text{pair} \\; [\\text{Nat}] \\; [\\text{Bool}] \\; 42 \\; \\text{true} \\; [\\text{Nat}] \\; (\\lambda a:\\text{Nat}.\\, \\lambda b:\\text{Bool}.\\, a)",
        actionDesc: "将访问器 k 设为只返回首个元素 a 的投影函数。",
        ruleTex: "\\text{CPS Projection}",
      },
      {
        phaseTitle: "阶段一：双层类型代换完成",
        phaseBadge: "访问器类型对齐",
        badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        expressionTex:
          "(\\lambda k:(\\text{Nat} \\to \\text{Bool} \\to \\text{Nat}).\\, k \\; 42 \\; \\text{true}) \\; (\\lambda a:\\text{Nat}.\\, \\lambda b:\\text{Bool}.\\, a)",
        actionDesc:
          "返回结果类型 R 具象化为 Nat，元组内部存储的值与访问器类型完全对齐。",
        ruleTex: "[R \\mapsto \\text{Nat}]",
      },
      {
        phaseTitle: "阶段二：访问器捕获解构",
        phaseBadge: "达成正规型 (Normal Form)",
        badgeColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        expressionTex: "42",
        actionDesc: "成功提取首元素，完成了无基底类型依赖的纯多态积类型解构。",
        ruleTex: "\\text{fst Extracted Successfully}",
      },
    ],
  },
  {
    id: "free_theorems",
    label: "6. 免费定理与参数化 (Reynolds Parametricity)",
    desc: "定理免费拿：类型为 ∀X. X → X 的函数在数学上只能是 id！",
    typeSignatureTex:
      "f : \\forall X.\\, X \\to X \\implies f \\equiv \\text{id}",
    termTex: "\\Lambda X.\\, \\lambda x:X.\\, x",
    insight:
      "菲利普·瓦德勒（Philip Wadler）在经典论文《Theorems for Free!》中指出：因为函数 f 对类型 X 完全无知（不能做类型检查或特化），它没有任何手段制造或篡改 X 的值，唯一的可能就是原样返回输入！",
    freeTheoremPropTex:
      "\\text{Reynolds 关系参数化定理：对任何逻辑关系 } \\mathcal{R} \\subseteq A \\times B",
    freeTheoremEquationTex:
      "(x, y) \\in \\mathcal{R} \\implies (f \\; [A] \\; x, \\; f \\; [B] \\; y) \\in \\mathcal{R}",
    generateSteps: (instType: string) => {
      const typeTex =
        instType === "PolyId" ? "(\\forall Y.\\, Y \\to Y)" : instType;
      return [
        {
          phaseTitle: "自然性交换图条件 (Naturality Condition)",
          phaseBadge: "免费定理推导",
          badgeColor:
            "bg-amber-500/20 text-amber-300 border border-amber-500/40",
          expressionTex: `\\forall g: ${typeTex} \\to B, \\quad g \\circ (f \\; [${typeTex}]) \\equiv (f \\; [B]) \\circ g`,
          actionDesc:
            "无论函数 g 是什么，先进行 f 变换再应用 g，与先应用 g 再进行 f 变换，结果完全相等！",
          ruleTex: "\\text{Naturality Diagram}",
        },
        {
          phaseTitle: "令 g 为常数映射或特化投影",
          phaseBadge: "代数方程约束",
          badgeColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
          expressionTex: `g(f \\; [${typeTex}] \\; x) = f \\; [B] \\; (g \\; x)`,
          actionDesc:
            "由于该等式对所有可能存在的类型 B 与映射 g 均必须无条件成立，唯一的解就是 f x = x。",
          ruleTex: "\\text{Algebraic Uniqueness}",
        },
        {
          phaseTitle: "免费证明结论 (Theorem for Free)",
          phaseBadge: "唯一解锁定",
          badgeColor:
            "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
          expressionTex: `f \\; [${typeTex}] \\equiv \\text{id}_{${typeTex}}`,
          actionDesc:
            "仅仅凭借类型签名，无需翻阅一行实现代码，即可在数学上断言其函数行为！",
          ruleTex: "f \\equiv \\Lambda X.\\, \\lambda x:X.\\, x",
        },
      ];
    },
  },
];

const VIEW_OPTIONS = [
  { id: "two_phase", label: "两阶段二阶归约 (Two-Phase Reducer)" },
  { id: "free_theorem", label: "免费定理交换图 (Free Theorems)" },
];

export default function SystemFPolymorphismDiagram() {
  const [activePresetId, setActivePresetId] = useState<string>("id_poly");
  const [instType, setInstType] = useState<string>("Bool");
  const [viewMode, setViewMode] = useState<"two_phase" | "free_theorem">(
    "two_phase",
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const preset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
  const steps = preset.generateSteps(instType);
  const maxSteps = steps.length;
  const currentStep = steps[currentStepIndex] ?? steps[0];

  const handleReset = () => {
    setCurrentStepIndex(0);
  };

  const handlePresetChange = (id: string) => {
    setActivePresetId(id);
    setCurrentStepIndex(0);
  };

  return (
    <AutoMath>
      <ExpandableDemo id="system-f-polymorphism-explorer">
        <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                System F 参数多态与二阶两阶段求值探针
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ✨ <strong>二阶类型抽象、非直谓实例化与免费定理</strong>
                ：单步追踪类型代换与值代换，直观观测全称量化带来的强大表达力
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="mb-4 overflow-x-auto pb-1">
            <CapsuleTabs
              onChange={(val) =>
                setViewMode(val as "two_phase" | "free_theorem")
              }
              options={VIEW_OPTIONS}
              value={viewMode}
            />
          </div>

          {/* Preset Selector */}
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              精选 System F 经典多态演算与理论预设：
            </div>
            <PresetSelector
              onChange={handlePresetChange}
              options={PRESETS.map((p) => ({
                id: p.id,
                label: p.label,
                description: p.desc,
              }))}
              value={activePresetId}
            />
          </div>

          {/* Dynamic Type Instantiation Picker */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white/70 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>动态具象化类型实参注入 (Type Instantiation [X ↦ T])：</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                当前实参: [X ↦ {instType === "PolyId" ? "∀Y. Y → Y" : instType}]
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    instType === opt.id
                      ? "border border-indigo-500 bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                  onClick={() => {
                    setInstType(opt.id);
                    setCurrentStepIndex(0);
                  }}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Term & Type Overview Card */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  多态项全称类型签名 (Universal Type)
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {`$${preset.typeSignatureTex}$`}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  System F 源码实现 (Term)
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
                  {`$${preset.termTex}$`}
                </div>
              </div>
            </div>
          </div>

          {/* Viewport Container with CanvasToolbar */}
          <div className="relative mb-5 flex h-[var(--demo-height,26rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 p-5 shadow-inner dark:border-slate-800">
            <CanvasToolbar onReset={handleReset} />
            <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />

            {/* Stepper Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex <= 0}
                  onClick={() => setCurrentStepIndex(0)}
                  title="回到初始多态表达式"
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
                  title="回退一步"
                  type="button"
                >
                  ◀ 单步回退
                </button>
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex >= maxSteps - 1}
                  onClick={() =>
                    setCurrentStepIndex((prev) =>
                      Math.min(maxSteps - 1, prev + 1),
                    )
                  }
                  title="推进归约"
                  type="button"
                >
                  二阶归约步进 ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${currentStep.badgeColor}`}
                >
                  {currentStep.phaseBadge}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  步数：{currentStepIndex + 1} / {maxSteps}
                </span>
              </div>
            </div>

            {/* Stepper View Area */}
            <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto text-center">
              {viewMode === "two_phase" ? (
                <div className="space-y-4 py-2">
                  <div className="text-xs font-semibold text-slate-400">
                    {currentStep.phaseTitle}
                  </div>

                  {/* Main Expression Box */}
                  <div className="flex items-center justify-center overflow-x-auto px-4 py-3">
                    <div className="rounded-2xl border border-indigo-700/60 bg-slate-800/60 px-6 py-4 shadow-xl backdrop-blur-md">
                      <div className="font-mono text-lg text-slate-100 sm:text-xl">
                        {`$${currentStep.expressionTex}$`}
                      </div>
                    </div>
                  </div>

                  {/* Action & Rule Banner */}
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 text-xs">
                    <div className="font-mono text-indigo-300">
                      {`$${currentStep.ruleTex}$`}
                    </div>
                    <p className="text-slate-400">{currentStep.actionDesc}</p>
                  </div>
                </div>
              ) : (
                /* Free Theorem Commutative Diagram Mode */
                <div className="space-y-4 py-3 text-center">
                  <div className="text-xs font-semibold text-amber-400">
                    Reynolds 关系参数化定理与自然性交换图
                  </div>

                  <div className="mx-auto max-w-lg rounded-2xl border border-amber-600/40 bg-amber-950/20 p-5 shadow-lg backdrop-blur-sm">
                    <div className="mb-2 text-xs font-medium text-slate-300">
                      {`$${preset.freeTheoremPropTex}$`}
                    </div>
                    <div className="my-3 font-mono text-base font-bold text-amber-200">
                      {`$${preset.freeTheoremEquationTex}$`}
                    </div>
                    <div className="text-[11px] leading-relaxed text-slate-400">
                      💡 <strong>核心直觉</strong>
                      ：纯参数多态函数无法检查具象类型的内部构造，因此它与任何类型间的任意转换函数{" "}
                      $g$ 完全交换（Commutes）。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Theoretical Insight Card */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
              🔍 本多态构造深度理论洞见 (Parametricity & Impredicativity
              Insight)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-indigo-800 dark:text-indigo-200">
              {preset.insight}
            </p>
          </div>
        </div>
      </ExpandableDemo>
    </AutoMath>
  );
}
