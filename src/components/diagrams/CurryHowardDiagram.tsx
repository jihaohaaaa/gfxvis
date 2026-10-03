import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import InteractiveLayout from "../framework/InteractiveLayout";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import KdeButton from "../framework/KdeButton";
import KdeButtonGroup from "../framework/KdeButtonGroup";
import KdeProgressBar from "../framework/KdeProgressBar";
import CodePlayground from "../framework/CodePlayground";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import PresetSelector from "../framework/PresetSelector";

// ============================================================================
// Types & Preset Data Structure
// ============================================================================

export interface ProofStep {
  name: string;
  desc: string;
  logicPremise: string;
  logicRule: string;
  logicConclusion: string;
  stlcPremise: string;
  stlcRule: string;
  stlcConclusion: string;
}

export interface PresetItem {
  id: string;
  label: string;
  desc: string;
  category: "implication" | "product" | "sum" | "boundary";
  propTex: string;
  typeTex: string;
  termTex: string;
  insight: string;
  isConstructive: boolean;
  steps: ProofStep[];
}

const PRESETS: PresetItem[] = [
  {
    id: "identity",
    label: "1. 恒等律 (Identity / I 组合子)",
    desc: "最基本的自蕴涵：A 蕴涵 A",
    category: "implication",
    propTex: "A \\implies A",
    typeTex: "A \\to A",
    termTex: "\\lambda x:A.\\, x",
    insight:
      "逻辑中的恒等假说引入（A 推出自身），在计算上恰好对应什么都不做的恒等函数 I 组合子。对 A 的假设即函数的形参。",
    isConstructive: true,
    steps: [
      {
        name: "假说引入 / 形参绑定",
        desc: "在局部上下文引入假说 [x: A]",
        logicPremise: "[A]^1",
        logicRule: "\\text{Hypothesis}",
        logicConclusion: "A",
        stlcPremise: "\\emptyset, x:A",
        stlcRule: "\\text{T-Var}",
        stlcConclusion: "x: A",
      },
      {
        name: "蕴涵引入 / 函数抽象",
        desc: "消去假说 1，构造蕴涵 A → A",
        logicPremise: "[A]^1 \\vdash A",
        logicRule: "\\to\\text{-I}^1",
        logicConclusion: "\\vdash A \\implies A",
        stlcPremise: "x:A \\vdash x: A",
        stlcRule: "\\text{T-Abs}",
        stlcConclusion: "\\vdash (\\lambda x:A.\\, x) : A \\to A",
      },
      {
        name: "割消除 / β-归约化简",
        desc: "若应用于实参 u: A，则直接消去割并得到返回值 u",
        logicPremise: "\\vdash A \\implies A \\quad \\vdash A",
        logicRule: "\\to\\text{-E} \\; (\\text{Cut})",
        logicConclusion: "A \\; \\Longrightarrow_{\\text{Cut-Elim}} \\; A",
        stlcPremise: "(\\lambda x:A.\\, x) \\; u",
        stlcRule: "\\beta\\text{-Reduction}",
        stlcConclusion: "u : A",
      },
    ],
  },
  {
    id: "weakening",
    label: "2. 假说弱化 (Weakening / K 组合子)",
    desc: "A 蕴涵 (B 蕴涵 A)",
    category: "implication",
    propTex: "A \\implies (B \\implies A)",
    typeTex: "A \\to B \\to A",
    termTex: "\\lambda x:A.\\, \\lambda y:B.\\, x",
    insight:
      "引入一个未使用的命题假说 B，在程序中对应接收参数 y 但直接将其丢弃并常数返回 x 的常数函数（K 组合子）。",
    isConstructive: true,
    steps: [
      {
        name: "假说引入 x: A",
        desc: "上下文登记 x: A",
        logicPremise: "[A]^1",
        logicRule: "\\text{Hypothesis}",
        logicConclusion: "A",
        stlcPremise: "x: A",
        stlcRule: "\\text{T-Var}",
        stlcConclusion: "x: A",
      },
      {
        name: "弱化引入无关假说 y: B",
        desc: "在保持结论 A 不变的同时引入冗余假设 y: B",
        logicPremise: "[A]^1, [B]^2 \\vdash A",
        logicRule: "\\to\\text{-I}^2",
        logicConclusion: "[A]^1 \\vdash B \\implies A",
        stlcPremise: "x: A, y: B \\vdash x: A",
        stlcRule: "\\text{T-Abs}",
        stlcConclusion: "x: A \\vdash (\\lambda y:B.\\, x) : B \\to A",
      },
      {
        name: "外层闭包完成",
        desc: "消去最外层假设 x: A",
        logicPremise: "[A]^1 \\vdash B \\implies A",
        logicRule: "\\to\\text{-I}^1",
        logicConclusion: "\\vdash A \\implies (B \\implies A)",
        stlcPremise: "x: A \\vdash (\\lambda y:B.\\, x) : B \\to A",
        stlcRule: "\\text{T-Abs}",
        stlcConclusion:
          "\\vdash (\\lambda x:A.\\, \\lambda y:B.\\, x) : A \\to B \\to A",
      },
    ],
  },
  {
    id: "transitivity",
    label: "3. 假言三段论 (Transitivity / 函数复合)",
    desc: "(A → B) 且 (B → C) 则 (A → C)",
    category: "implication",
    propTex:
      "(A \\implies B) \\implies (B \\implies C) \\implies (A \\implies C)",
    typeTex: "(A \\to B) \\to (B \\to C) \\to A \\to C",
    termTex:
      "\\lambda f:A \\to B.\\, \\lambda g:B \\to C.\\, \\lambda x:A.\\, g \\; (f \\; x)",
    insight:
      "数理逻辑中最重要的假言推理三段论，在计算机科学中完完全全就是高阶函数管道与复合（g ∘ f）。证明的前推等价于数据的传递变换。",
    isConstructive: true,
    steps: [
      {
        name: "第一阶段推理：f(x)",
        desc: "由 x: A 与 f: A → B 推出 f(x): B",
        logicPremise: "A \\implies B \\quad A",
        logicRule: "\\to\\text{-E} \\; (\\text{Modus Ponens})",
        logicConclusion: "B",
        stlcPremise: "f: A \\to B, x: A",
        stlcRule: "\\text{T-App}",
        stlcConclusion: "f \\; x : B",
      },
      {
        name: "第二阶段推理：g(f(x))",
        desc: "将中间产物 B 喂入 g: B → C 得到 C",
        logicPremise: "B \\implies C \\quad B",
        logicRule: "\\to\\text{-E}",
        logicConclusion: "C",
        stlcPremise: "g: B \\to C, (f \\; x) : B",
        stlcRule: "\\text{T-App}",
        stlcConclusion: "g \\; (f \\; x) : C",
      },
      {
        name: "三层抽象聚合",
        desc: "依次消去假设 x, g, f 得到复合闭包",
        logicPremise: "f, g, x \\vdash C",
        logicRule: "\\to\\text{-I}^3",
        logicConclusion:
          "\\vdash (A \\implies B) \\implies (B \\implies C) \\implies (A \\implies C)",
        stlcPremise: "f, g, x \\vdash g(f(x)) : C",
        stlcRule: "\\text{T-Abs}^3",
        stlcConclusion:
          "\\vdash (\\lambda f.\\, \\lambda g.\\, \\lambda x.\\, g \\; (f \\; x))",
      },
    ],
  },
  {
    id: "conjunction_sym",
    label: "4. 合取交换律 (Conjunction Symmetry / 积类型)",
    desc: "(A ∧ B) 蕴涵 (B ∧ A)",
    category: "product",
    propTex: "(A \\land B) \\implies (B \\land A)",
    typeTex: "(A \\times B) \\to (B \\times A)",
    termTex:
      "\\lambda p:A \\times B.\\, (\\text{snd} \\; p, \\, \\text{fst} \\; p)",
    insight:
      "逻辑合取 ∧ 对应类型论中的积类型（Product Type，元组 Pair）；合取消去 ∧-E₁/∧-E₂ 对应元组的投影算子 fst / snd；合取引入 ∧-I 对应构造器对 (·, ·)。",
    isConstructive: true,
    steps: [
      {
        name: "合取消去 / 元组解构",
        desc: "从 p: A ∧ B 中分别提取左右证明项",
        logicPremise: "A \\land B",
        logicRule: "\\land\\text{-E}_1, \\land\\text{-E}_2",
        logicConclusion: "B \\quad \\text{与} \\quad A",
        stlcPremise: "p : A \\times B",
        stlcRule: "\\text{T-Proj}_1, \\text{T-Proj}_2",
        stlcConclusion: "\\text{snd} \\; p : B, \\; \\text{fst} \\; p : A",
      },
      {
        name: "合取引入 / 元组对重构",
        desc: "反向组装为新的合取证据 B ∧ A",
        logicPremise: "B \\quad A",
        logicRule: "\\land\\text{-I}",
        logicConclusion: "B \\land A",
        stlcPremise: "\\text{snd} \\; p : B, \\; \\text{fst} \\; p : A",
        stlcRule: "\\text{T-Pair}",
        stlcConclusion:
          "(\\text{snd} \\; p, \\, \\text{fst} \\; p) : B \\times A",
      },
      {
        name: "封装为交换函数",
        desc: "引入 p 构成闭合项",
        logicPremise: "[A \\land B]^1 \\vdash B \\land A",
        logicRule: "\\to\\text{-I}^1",
        logicConclusion: "\\vdash (A \\land B) \\implies (B \\land A)",
        stlcPremise:
          "p: A \\times B \\vdash (\\text{snd} \\; p, \\text{fst} \\; p)",
        stlcRule: "\\text{T-Abs}",
        stlcConclusion:
          "\\vdash (\\lambda p.\\, (\\text{snd} \\; p, \\, \\text{fst} \\; p))",
      },
    ],
  },
  {
    id: "curry_iso",
    label: "5. 柯里化同构 (Currying / 指数伴随)",
    desc: "((A ∧ B) → C) 等价于 (A → (B → C))",
    category: "product",
    propTex:
      "((A \\land B) \\implies C) \\implies (A \\implies (B \\implies C))",
    typeTex: "((A \\times B) \\to C) \\to A \\to B \\to C",
    termTex:
      "\\lambda f:(A \\times B) \\to C.\\, \\lambda x:A.\\, \\lambda y:B.\\, f \\; (x, y)",
    insight:
      "将接收二元组的函数转换为接收单参数并返回新函数的阶梯函数。这在范畴论中对应笛卡尔闭范畴（CCC）的核心伴随态：Hom(A × B, C) ≅ Hom(A, C^B)。",
    isConstructive: true,
    steps: [
      {
        name: "装配实参元组",
        desc: "由假说 x: A 与 y: B 配对构造 (x, y): A × B",
        logicPremise: "A \\quad B",
        logicRule: "\\land\\text{-I}",
        logicConclusion: "A \\land B",
        stlcPremise: "x: A, y: B",
        stlcRule: "\\text{T-Pair}",
        stlcConclusion: "(x, y) : A \\times B",
      },
      {
        name: "调用未柯里化函数 f",
        desc: "f (x, y) 计算得到目标类型 C",
        logicPremise: "(A \\land B) \\implies C \\quad (A \\land B)",
        logicRule: "\\to\\text{-E}",
        logicConclusion: "C",
        stlcPremise: "f: (A \\times B) \\to C, (x, y): A \\times B",
        stlcRule: "\\text{T-App}",
        stlcConclusion: "f \\; (x, y) : C",
      },
      {
        name: "逐层柯里化抽象",
        desc: "依次抽象参数 y, x, f 完成柯里化变换器",
        logicPremise: "f, x, y \\vdash C",
        logicRule: "\\to\\text{-I}^3",
        logicConclusion:
          "\\vdash ((A \\land B) \\implies C) \\implies A \\implies B \\implies C",
        stlcPremise: "f, x, y \\vdash f(x, y) : C",
        stlcRule: "\\text{T-Abs}^3",
        stlcConclusion:
          "\\vdash (\\lambda f.\\, \\lambda x.\\, \\lambda y.\\, f \\; (x, y))",
      },
    ],
  },
  {
    id: "disjunction_case",
    label: "6. 析取情况分支 (Disjunction / 和类型 Sum)",
    desc: "(A ∨ B) 且 (A → C) 且 (B → C) 则 C",
    category: "sum",
    propTex:
      "(A \\lor B) \\implies (A \\implies C) \\implies (B \\implies C) \\implies C",
    typeTex: "(A + B) \\to (A \\to C) \\to (B \\to C) \\to C",
    termTex:
      "\\lambda s:A + B.\\, \\lambda f:A \\to C.\\, \\lambda g:B \\to C.\\, \\text{case } s \\text{ of } \\text{inl } x \\Rightarrow f \\; x \\mid \\text{inr } y \\Rightarrow g \\; y",
    insight:
      "逻辑析取 ∨ 对应类型论中的和类型（Sum Type / 标签联合 / Rust enum）。析取消去 ∨-E 对应模式匹配（case 分析），必须穷尽处理左右所有分支可能。",
    isConstructive: true,
    steps: [
      {
        name: "左分支模拟假设",
        desc: "若 s 为 inl x，则匹配提取 x: A 并由 f(x) 产生 C",
        logicPremise: "[A]^1, \\; A \\implies C",
        logicRule: "\\to\\text{-E}",
        logicConclusion: "C",
        stlcPremise: "x: A, f: A \\to C",
        stlcRule: "\\text{T-App}",
        stlcConclusion: "f \\; x : C",
      },
      {
        name: "右分支模拟假设",
        desc: "若 s 为 inr y，则匹配提取 y: B 并由 g(y) 产生 C",
        logicPremise: "[B]^2, \\; B \\implies C",
        logicRule: "\\to\\text{-E}",
        logicConclusion: "C",
        stlcPremise: "y: B, g: B \\to C",
        stlcRule: "\\text{T-App}",
        stlcConclusion: "g \\; y : C",
      },
      {
        name: "析取消去合并 (Case 归并)",
        desc: "无论 s 承载哪种分支，均能确定产出目标证据 C",
        logicPremise: "A \\lor B, \\; [A]^1 \\vdash C, \\; [B]^2 \\vdash C",
        logicRule: "\\lor\\text{-E}",
        logicConclusion: "C",
        stlcPremise: "s: A + B, f: A \\to C, g: B \\to C",
        stlcRule: "\\text{T-Case}",
        stlcConclusion:
          "\\text{case } s \\text{ of inl } x \\Rightarrow f \\; x \\mid \\text{inr } y \\Rightarrow g \\; y : C",
      },
    ],
  },
  {
    id: "explosion",
    label: "7. 矛盾爆炸原理 (Principle of Explosion / 空类型)",
    desc: "假推万物 (Ex Falso Quodlibet): ⊥ 蕴涵任意命题 A",
    category: "boundary",
    propTex: "\\bot \\implies A",
    typeTex: "\\text{Void} \\to A",
    termTex: "\\lambda e:\\text{Void}.\\, \\text{absurd}(e)",
    insight:
      "逻辑中的假值 ⊥ 对应没有任何构造子的空类型 Void（TypeScript 的 never，Rust 的 !）。既然 Void 的实例永远无法存在，该函数永远无法被触发调用，因而安全地满足任意类型 A 的要求。",
    isConstructive: true,
    steps: [
      {
        name: "荒谬前提假设",
        desc: "假定上下文拥有一个不可能存在的荒谬证据 e: Void",
        logicPremise: "[\\bot]^1",
        logicRule: "\\text{Hypothesis}",
        logicConclusion: "\\bot",
        stlcPremise: "e : \\text{Void}",
        stlcRule: "\\text{T-Var}",
        stlcConclusion: "e : \\text{Void}",
      },
      {
        name: "爆炸消去算子 (Absurd / 假值消除)",
        desc: "由假证明任意目标命题 A",
        logicPremise: "\\bot",
        logicRule: "\\bot\\text{-E} \\; (\\text{Ex Falso})",
        logicConclusion: "A",
        stlcPremise: "e : \\text{Void}",
        stlcRule: "\\text{T-Absurd}",
        stlcConclusion: "\\text{absurd}(e) : A",
      },
      {
        name: "构成真空守恒函数",
        desc: "消去假设 e，得到 Void → A",
        logicPremise: "[\\bot]^1 \\vdash A",
        logicRule: "\\to\\text{-I}^1",
        logicConclusion: "\\vdash \\bot \\implies A",
        stlcPremise: "e : \\text{Void} \\vdash \\text{absurd}(e) : A",
        stlcRule: "\\text{T-Abs}",
        stlcConclusion:
          "\\vdash (\\lambda e:\\text{Void}.\\, \\text{absurd}(e)) : \\text{Void} \\to A",
      },
    ],
  },
  {
    id: "lem_limit",
    label: "8. 直觉主义边界 (排中律 LEM 的非构造性)",
    desc: "A ∨ ¬A 在纯 STLC 中为何不存在闭合项？",
    category: "boundary",
    propTex: "A \\lor \\neg A \\quad (A \\lor (A \\implies \\bot))",
    typeTex: "A + (A \\to \\text{Void})",
    termTex: "\\text{无法在纯 STLC 中构造！(No closed term)}",
    insight:
      "要给 A + (A → Void) 构造程序，必须在没有输入的情况下凭空决定产出 inl (即给出 A 的具体证据) 或 inr (给出反驳 A 的算法)。对于未决命题（如停机性），计算不可能提前知道结果！因此直觉主义逻辑舍弃了排中律。",
    isConstructive: false,
    steps: [
      {
        name: "直觉主义认知准则",
        desc: "证明一个析取命题 A ∨ B，必须显式指明是证明了 A 还是证明了 B",
        logicPremise: "\\text{Constructive BHK Semantics}",
        logicRule: "\\text{Epistemic Rule}",
        logicConclusion:
          "\\text{要么提供证明 } p: A, \\text{ 要么提供反驳 } q: \\neg A",
        stlcPremise: "t : A + (A \\to \\text{Void})",
        stlcRule: "\\text{Canonical Forms Theorem}",
        stlcConclusion:
          "t \\text{ 必须是 } \\text{inl } v \\text{ 或 } \\text{inr } v",
      },
      {
        name: "闭合项寻址悖论",
        desc: "在空上下文 ∅ 下，程序无法凭空预测未判定命题的真伪",
        logicPremise:
          "\\forall A, \\; \\vdash A \\lor \\neg A \\; (\\text{Classical Only})",
        logicRule: "\\text{Non-Constructive}",
        logicConclusion: "\\text{直觉主义中不成立（不可作为无前提公理）}",
        stlcPremise: "\\emptyset \\vdash ? : A + (A \\to \\text{Void})",
        stlcRule: "\\text{Inhabitation Failure}",
        stlcConclusion: "\\text{类型居留算法报错：不存在闭合良类型项}",
      },
      {
        name: "经典逻辑与控制操作符 (Call/cc)",
        desc: "只有引入具有副作用的控制操作符（如延续 call/cc），排中律才能作为具有时间旅行特性的非纯计算项得到居留",
        logicPremise: "\\neg\\neg A \\implies A",
        logicRule: "\\text{Double Negation Elimination}",
        logicConclusion: "A",
        stlcPremise: "\\text{call/cc} : ((A \\to B) \\to A) \\to A",
        stlcRule: "\\text{Peirce's Law Extension}",
        stlcConclusion: "\\text{计算上对应异常跳转与 Continuation 捕获}",
      },
    ],
  },
];

