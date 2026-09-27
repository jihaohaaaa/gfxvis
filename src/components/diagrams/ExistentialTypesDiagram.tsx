import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import PresetSelector from "../framework/PresetSelector";

// ============================================================================
// Types & Presets for Existential Types
// ============================================================================

export interface ExistentialPreset {
  id: string;
  label: string;
  desc: string;
  formalTex: string;
  witnessType: string;
  interfaceTex: string;
  packCode: string;
  safeUnpackCode: string;
  illegalEscapeCode: string;
  escapeErrorExplanation: string;
  memoryModel: {
    paradigm: string;
    overhead: string;
    layoutDescription: string;
    layoutBlocks: { name: string; size: string; role: string; color: string }[];
    assemblyHint: string;
  };
  universalVsExistential: {
    universalExample: string;
    existentialExample: string;
    callerRole: string;
    calleeRole: string;
    languageMapping: string;
  };
  insight: string;
}

const PRESETS: ExistentialPreset[] = [
  {
    id: "counter_adt",
    label: "1. 经典计数器 ADT (Counter: 隐藏内部具体表示)",
    desc: "将内部具体状态（u32 / 链表 / 闭包）封装于黑盒，仅暴露 new, inc, get 接口",
    formalTex:
      "\\exists X. \\{ \\text{new}: X, \\; \\text{inc}: X \\to X, \\; \\text{get}: X \\to \\text{Nat} \\}",
    witnessType: "u32 (见证类型 Witness Type)",
    interfaceTex:
      "\\text{Counter} = \\exists X. \\{ \\text{state}: X, \\; \\text{inc}: X \\to X, \\; \\text{get}: X \\to \\text{Nat} \\}",
    packCode:
      "// 打包 (Pack): 将内部状态 u32 隐藏进抽象类型 X\nlet c = pack {*u32, {state: 0, inc: x => x + 1, get: x => x}} as Counter;",
    safeUnpackCode:
      "// 合法开箱 (Safe Unpack): 内部使用 X，出参仅返回 Nat (非 X)\nopen c as {X, ctr} in {\n  let s1 = ctr.inc(ctr.state);\n  ctr.get(s1) // 返回类型 Nat，X 未逃逸！\n};",
    illegalEscapeCode:
      "// 非法逃逸 (Type Escape): 试图将抽象类型 X 的值传出作用域！\nopen c as {X, ctr} in {\n  ctr.inc(ctr.state) // 💥 试图返回 X 类型！编译拦截！\n};",
    escapeErrorExplanation:
      "类型安全防线拦截：类型变量 X 仅在 open 的局部作用域内有定义。如果允许返回类型包含 X 的值，外部调用方根本不知道 X 是什么类型，更可能将两个不同 Counter 包内部的 X 混淆，引发类型系统崩溃！",
    memoryModel: {
      paradigm: "抽象数据类型（ADT）经典封闭包",
      overhead: "零抽象开销（编译期擦除）或闭包堆分配（动态包装）",
      layoutDescription:
        "值在局部开箱消费，开箱作用域如同沙盒防爆舱，X 类型在箱体关闭时灰飞烟灭。",
      layoutBlocks: [
        {
          name: "witness: u32",
          size: "4 Bytes",
          role: "具体见证数据",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        },
        {
          name: "vtable / methods",
          size: "Inline Functions",
          role: "关联操作集合",
          color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        },
      ],
      assemblyHint:
        "在全静态编译下（如 Rust impl Trait），打包与解包直接被内联展开，甚至直接优化为单个寄存器自增操作！",
    },
    universalVsExistential: {
      universalExample: "fn map<T>(arr: Vec<T>) -> Vec<T>",
      existentialExample: "type Counter = exists X. { state: X, ... }",
      callerRole:
        "全称多态 (∀)：调用方指定具体的 T，被调方必须对所有 T 一视同仁",
      calleeRole:
        "存在多态 (∃)：实现方决定隐藏的 X，调用方只知道存在某种 X 具备契约",
      languageMapping:
        "TypeScript 闭包状态隐藏 / OCaml 模块签名 (Module Signature)",
    },
    insight:
      "约翰·米切尔与戈登·普洛特金（Mitchell & Plotkin 1988）的名篇《Abstract Types Have Existential Type》宣告了：所谓的模块化、接口与数据抽象，其数学本质就是逻辑学中的存在量词 ∃！",
  },
  {
    id: "rust_dyn_trait",
    label: "2. Rust dyn Trait 动态存在类型 (胖指针与对象安全)",
    desc: "运行时多态 Trait Object：数据指针 + 虚表指针，剖析为什么对象安全严禁返回 Self",
    formalTex:
      "\\&\\text{dyn Draw} \\cong \\exists X: \\text{Draw}. \\; (\\&X, \\; \\text{vtable}_X)",
    witnessType: "Button / Image (实现了 Draw Trait 的具体类型)",
    interfaceTex:
      "\\text{dyn Draw} \\cong \\exists X. \\{ \\text{data}: \\&X, \\; \\text{draw}: \\&X \\to () \\}",
    packCode:
      "let btn: Button = Button { width: 100 };\n// 隐式打包 (Pack): 向上转型为胖指针，见证类型被擦除为 dyn Draw\nlet d: &dyn Draw = &btn;",
    safeUnpackCode:
      "// 消费 Trait Object: 通过虚表间接调用方法\nd.draw(); // 安全消费，返回 ()，无需关心底层究竟是 Button 还是 Image",
    illegalEscapeCode:
      "// 对象安全拦截 (Object Safety Violation):\ntrait CloneDraw {\n  fn clone_self(&self) -> Self; // 💥 严禁！Self 逃出存在量词包！\n  fn generic_foo<T>(&self, t: T); // 💥 严禁！无法在有限虚表中放置无限泛型方法！\n}\n// let x: &dyn CloneDraw; // 编译报错: not object safe!",
    escapeErrorExplanation:
      "Rust 编译器的对象安全（Object Safety）规则正是‘类型变量严禁逃逸’的工业化身：如果方法返回 Self（即抽象变量 X），调用方无法知晓分配多大栈内存；如果方法包含泛型，虚表尺寸将不可穷尽！",
    memoryModel: {
      paradigm: "胖指针（Fat Pointer）动态分发",
      overhead: "16 字节（双倍指针宽度）+ 虚表间接寻址开销",
      layoutDescription:
        "指针由两部分组成：第一指针指向真实物理数据堆栈，第二指针指向只读内存中的虚函数跳转表（vtable）。",
      layoutBlocks: [
        {
          name: "data_ptr: *const ()",
          size: "8 Bytes",
          role: "指向擦除后的数据实例",
          color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        },
        {
          name: "vtable_ptr: *const ()",
          size: "8 Bytes",
          role: "虚表指针 (size, align, drop, methods)",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        },
      ],
      assemblyHint:
        "mov rax, [rdi + 8]   ; 加载虚表地址\ncall [rax + 24]      ; 间接跳转执行 draw 方法",
    },
    universalVsExistential: {
      universalExample: "fn draw_all<T: Draw>(items: &[T])",
      existentialExample: "fn draw_all(items: &[&dyn Draw])",
      callerRole:
        "泛型 T (∀)：同质集合，所有元素必须为同一种具体类型，静态单态化",
      calleeRole:
        "dyn Draw (∃)：异质集合，每个元素可以是不同的具体类型，运行时动态分发",
      languageMapping:
        "C++ 虚基类指针 / C# 接口引用 (IComparable) / Java 接口引用",
    },
    insight:
      "Rust 的 dyn Trait 让存在类型不仅在理论上自洽，更在内存物理结构上直接映射为‘数据指针 + 虚表指针’的优雅双字元结构。",
  },
  {
    id: "rust_impl_trait",
    label: "3. Rust impl Trait 静态存在类型 (零开销不透明类型)",
    desc: "编译期确定单态类型，向外部隐藏不可名状（Unnameable）具体闭包与迭代器链",
    formalTex:
      "\\text{fn create\\_stream()} \\to \\exists X: \\text{Iterator}\\langle\\text{Item}=\\text{i32}\\rangle. \\; X",
    witnessType: "Filter<Map<Range<i32>, closure>, closure>",
    interfaceTex:
      "\\text{Opaque} \\; X \\; \\text{where} \\; X: \\text{Iterator}\\langle\\text{Item}=\\text{i32}\\rangle",
    packCode:
      "// 静态存在类型 (Static Existential / Opaque Return Type):\nfn numbers() -> impl Iterator<Item = i32> {\n  (0..10).map(|x| x * 2).filter(|x| x > 5)\n  // 真实返回类型长达几百字符且包含唯一匿名闭包，实现方一键隐藏！\n}",
    safeUnpackCode:
      'let mut iter = numbers();\n// 调用方只能通过 Iterator 契约消费它：\nwhile let Some(n) = iter.next() {\n  println!("{}", n);\n}',
    illegalEscapeCode:
      "// 无法假定具体类型！\nlet iter1 = numbers();\nlet iter2 = (0..10).map(|x| x * 2).filter(|x| x > 5);\n// iter1 = iter2; // 💥 编译报错：impl Iterator 是独一无二的不透明存在类型！",
    escapeErrorExplanation:
      "即使代码一模一样，impl Trait 也是抽象的黑盒类型。外部绝不能假设它的物理身份，编译器阻止了任何打破抽象边界的侵入式假设。",
    memoryModel: {
      paradigm: "静态单态化存在类型（Static Opaque Type）",
      overhead: "绝对零开销（Zero Overhead）：无堆分配、无虚表、无间接跳转",
      layoutDescription:
        "在编译期，编译器完整知晓真实结构体大小，直接分配内联栈空间并进行激进的函数内联与寄存器展开。",
      layoutBlocks: [
        {
          name: "Inline Iterator Struct",
          size: "Exact Size (Stack)",
          role: "纯值直接展开在当前栈帧",
          color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        },
      ],
      assemblyHint:
        "编译产物完全消除抽象层，直接编译为极速 SIMD 向量循环或内联加乘流水线！",
    },
    universalVsExistential: {
      universalExample: "fn consume<T: Iterator>(it: T)",
      existentialExample: "fn produce() -> impl Iterator",
      callerRole: "泛型入参 (∀)：调用方传入它选定的迭代器，函数负责消费",
      calleeRole:
        "Opaque 返回值 (∃)：函数决定构造何种复杂迭代器，调用方只管消费",
      languageMapping:
        "C++20 auto 返回值配合 Concepts (`std::integral auto`) / Swift `some View`",
    },
    insight:
      "很多人以为存在类型必然导致动态分发和性能损耗，Rust 的 impl Trait（以及 Swift 的 some View）雄辩地证明：存在类型完全可以在编译期以零开销静态单态化形式完美落地！",
  },
  {
    id: "cpp_type_erasure",
    label: "4. C++ std::function 类型擦除与小对象优化 (SBO)",
    desc: "无继承耦合的泛型包装：包装任何可调用实体，SBO 规避小仿函数堆分配",
    formalTex:
      "\\text{std::function}\\langle R(Args)\\rangle \\cong \\exists F: \\text{Callable}\\langle R(Args)\\rangle. \\; F",
    witnessType: "Lambda / Functor / 函数指针 (任意可调用类型 F)",
    interfaceTex:
      "\\text{Function} \\cong \\exists F. \\{ \\text{invoke}: F \\to (Args \\to R), \\; \\text{copy}, \\; \\text{destroy} \\}",
    packCode:
      "int factor = 42;\n// 打包: std::function 把闭包类型 F 擦除隐藏于抽象壳内\nstd::function<int(int)> fn = [factor](int x) { return x * factor; };",
    safeUnpackCode:
      "// 调用方执行擦除后的统一接口：\nint result = fn(10); // 返回 420，调用方无需知晓 lambda 的真实闭包类类型",
    illegalEscapeCode:
      "// 无法还原未知名义闭包：\nauto lambda = [](int x) { return x; };\nstd::function<int(int)> fn = lambda;\n// auto orig = *fn.target<decltype(lambda)>(); // 必须精准探针，否则返回空指针 nullptr",
    escapeErrorExplanation:
      "类型擦除彻底清空了类型标签。只有当外部调用方精确知道原始类型并通过 target<T> 探针探测时才可能尝试取出，否则抽象类型保持绝对封印状态。",
    memoryModel: {
      paradigm:
        "C++ 经典类型擦除与小对象优化（SBO, Small Buffer Optimization）",
      overhead:
        "若闭包 ≤ 24/32 字节则直接在栈上内联缓冲；若超出则触发堆分配（new）",
      layoutDescription:
        "内部包含一个固定尺寸的 union 存储空间与管理/调用函数指针表（Invoker/Manager）。",
      layoutBlocks: [
        {
          name: "SBO Storage (Union)",
          size: "24~32 Bytes (Stack)",
          role: "存放小闭包或堆指针",
          color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        },
        {
          name: "invoker_ptr",
          size: "8 Bytes",
          role: "跳板调用函数指针",
          color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        },
        {
          name: "manager_ptr",
          size: "8 Bytes",
          role: "生命周期管理 (拷贝/析构)",
          color: "bg-pink-500/20 text-pink-300 border-pink-500/40",
        },
      ],
      assemblyHint: "call [rdi + 24]   ; 通过跳板指针间接调用捕获的实际仿函数",
    },
    universalVsExistential: {
      universalExample: "template<typename F> void call(F f)",
      existentialExample: "void store_callback(std::function<void()> cb)",
      callerRole:
        "模板参数 F (∀)：单态化内联，但无法放入同一个 std::vector 数组中",
      calleeRole:
        "std::function (∃)：异质数组可容纳所有签名为 void() 的不同闭包",
      languageMapping:
        "C++23 std::move_only_function / Sean Parent's Concept/Model 纯值多态",
    },
    insight:
      "C++ 著名的 Sean Parent ‘继承是万恶之源’演讲中所推崇的纯值多态（Concept/Model），本质上就是手工编写的二阶存在类型解构器！",
  },
];

