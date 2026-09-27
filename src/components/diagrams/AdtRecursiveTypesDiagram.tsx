import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import InlineMath from "../framework/InlineMath";
import PresetSelector from "../framework/PresetSelector";

// ============================================================================
// Types & Presets for ADT & Recursive Types
// ============================================================================

export interface StepperState {
  level: number;
  typeTex: string;
  termTex: string;
  statusLabel: string;
  statusColor: string;
  desc: string;
}

export interface AdtPreset {
  id: string;
  label: string;
  desc: string;
  equationTex: string;
  muTypeTex: string;
  derivativeTex: string;
  zipperInterpretation: string;
  memoryAnalysis: {
    directSize: string;
    boxedSize: string;
    explanation: string;
  };
  stepperStates: StepperState[];
  insight: string;
}

const PRESETS: AdtPreset[] = [
  {
    id: "nat_peano",
    label: "1. 皮亚诺自然数 (Peano Nat)",
    desc: "Nat ≅ 1 + Nat 递归展开为零或后继",
    equationTex: "\\text{Nat} \\cong 1 + \\text{Nat}",
    muTypeTex: "\\mu X.\\, 1 + X",
    derivativeTex: "\\frac{d}{dX}(1 + X) = 1 \\quad (\\text{指向单一前驱指针})",
    zipperInterpretation:
      "自然数的多项式导数恒等于 1，说明在自然数链条中，去掉当前位置后，留下的上下文恰好只是一个单纯的一阶单步位置标记（即前驱算子 PRED 的确定性）。",
    memoryAnalysis: {
      directSize: "无限展开（递归内联死锁：1 + (1 + (1 + ...))）",
      boxedSize: "栈上 8 字节（通过指针间接层 Box<Nat> 或枚举判别标签）",
      explanation:
        "若没有指针切断递归，编译器试图在栈上连续为每个值分配固定大小，导致 sizeof(Nat) 无法收敛为有限数值。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "\\text{Nat}",
        termTex: "\\text{three}",
        statusLabel: "Folded (折叠抽象类型)",
        statusColor:
          "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
        desc: "未展开的抽象递归类型 Nat，对外屏蔽具体构造细节。",
      },
      {
        level: 1,
        typeTex: "1 + \\text{Nat}",
        termTex: "\\text{inr} \\; (\\text{two})",
        statusLabel: "Unfolded Level 1 (首次解构)",
        statusColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        desc: "调用 unfold 后暴露顶层和类型：确定当前值是后继分支 inr(two)。",
      },
      {
        level: 2,
        typeTex: "1 + (1 + \\text{Nat})",
        termTex: "\\text{inr} \\; (\\text{inr} \\; (\\text{one}))",
        statusLabel: "Unfolded Level 2 (深入解构)",
        statusColor:
          "bg-purple-500/20 text-purple-300 border border-purple-500/40",
        desc: "再次展开暴露内部的后继结构：确认是 inr(inr(one))。",
      },
      {
        level: 3,
        typeTex: "1 + (1 + (1 + 1))",
        termTex:
          "\\text{inr} \\; (\\text{inr} \\; (\\text{inr} \\; (\\text{inl} \\; ())))",
        statusLabel: "Base Grounding (触底基底)",
        statusColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        desc: "最终触达零值基底 inl()，完成了有限深度的完全解构展开。",
      },
    ],
    insight:
      "皮亚诺自然数是代数数据类型最纯粹的原型：1 代表零（Unit 单值），+ 代表或者，X 代表递归自指。折叠 fold 与展开 unfold 构成了基底代数（Algebras）与余代数（Coalgebras）的对应。",
  },
  {
    id: "list_adt",
    label: "2. 递归链表 (Linked List)",
    desc: "List A ≅ 1 + A × List A",
    equationTex: "\\text{List } A \\cong 1 + A \\times \\text{List } A",
    muTypeTex: "\\mu X.\\, 1 + A \\times X",
    derivativeTex:
      "\\frac{d}{dX}\\left(\\frac{1}{1 - A X}\\right) = \\frac{A}{(1 - A X)^2} = \\text{List } A \\times A \\times \\text{List } A",
    zipperInterpretation:
      "链表多项式的形式导数等于（左侧列表 × 当前元素 × 右侧列表）。这正是 Huet 链表拉链（Zipper）的严密数学本质：光标左侧的前缀元素与右侧的后缀元素构成了光标处的上下文！",
    memoryAnalysis: {
      directSize: "无限内存展开（sizeof(List) = 8 + sizeof(List)）",
      boxedSize: "栈上固定 16 字节（指针 + 长度，堆上通过 Node 指针串联）",
      explanation:
        "Rust 中写 enum List<T> { Nil, Cons(T, List<T>) } 会直接报 E0072 错误，必须写成 Cons(T, Box<List<T>>) 才能使枚举拥有确定的机器布局大小。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "\\text{List } A",
        termTex: "[10, \\, 20]",
        statusLabel: "Folded (抽象列表)",
        statusColor:
          "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
        desc: "整体折叠的递归列表类型，存储数据序列 [10, 20]。",
      },
      {
        level: 1,
        typeTex: "1 + A \\times \\text{List } A",
        termTex: "\\text{Cons}(10, \\, [20])",
        statusLabel: "Unfolded Head/Tail (头尾解构)",
        statusColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        desc: "展开第一层：获得表头元素 10 与尾部列表 [20]。",
      },
      {
        level: 2,
        typeTex: "1 + A \\times (1 + A \\times \\text{List } A)",
        termTex: "\\text{Cons}(10, \\, \\text{Cons}(20, \\, []))",
        statusLabel: "Unfolded Complete (全展开)",
        statusColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        desc: "展开第二层：暴露末尾的空链表 Nil 构造器 1。",
      },
    ],
    insight:
      "递归链表展现了代数数据类型的生成函数（Generating Function）奇迹：List X = 1 + X · List X => List X = 1 / (1 - X)。这正是形式几何级数展开 1 + X + X² + X³ + ... 的代数源头！",
  },
  {
    id: "tree_binary",
    label: "3. 递归二叉树 (Binary Tree)",
    desc: "Tree A ≅ 1 + A × Tree A × Tree A",
    equationTex: "\\text{Tree } A \\cong 1 + A \\times (\\text{Tree } A)^2",
    muTypeTex: "\\mu X.\\, 1 + A \\times X^2",
    derivativeTex:
      "\\frac{d}{dX}(1 + A X^2) = 2 A X = 2 \\times A \\times \\text{Tree } A",
    zipperInterpretation:
      "二叉树单层求导得到 2 × A × Tree A：因子 2 代表当前处于‘左分支’还是‘右分支’；A 代表当前节点存储的键值；Tree A 代表未被进入的‘兄弟子树’！这就是二叉树 Zipper 的面包屑结构。",
    memoryAnalysis: {
      directSize: "双重指数级无穷展开（1 + A × S² 几何级数爆炸）",
      boxedSize: "栈上 24 字节（节点数据 + 两个 8 字节子节点堆指针 Box）",
      explanation:
        "二叉树包含两个自引用指针，若无 Box 间接层，内存展开呈二叉分形无限扩张，根本无法在物理连续内存中建立对象。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "\\text{Tree } A",
        termTex: "\\text{Node}(42, \\, \\text{Left}, \\, \\text{Right})",
        statusLabel: "Folded (整树折叠)",
        statusColor:
          "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
        desc: "折叠包装的二叉树抽象类型，封装了根节点与两棵子树。",
      },
      {
        level: 1,
        typeTex: "1 + A \\times (\\text{Tree } A) \\times (\\text{Tree } A)",
        termTex:
          "\\text{inr}(42, \\, \\text{LeftSubtree}, \\, \\text{RightSubtree})",
        statusLabel: "Unfolded (分叉解构)",
        statusColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        desc: "展开一层暴露当前值 42 以及左右子树指针。",
      },
    ],
    insight:
      "二叉树的多项式方程 Tree(X) = 1 + X · (Tree(X))² 拥有著名的加泰罗尼亚数（Catalan Numbers）展开式！代数数据类型将离散组合数学与函数式编程完美锁合在一起。",
  },
  {
    id: "y_combinator",
    label: "4. Y 组合子重现 (Typing the Y Combinator)",
    desc: "借助自引用类型 μX. X → R 攻克自复制项 ω",
    equationTex:
      "T \\cong T \\to R \\quad \\implies \\quad T \\triangleq \\mu X.\\, X \\to R",
    muTypeTex: "\\mu X.\\, (X \\to R)",
    derivativeTex:
      "\\text{unfold} : (\\mu X.\\, X \\to R) \\to ((\\mu X.\\, X \\to R) \\to R)",
    zipperInterpretation:
      "通过显式 unfold 解构，形参 x 能够从递归包装中吐出接收自身的函数，从而使得 (unfold x) x 完美通过类型检查，重获图灵完备性！",
    memoryAnalysis: {
      directSize: "有限内存占用（纯函数闭包与显式打字注解）",
      boxedSize: "零额外运行时开销（在等构系统中仅作为编译期证明）",
      explanation:
        "在类型系统中引入 μ 绑定器打破了 STLC 强规范化铁律，使得停机不可判定的无限递归算法可以在静态类型保护下合法运行。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "T \\triangleq \\mu X.\\, (X \\to R)",
        termTex: "x : T",
        statusLabel: "Folded Parameter (自解构形参)",
        statusColor:
          "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
        desc: "形参 x 拥有递归类型 T，等待通过 unfold 算子解开自引用封印。",
      },
      {
        level: 1,
        typeTex: "T \\to R",
        termTex: "(\\text{unfold} \\; x) : T \\to R",
        statusLabel: "Unfolded Operator (成功解出函数体)",
        statusColor:
          "bg-purple-500/20 text-purple-300 border border-purple-500/40",
        desc: "调用 unfold 后，项从 T 蜕变为可调用的函数类型 T → R！",
      },
      {
        level: 2,
        typeTex: "R",
        termTex: "(\\text{unfold} \\; x) \\; x : R",
        statusLabel: "Self-Application Typed! (自应用类型检查通过)",
        statusColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        desc: "由于函数期望实参类型为 T，而 x 本身就是 T，自应用调用完全合法！",
      },
    ],
    insight:
      "在 STLC 中，ω = λx. x x 无法打字；但只要引入一阶递归类型 μX. X → R，自复制与 Y 组合子即可重现人间！这深刻表明：递归类型是静态类型系统迈向图灵完备的核心钥匙。",
  },
  {
    id: "zipper_list",
    label: "5. 链表拉链与导数 (List Zipper = d/dX List)",
    desc: "代数微积分：d/dX (List X) = List X × List X",
    equationTex: "\\text{List } X = \\sum_{n=0}^\\infty X^n = \\frac{1}{1 - X}",
    muTypeTex:
      "\\frac{d}{dX}\\left(\\frac{1}{1 - X}\\right) = \\frac{1}{(1 - X)^2}",
    derivativeTex:
      "\\text{Zipper } X \\cong \\text{List } X \\times \\text{List } X \\quad (\\text{左侧前缀} \\times \\text{右侧后缀})",
    zipperInterpretation:
      "在列表 List X 中扣掉一个当前关注的位置（求一阶导数），剩下的上下文恰好是光标左侧已经走过的元素（倒序栈）和光标右侧尚未访问的元素（正序列表）。在 O(1) 时间内完成局部编辑！",
    memoryAnalysis: {
      directSize: "两组链表指针（前缀列表头指针 + 后缀列表头指针）",
      boxedSize: "16 字节纯栈上状态（实现零分配的局部移动）",
      explanation:
        "Zipper 将不可变数据结构的遍历开销从 O(n) 重复构造降低到 O(1) 指针转移，是函数式文本编辑器（如 Emacs 缓冲区模型）的基石。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "\\text{List } X",
        termTex: "[A, \\, B, \\, C, \\, D]",
        statusLabel: "Original Data (原始连续数据)",
        statusColor:
          "bg-slate-500/20 text-slate-300 border border-slate-500/40",
        desc: "没有聚焦位置的静态普通列表。",
      },
      {
        level: 1,
        typeTex: "\\text{List } X \\times X \\times \\text{List } X",
        termTex:
          "(\\text{Left: } [A], \\; \\text{Focus: } B, \\; \\text{Right: } [C, \\, D])",
        statusLabel: "Derivative Focus (求导聚焦光标 B)",
        statusColor:
          "bg-amber-500/20 text-amber-300 border border-amber-500/40",
        desc: "列表在元素 B 处被一阶导数切开：上下文被精确记录为左侧 [A] 与右侧 [C, D]。",
      },
      {
        level: 2,
        typeTex: "\\text{List } X \\times X \\times \\text{List } X",
        termTex:
          "(\\text{Left: } [B, \\, A], \\; \\text{Focus: } C, \\; \\text{Right: } [D])",
        statusLabel: "Zipper Step Right (光标 O(1) 右移)",
        statusColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        desc: "向右移动只需弹出右侧头并压入左侧，无需复制整条链表！",
      },
    ],
    insight:
      "Gérard Huet 发明的 Zipper 不是凭空出现的工程技巧，而是多项式代数微积分在数据结构上的严格几何投影！求导数在物理上意味着‘留出一个洞（hole）并考察周围的环境’。",
  },
  {
    id: "zipper_tree",
    label: "6. 二叉树拉链 (Binary Tree Zipper)",
    desc: "d/dX Tree X 对应带方位标记的面包屑导航路径",
    equationTex: "T(X) = 1 + X \\cdot T(X)^2",
    muTypeTex: "T'(X) = T(X)^2 + 2 X \\cdot T(X) \\cdot T'(X)",
    derivativeTex:
      "\\text{Breadcrumb} \\cong (\\text{Left} \\mid \\text{Right}) \\times X \\times \\text{Tree } X",
    zipperInterpretation:
      "二叉树 Zipper 的上下文是一个由面包屑构成的栈：每一步记录当前走的是左还是右、父节点的键值、以及没有走进去的另一半兄弟子树。重构整棵树只需要一路沿着面包屑向上折叠。",
    memoryAnalysis: {
      directSize: "树深度对数级的栈开销 O(log n)",
      boxedSize: "指针引用共享，完全复用未修改的子树内存",
      explanation:
        "在纯函数式语言中修改树的某个深层节点，借助 Zipper 只需要更新沿途 O(log n) 个节点，其余兄弟子树完全通过指针共享内存（Structural Sharing）。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex: "\\text{Tree } X",
        termTex: "\\text{Root Node}",
        statusLabel: "At Root (位于树根)",
        statusColor:
          "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40",
        desc: "光标聚焦在整棵二叉树的根节点，面包屑栈为空。",
      },
      {
        level: 1,
        typeTex: "\\text{Focus} \\times \\text{Breadcrumbs}",
        termTex:
          "\\text{Focus: LeftChild}, \\; \\text{Crumb: } [(\\text{LeftBranch}, \\text{RootVal}, \\text{RightSubtree})]",
        statusLabel: "Down Left (步入左子树)",
        statusColor: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
        desc: "向下进入左子树：父节点与兄弟右子树被打包为一个面包屑推入上下文栈。",
      },
    ],
    insight:
      "二叉树求导展开出的递归项展现了链式法则（Chain Rule）的具象化：求导操作沿着树的分支层层向下渗透，形成一条通往根节点的回溯路径。",
  },
  {
    id: "rust_box",
    label: "7. Rust 内存死锁诊断 (Direct vs Box<T>)",
    desc: "sizeof(S) = sizeof(T) + sizeof(S) 无限展开悖论",
    equationTex: "S = \\text{Tag} + \\text{Data} + S \\implies S = \\infty",
    muTypeTex:
      "S = \\text{Tag} + \\text{Data} + \\text{Box}\\langle S \\rangle",
    derivativeTex:
      "\\text{sizeof}(\\text{Box}\\langle S \\rangle) = 8 \\; \\text{bytes} \\; (\\text{Pointer Indirection})",
    zipperInterpretation:
      "通过引入指针间接层，类型的几何级数无穷大内存被切断，类型大小坍缩为确定性的 8 字节指针，使得单态化编译器得以安排固定的栈帧偏移量。",
    memoryAnalysis: {
      directSize: "编译报错 E0072：'recursive type has infinite size'",
      boxedSize: "严格确定大小：8 字节枚举判别标签 + 8 字节堆指针",
      explanation:
        "Rust 没有运行时垃圾回收（GC），所有类型必须在编译期静态计算栈内存尺寸。直接内联导致循环等式 S = 16 + S，解为无穷大，必须通过 Box 指针打破内联。",
    },
    stepperStates: [
      {
        level: 0,
        typeTex:
          "\\text{enum List } \\{ \\text{Nil}, \\; \\text{Cons}(u64, \\, \\text{List}) \\}",
        termTex: "\\text{sizeof}(\\text{List}) = \\infty",
        statusLabel: "Compile Error E0072 (无限尺寸死锁)",
        statusColor: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
        desc: "直接内联导致类型定义陷入无限循环：无法在栈上预留固定字节。",
      },
      {
        level: 1,
        typeTex:
          "\\text{enum List } \\{ \\text{Nil}, \\; \\text{Cons}(u64, \\, \\text{Box}\\langle\\text{List}\\rangle) \\}",
        termTex: "\\text{sizeof}(\\text{List}) = 16 \\; \\text{bytes}",
        statusLabel: "Resolved via Box (定长收敛)",
        statusColor:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
        desc: "引入 Box 指针后，栈上尺寸严格收敛为 8 字节数据 + 8 字节指针！",
      },
    ],
    insight:
      "从类型论到系统编程的桥梁：等价递归（Equi-recursive）在纯数学语义中允许无穷树，但在计算机硬件物理内存中，必须通过等构递归（Iso-recursive）或显式堆指针打破直接包含关系。",
  },
];