const VIEW_OPTIONS: readonly KdeTabOption<
  "dual" | "logic" | "stlc" | "code_sandbox"
>[] = [
  { id: "dual", label: "双重视角联动镜像 (Dual Mirror)" },
  { id: "logic", label: "仅逻辑视角 (Natural Deduction)" },
  { id: "stlc", label: "仅程序视角 (STLC Typing Tree)" },
  { id: "code_sandbox", label: "TS 类型证明沙盒" },
];

const CURRY_HOWARD_TS_CODE = `// Curry–Howard 同构：命题即类型，证明即程序
// 1. 恒等律 A => A 即泛型恒等函数
export function proofIdentity<A>(a: A): A {
  return a;
}

// 2. 合取交换律 (A ∧ B => B ∧ A) 即元组项解构重组
export type And<A, B> = [A, B];
export function proofAndComm<A, B>(pair: And<A, B>): And<B, A> {
  const [a, b] = pair;
  return [b, a];
}

// 3. 假说弱化 (A => B => A) 即 K 组合子
export function proofWeakening<A, B>(a: A): (b: B) => A {
  return (_b: B) => a;
}

// 4. 肯定前件 Modus Ponens ((A => B) ∧ A => B) 即函数调用
export function proofModusPonens<A, B>(fn: (a: A) => B, a: A): B {
  return fn(a);
}

console.log("I 组合子证明验证:", proofIdentity("Proof Verified"));
console.log("合取交换证明输出:", proofAndComm([100, "Logic Is Computing"]));
`;