// ============================================================================
// Component Definition
// ============================================================================

export default function ExistentialTypesDiagram() {
  const [activeTab, setActiveTab] = useState<
    "pack_unpack" | "memory_dispatch" | "universal_vs_existential"
  >("pack_unpack");

  const [selectedPresetId, setSelectedPresetId] =
    useState<string>("counter_adt");
  const [isIllegalEscape, setIsIllegalEscape] = useState<boolean>(false);
  const [isPacked, setIsPacked] = useState<boolean>(true);

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleReset = () => {
    setSelectedPresetId("counter_adt");
    setActiveTab("pack_unpack");
    setIsIllegalEscape(false);
    setIsPacked(true);
  };

  return (
    <AutoMath>
      <ExpandableDemo id="existential-types-sandbox">
        <div className="my-8 rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
          {/* Header Info */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>存在类型（Existential Types）交互探针</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  ∃X. T ≅ 信息隐藏与数据抽象
                </span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                动态演示“打包（Pack）/
                开箱（Unpack）”、类型变量严禁逃逸拦截、物理内存分发（单态化 vs
                胖指针 vs SBO）及 ∀ 与 ∃ 的权力天平。
              </p>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              核心理论与工业界代表预设
            </label>
            <PresetSelector
              options={PRESETS.map((p) => ({
                id: p.id,
                label: p.label,
                description: p.desc,
              }))}
              value={selectedPresetId}
              onChange={(id: string) => {
                setSelectedPresetId(id);
                setIsIllegalEscape(false);
                setIsPacked(true);
              }}
            />
          </div>

          {/* Mode Capsule Tabs */}
          <div className="mb-4">
            <CapsuleTabs
              options={[
                { id: "pack_unpack", label: "黑盒打包与开箱逃逸拦截" },
                { id: "memory_dispatch", label: "物理内存与分发视图" },
                {
                  id: "universal_vs_existential",
                  label: "∀ 与 ∃ 权力天平对比",
                },
              ]}
              value={activeTab}
              onChange={(tab) =>
                setActiveTab(
                  tab as
                    | "pack_unpack"
                    | "memory_dispatch"
                    | "universal_vs_existential",
                )
              }
              size="sm"
            />
          </div>

          {/* Main Interactive Stage Container */}
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-card/60 p-4 sm:p-5 h-[var(--demo-height,28rem)] flex flex-col justify-between">
            {/* Canvas Toolbar with S/M/L heights */}
            <CanvasToolbar onReset={handleReset} />

            {/* Tab 1: Pack / Unpack & Type Escape Alert View */}
            {activeTab === "pack_unpack" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Top Math & Witness Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-card/80 p-3 border border-border/60">
                    <span className="text-muted-foreground font-semibold block mb-1">
                      形式化抽象存在类型声明
                    </span>
                    <div className="text-primary font-mono text-sm py-1 overflow-x-auto">
                      {`$${currentPreset.formalTex}$`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      见证实体类型：<strong>{currentPreset.witnessType}</strong>
                    </div>
                  </div>

                  <div className="rounded-lg bg-card/80 p-3 border border-border/60 flex flex-col justify-between">
                    <div>
                      <span className="text-muted-foreground font-semibold block mb-1">
                        沙盒开关：代换与逃逸测试
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsIllegalEscape(false)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            !isIllegalEscape
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          合法安全开箱 (X 未逃逸)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsIllegalEscape(true)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            isIllegalEscape
                              ? "bg-red-600 text-white shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          尝试非法逃逸 X (Type Escape)
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px]">
                      状态：
                      <span
                        className={`font-semibold ${
                          !isIllegalEscape ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {!isIllegalEscape
                          ? "● 通过类型检查 (Type Safe)"
                          : "▲ 拦截类型变量逃逸 (Type Violation)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blackbox Packaging Visual */}
                <div className="rounded-lg bg-muted/30 p-3.5 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-mono font-bold text-primary text-xl shadow-inner">
                      ∃X
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        存在类型密封黑盒 (Opaque Box)
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {isPacked
                          ? "封包状态：外部不可见内部见证类型，仅通过契约交互"
                          : "拆包状态：局部作用域内解开 X，受沙盒严密隔离"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPacked(!isPacked)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                  >
                    {isPacked
                      ? "点击模拟局部开箱 (open c)"
                      : "点击重新封存 (pack)"}
                  </button>
                </div>

                {/* Code & Logic Sandbox */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 text-xs">
                  <div className="rounded-lg bg-card/80 p-3 border border-border/60 font-mono flex flex-col justify-between">
                    <div>
                      <div className="text-muted-foreground font-semibold text-[11px] mb-1.5 flex items-center justify-between">
                        <span>1. 实现方代码：打包（Pack）操作</span>
                        <span className="text-[10px] text-primary">
                          信息隐藏
                        </span>
                      </div>
                      <pre className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11px] bg-muted/20 p-2.5 rounded border border-border/40">
                        {currentPreset.packCode}
                      </pre>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2 border-t border-border/40 pt-1.5">
                      实现方在这一步把具体的{" "}
                      <strong>{currentPreset.witnessType}</strong> 封入黑盒。
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-3 border font-mono flex flex-col justify-between transition-colors ${
                      !isIllegalEscape
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/25 border-red-500/50 text-red-300"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[11px] mb-1.5 flex items-center justify-between">
                        <span>
                          2. 调用方代码：
                          {!isIllegalEscape ? "合法使用" : "非法逃逸 (拦截)"}
                        </span>
                        <span className="text-[10px] font-bold">
                          {!isIllegalEscape ? "SAFE UNPACK" : "ESCAPE TRAPPED"}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap leading-relaxed text-[11px] bg-black/30 p-2.5 rounded border border-white/10 text-foreground/90">
                        {!isIllegalEscape
                          ? currentPreset.safeUnpackCode
                          : currentPreset.illegalEscapeCode}
                      </pre>
                    </div>

                    <div className="text-[11px] mt-2 border-t border-white/10 pt-1.5">
                      {!isIllegalEscape ? (
                        <span className="text-emerald-400">
                          ✅ 开箱后只提取了不含类型变量 X
                          的结果，类型系统安全证明成立。
                        </span>
                      ) : (
                        <span className="text-red-400">
                          ❌ {currentPreset.escapeErrorExplanation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Memory & Dispatch View */}
            {activeTab === "memory_dispatch" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="rounded-lg bg-card/80 p-3 border border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <span className="font-bold text-sm text-foreground">
                      物理实现范式：{currentPreset.memoryModel.paradigm}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                      开销模型：{currentPreset.memoryModel.overhead}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentPreset.memoryModel.layoutDescription}
                  </p>
                </div>

                {/* Visual Memory Blocks */}
                <div className="rounded-lg bg-muted/20 p-4 border border-border/60">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                    物理内存空间划分与指针拓扑 (Memory Layout)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {currentPreset.memoryModel.layoutBlocks.map(
                      (block, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 flex flex-col justify-between ${block.color}`}
                        >
                          <div>
                            <div className="font-mono font-bold text-xs">
                              {block.name}
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">
                              {block.role}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono mt-3 opacity-90 border-t border-current/20 pt-1">
                            物理尺寸：{block.size}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Assembly / Compiler Micro-architectural Hint */}
                <div className="rounded-lg bg-card/90 p-3.5 border border-border/60 font-mono text-xs">
                  <span className="text-muted-foreground font-semibold block mb-1.5 text-[11px]">
                    编译器汇编 / 分发微架构剖析 (Assembly Codegen Trace)
                  </span>
                  <pre className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11px] bg-muted/30 p-2.5 rounded border border-border/40">
                    {currentPreset.memoryModel.assemblyHint}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Universal vs Existential Balance View */}
            {activeTab === "universal_vs_existential" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="text-center max-w-xl mx-auto py-1">
                  <h4 className="text-sm font-bold text-foreground">
                    全称多态（∀, Generics）与存在多态（∃, ADT）的权力天平
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    调用方与实现方的绝对控制权反转：谁在指定类型？谁在隐藏类型？
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {/* Universal Side */}
                  <div className="rounded-lg border border-blue-500/30 bg-blue-950/15 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-blue-500/20 mb-2.5">
                        <span className="text-xs font-bold text-blue-400">
                          全称量词 ∀X (Universal Types)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                          泛型函数
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground text-[11px] block">
                            代码范式：
                          </span>
                          <code className="text-[11px] font-mono text-blue-200">
                            {
                              currentPreset.universalVsExistential
                                .universalExample
                            }
                          </code>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong>权力归属：</strong>
                          {currentPreset.universalVsExistential.callerRole}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong>类型透明度：</strong>
                          类型完全透明。调用方随时知道具体是 string 还是 int。
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-blue-300/80 font-mono mt-3 border-t border-blue-500/20 pt-1.5">
                      关系隐喻：雇主（调用方）指派工种，工人必须服从任何合规材料。
                    </div>
                  </div>

                  {/* Existential Side */}
                  <div className="rounded-lg border border-purple-500/30 bg-purple-950/15 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2.5">
                        <span className="text-xs font-bold text-purple-400">
                          存在量词 ∃X (Existential Types)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                          抽象接口 / 模块
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground text-[11px] block">
                            代码范式：
                          </span>
                          <code className="text-[11px] font-mono text-purple-200">
                            {
                              currentPreset.universalVsExistential
                                .existentialExample
                            }
                          </code>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong>权力归属：</strong>
                          {currentPreset.universalVsExistential.calleeRole}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong>类型不透明度：</strong>
                          彻底黑盒封印。两个相同接口的实例甚至无法直接比较相等（无法假设内部具体类型相同）。
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-purple-300/80 font-mono mt-3 border-t border-purple-500/20 pt-1.5">
                      映射关系：
                      {currentPreset.universalVsExistential.languageMapping}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Insight */}
            <div className="mt-3 rounded bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/40 flex items-start gap-2">
              <span className="text-primary font-bold">💡 理论洞见：</span>
              <span className="flex-1">{currentPreset.insight}</span>
            </div>
            <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
          </div>

          <details className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <summary className="font-semibold text-foreground cursor-pointer select-none">
              存在类型（∃X. T）与现代语言信息隐藏理论深度速查
            </summary>
            <div className="mt-3 text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                <strong>1. Mitchell & Plotkin 定理（1988）</strong>：
                “抽象数据类型（Abstract Data
                Types）就是存在类型”。类（Class）中的私有成员变量、闭包中捕获的环境变量，其数学实质都是被存在量词
                ∃ 绑定的具体见证类型（Witness Type）。
              </p>
              <p>
                <strong>2. 为什么开箱时类型变量严禁逃逸？</strong>：
                打字规则形式化要求：若 {"$\\Gamma \\vdash e: \\exists X. T$"}
                ，且在扩展上下文 {"$\\Gamma, X, x: T$"} 下表达式 $t: U$ ，则仅当{" "}
                {"$X \\notin \\text{FTV}(U)$"}
                （即类型变量 X 不出现在目标类型 U
                的自由类型变量集合中）时，解包表达式{" "}
                {
                  "$\\text{open } e \\text{ as } \\{X, x\\} \\text{ in } t$"
                }{" "}
                的类型才合法推导为 $U$ 。若 X
                逃逸出作用域，调用方将面临无法对齐的悬挂类型（Dangling Type
                Variable）。
              </p>
              <p>
                <strong>3. Rust 对象安全（Object Safety）的深层本质</strong>：
                Rust 编译器为何禁止{" "}
                <code className="text-primary">fn clone(&self) -&gt; Self</code>{" "}
                放入 <code className="text-primary">dyn Trait</code>？因为{" "}
                <code className="text-primary">Self</code>{" "}
                正是被存在量词隐藏的抽象变量 X！一旦返回{" "}
                <code className="text-primary">Self</code>，就相当于强行让 X
                逃离了 Trait Object 的黑盒，直接打破了开箱无逃逸的理论铁律。
              </p>
            </div>
          </details>
        </div>
      </ExpandableDemo>
    </AutoMath>
  );
}