const VIEW_OPTIONS = [
  { id: "stepper", label: "Iso-recursive 折叠与展开 (Fold / Unfold)" },
  { id: "zipper", label: "类型微积分与 Zipper (Type Derivatives)" },
  { id: "memory", label: "内存布局与 Box 收敛 (Memory Layout)" },
];

export default function AdtRecursiveTypesDiagram() {
  const [activePresetId, setActivePresetId] = useState<string>("nat_peano");
  const [viewMode, setViewMode] = useState<"stepper" | "zipper" | "memory">(
    "stepper",
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const preset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
  const maxSteps = preset.stepperStates.length;
  const currentStep =
    preset.stepperStates[currentStepIndex] ?? preset.stepperStates[0];

  const handleReset = () => {
    setCurrentStepIndex(0);
  };

  const handlePresetChange = (id: string) => {
    setActivePresetId(id);
    setCurrentStepIndex(0);
  };

  return (
    <ExpandableDemo id="adt-recursive-types-explorer">
      <div className="my-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-950">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
              代数数据类型（ADT）与递归类型交互探针
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ✨ <strong>多项式类型方程、Huet Zipper 形式导数与折叠展开</strong>
              ：洞悉从类型半环到图灵完备重现的数学演进
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="mb-4 overflow-x-auto pb-1">
          <CapsuleTabs
            onChange={(val) =>
              setViewMode(val as "stepper" | "zipper" | "memory")
            }
            options={VIEW_OPTIONS}
            value={viewMode}
          />
        </div>

        {/* Preset Selector */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            精选经典代数类型与递归演化预设：
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

        {/* Equation & Mu-Type Overview Card */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                代数多项式同构方程 (Polynomial Equation)
              </div>
              <div className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300">
                <InlineMath tex={preset.equationTex} />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                类型级不动点形式化 (μ-Type)
              </div>
              <div className="mt-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
                <InlineMath tex={preset.muTypeTex} />
              </div>
            </div>
          </div>
        </div>

        {/* Viewport Container with CanvasToolbar */}
        <div className="relative mb-5 flex h-[var(--demo-height,26rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-900/95 p-5 shadow-inner dark:border-slate-800">
          <CanvasToolbar onReset={handleReset} />

          {/* Stepper Toolbar (Visible in Stepper Mode) */}
          {viewMode === "stepper" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex <= 0}
                  onClick={() => setCurrentStepIndex(0)}
                  title="重置至折叠初态"
                  type="button"
                >
                  ⏮ 初始 (Folded)
                </button>
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex <= 0}
                  onClick={() =>
                    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
                  }
                  title="折叠一层包装"
                  type="button"
                >
                  fold 折叠包装 ◀
                </button>
                <button
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  disabled={currentStepIndex >= maxSteps - 1}
                  onClick={() =>
                    setCurrentStepIndex((prev) =>
                      Math.min(maxSteps - 1, prev + 1),
                    )
                  }
                  title="展开一层结构"
                  type="button"
                >
                  unfold 单步展开 ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${currentStep.statusColor}`}
                >
                  {currentStep.statusLabel}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  深度：{currentStepIndex} / {maxSteps - 1}
                </span>
              </div>
            </div>
          )}

          {/* Main View Area */}
          <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto text-center">
            {viewMode === "stepper" && (
              <div className="space-y-4 py-2">
                <div className="text-xs font-semibold text-slate-400">
                  当前 Iso-recursive 层级展开状态：
                </div>

                {/* Main Term Box */}
                <div className="flex items-center justify-center overflow-x-auto px-4 py-2">
                  <div className="rounded-2xl border border-indigo-700/60 bg-slate-800/60 px-6 py-4 shadow-xl backdrop-blur-md">
                    <div className="font-mono text-base font-bold text-slate-100 sm:text-lg">
                      <InlineMath tex={currentStep.termTex} />
                    </div>
                    <div className="mt-2 text-xs font-mono text-indigo-300">
                      类型签名：
                      <InlineMath tex={currentStep.typeTex} />
                    </div>
                  </div>
                </div>

                {/* Action & Explanation */}
                <div className="mx-auto flex max-w-xl flex-col items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 text-xs">
                  <p className="text-slate-300">{currentStep.desc}</p>
                </div>
              </div>
            )}

            {viewMode === "zipper" && (
              <div className="space-y-4 py-3 text-center">
                <div className="text-xs font-semibold text-sky-400">
                  Huet Zipper 形式导数与光标上下文
                </div>

                <div className="mx-auto max-w-xl rounded-2xl border border-sky-600/40 bg-sky-950/20 p-5 shadow-lg backdrop-blur-sm">
                  <div className="mb-2 text-xs font-medium text-slate-300">
                    一阶形式导数多项式：
                  </div>
                  <div className="my-2 font-mono text-sm font-bold text-sky-200">
                    <InlineMath tex={preset.derivativeTex} />
                  </div>
                  <div className="mt-3 text-left text-[11px] leading-relaxed text-slate-400">
                    💡 <strong>微积分几何解释</strong>：
                    {preset.zipperInterpretation}
                  </div>
                </div>
              </div>
            )}

            {viewMode === "memory" && (
              <div className="space-y-4 py-3 text-center">
                <div className="text-xs font-semibold text-rose-400">
                  物理内存连续内联 vs 指针间接层 (Box Indirection)
                </div>

                <div className="mx-auto max-w-xl rounded-2xl border border-rose-600/40 bg-rose-950/20 p-5 shadow-lg backdrop-blur-sm text-left">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-rose-900/30 p-3 border border-rose-800/50">
                      <div className="text-[11px] font-semibold text-rose-300">
                        直接连续内联布局 (Direct Inlining)
                      </div>
                      <div className="mt-1 font-mono text-xs text-rose-200">
                        {preset.memoryAnalysis.directSize}
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-900/30 p-3 border border-emerald-800/50">
                      <div className="text-[11px] font-semibold text-emerald-300">
                        Box 指针间接布局 (Box Indirection)
                      </div>
                      <div className="mt-1 font-mono text-xs text-emerald-200">
                        {preset.memoryAnalysis.boxedSize}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] leading-relaxed text-slate-300">
                    💡 <strong>编译器物理约束</strong>：
                    {preset.memoryAnalysis.explanation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Theoretical Insight Card */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
            🔍 代数结构与多项式理论洞见 (Algebraic Structure Insight)
          </div>
          <p className="mt-2 text-xs leading-relaxed text-indigo-800 dark:text-indigo-200">
            {preset.insight}
          </p>
        </div>
      </div>
    </ExpandableDemo>
  );
}