export default function CurryHowardDiagram() {
  const [activePresetId, setActivePresetId] = useState<string>("identity");
  const [viewMode, setViewMode] = useState<
    "dual" | "logic" | "stlc" | "code_sandbox"
  >("dual");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const preset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
  const maxSteps = preset.steps.length;
  const currentStep = preset.steps[currentStepIndex] ?? preset.steps[0];

  const handleReset = () => {
    setActivePresetId("identity");
    setViewMode("dual");
    setCurrentStepIndex(0);
  };

  const handlePresetChange = (id: string) => {
    setActivePresetId(id);
    setCurrentStepIndex(0);
  };

  return (
    <AutoMath>
      <ExpandableDemo id="curry-howard-mirror">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · CURRY-HOWARD"
          mark="⊢"
          modeTag="DENSE-DOCK"
          title="Curry–Howard 逻辑与计算对偶镜像探针"
        >
          <InteractiveLayout
            preset="dense-dock"
            top={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--kde-muted)]">
                    视角模式：
                  </span>
                  <KdeTabs
                    onChange={(val) => setViewMode(val)}
                    options={VIEW_OPTIONS}
                    size="sm"
                    value={viewMode}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <KdeBadge
                    variant={preset.isConstructive ? "success" : "warning"}
                  >
                    {preset.isConstructive
                      ? "✅ 构造性定理"
                      : "⚠️ 直觉主义边界"}
                  </KdeBadge>
                </div>
              </div>
            }
            main={
              <div className="relative flex h-[var(--demo-height,28rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--kde-border)] bg-[var(--kde-canvas)] p-5 shadow-inner">
                <CanvasToolbar onReset={handleReset} />

                {viewMode === "code_sandbox" ? (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                    <CodePlayground
                      code={CURRY_HOWARD_TS_CODE}
                      description="在线验证 TypeScript 泛型函数实现的直觉主义逻辑定理构造性证明。"
                      lang="ts"
                      maxHeight="20rem"
                      title="TypeScript 命题类型证明沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Stepper Controller */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kde-border)] pb-3 pr-12">
                      <KdeButtonGroup attached size="xs">
                        <KdeButton
                          size="xs"
                          disabled={currentStepIndex <= 0}
                          onClick={() => setCurrentStepIndex(0)}
                          title="回到初始假说"
                        >
                          ⏮ 初始
                        </KdeButton>
                        <KdeButton
                          size="xs"
                          disabled={currentStepIndex <= 0}
                          onClick={() =>
                            setCurrentStepIndex((prev) => Math.max(0, prev - 1))
                          }
                          title="回退上一步"
                        >
                          ◀ 单步回退
                        </KdeButton>
                        <KdeButton
                          size="xs"
                          variant="primary"
                          disabled={currentStepIndex >= maxSteps - 1}
                          onClick={() =>
                            setCurrentStepIndex((prev) =>
                              Math.min(maxSteps - 1, prev + 1),
                            )
                          }
                          title="推导下一步"
                        >
                          推导下一步 ▶
                        </KdeButton>
                      </KdeButtonGroup>

                      <div className="flex items-center gap-2.5">
                        <KdeProgressBar
                          steps={maxSteps}
                          value={currentStepIndex + 1}
                          size="sm"
                          className="w-28"
                          showLabel={false}
                        />
                        <span className="font-mono text-xs font-semibold text-[var(--kde-muted)]">
                          步数：{currentStepIndex + 1} / {maxSteps}
                        </span>
                        <KdeBadge variant="primary">
                          步骤 {currentStepIndex + 1}：{currentStep.name}
                        </KdeBadge>
                      </div>
                    </div>

                    {/* Stepper Main Display: Mirror Split */}
                    <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto">
                      <div
                        className={`grid gap-4 ${
                          viewMode === "dual"
                            ? "grid-cols-1 lg:grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {/* Left / Top: Logic Natural Deduction Tree */}
                        {(viewMode === "dual" || viewMode === "logic") && (
                          <KdeCard
                            title="📜 逻辑世界：自然推导树 (Natural Deduction)"
                            headerAction={
                              <span className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                推理法则：
                                {`$${currentStep.logicRule}$`}
                              </span>
                            }
                            className="flex flex-col"
                          >
                            <div className="my-auto flex flex-col items-center justify-center py-3 text-center">
                              {/* Logic Premise */}
                              <div className="font-mono text-xs font-medium text-[var(--kde-ink)]">
                                {`$${currentStep.logicPremise}$`}
                              </div>

                              {/* Inference Line */}
                              <div className="my-2 flex w-full max-w-[280px] items-center justify-center">
                                <div className="h-0.5 w-full bg-sky-500/70 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                              </div>

                              {/* Logic Conclusion */}
                              <div className="font-mono text-sm font-bold text-sky-700 dark:text-sky-300">
                                {`$${currentStep.logicConclusion}$`}
                              </div>
                            </div>

                            <div className="mt-2 text-[11px] text-[var(--kde-muted)]">
                              💡 <strong>逻辑直觉</strong>：{currentStep.desc}
                            </div>
                          </KdeCard>
                        )}

                        {/* Right / Bottom: STLC Typing Derivation Tree */}
                        {(viewMode === "dual" || viewMode === "stlc") && (
                          <KdeCard
                            title="💻 程序世界：STLC 类型派生树 (Typing Derivation)"
                            headerAction={
                              <span className="rounded border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                                打字规则：
                                {`$${currentStep.stlcRule}$`}
                              </span>
                            }
                            className="flex flex-col"
                          >
                            <div className="my-auto flex flex-col items-center justify-center py-3 text-center">
                              {/* STLC Premise */}
                              <div className="font-mono text-xs font-medium text-[var(--kde-ink)]">
                                {`$${currentStep.stlcPremise}$`}
                              </div>

                              {/* Inference Line */}
                              <div className="my-2 flex w-full max-w-[280px] items-center justify-center">
                                <div className="h-0.5 w-full bg-indigo-500/70 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                              </div>

                              {/* STLC Conclusion */}
                              <div className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                {`$${currentStep.stlcConclusion}$`}
                              </div>
                            </div>

                            <div className="mt-2 text-[11px] text-[var(--kde-muted)]">
                              💡 <strong>计算直觉</strong>：打字上下文与项构造
                            </div>
                          </KdeCard>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
              </div>
            }
            side={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <KdeCard title="经典逻辑定理预设" variant="dense">
                  <PresetSelector
                    layout="vertical"
                    size="xs"
                    onChange={handlePresetChange}
                    options={PRESETS.map((p) => ({
                      id: p.id,
                      label: p.label,
                      description: p.desc,
                    }))}
                    value={activePresetId}
                  />
                </KdeCard>

                <KdeCard title="推导进度与状态" variant="dense">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        推导步骤：
                      </span>
                      <span className="font-semibold text-[var(--kde-ink)]">
                        {currentStepIndex + 1} / {maxSteps}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        性质判定：
                      </span>
                      <KdeBadge
                        variant={preset.isConstructive ? "success" : "warning"}
                      >
                        {preset.isConstructive
                          ? "✅ 构造性定理"
                          : "⚠️ 直觉主义边界"}
                      </KdeBadge>
                    </div>
                    <div className="pt-1">
                      <KdeProgressBar
                        steps={maxSteps}
                        value={currentStepIndex + 1}
                        size="sm"
                        showLabel
                      />
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="命题与类型同构签名" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--kde-muted)]">
                        逻辑命题：
                      </span>
                      <div className="p-1 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-sky-700 dark:text-sky-300">
                        {`$${preset.propTex}$`}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--kde-muted)]">
                        STLC 类型：
                      </span>
                      <div className="p-1 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                        {`$${preset.typeTex}$`}
                      </div>
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <div className="space-y-4">
                {/* Theorem Summary Banner */}
                <KdeCard
                  title={preset.label}
                  headerAction={
                    <span className="text-xs text-[var(--kde-muted)]">
                      推导进度：
                      <span className="font-mono font-bold text-[var(--kde-accent)]">
                        {currentStepIndex + 1} / {maxSteps}
                      </span>
                    </span>
                  }
                >
                  <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-[var(--kde-panel)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--kde-muted)]">
                        逻辑学命题 (Proposition)
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-sky-700 dark:text-sky-300">
                        {`$${preset.propTex}$`}
                      </div>
                    </div>

                    <div className="rounded-lg bg-[var(--kde-panel)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--kde-muted)]">
                        STLC 类型签名 (Type)
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {`$${preset.typeTex}$`}
                      </div>
                    </div>

                    <div className="rounded-lg bg-[var(--kde-panel)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--kde-muted)]">
                        证明证据 / λ 项 (Term / Proof)
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                        {`$${preset.termTex}$`}
                      </div>
                    </div>
                  </div>
                </KdeCard>

                {/* Deep Theoretical Insight Card */}
                <KdeCard title="🔍 本步对偶深邃洞见 (Curry–Howard Correspondence Insight)">
                  <p className="text-xs leading-relaxed text-[var(--kde-ink)]">
                    {preset.insight}
                  </p>
                </KdeCard>
              </div>
            }
          />
        </KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
