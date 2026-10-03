import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import InteractiveLayout from "../framework/InteractiveLayout";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import KdeMessageBar from "../framework/KdeMessageBar";
import CodePlayground from "../framework/CodePlayground";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import PresetSelector from "../framework/PresetSelector";
import KdeButton from "../framework/KdeButton";

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
          color:
            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40",
        },
        {
          name: "vtable / methods",
          size: "Inline Functions",
          role: "关联操作集合",
          color:
            "bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-500/40",
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
      "\\&\\text{dyn Trait} = (\\text{data: *const ()}, \\; \\text{vtable: *const ()})",
    packCode:
      'let btn = Button { label: "OK" };\n// 打包 (Coercion): 具体类型 Button 被擦除为 dyn Draw\nlet drawable: &dyn Draw = &btn;',
    safeUnpackCode:
      "// 调用方通过胖指针虚表动态分发：\ndrawable.draw(); // 内部解开 X 并调用 vtable->draw(data)",
    illegalEscapeCode:
      "// 破坏对象安全 (Object Safety) 尝试：\ntrait CloneDraw: Draw { fn clone(&self) -> Self; }\n// let d: &dyn CloneDraw; // 💥 编译报错 E0038: Self 逃逸！",
    escapeErrorExplanation:
      "Rust 对象安全铁律：如果方法返回 Self，由于 dyn Trait 擦除了具体类型，调用方在栈上根本无法预先获知 Self 的内存尺寸（sizeof(Self) 不定），也无法静态调用任何非虚表方法，违反存在类型无逃逸约束！",
    memoryModel: {
      paradigm: "Rust 动态 Trait Object 胖指针（Fat Pointer）",
      overhead: "16 字节栈空间（8B 数据指针 + 8B 虚表指针）+ 一次间接跳转开销",
      layoutDescription:
        "数据指针指向堆或栈上的具体结构体，虚表指针指向静态区包含析构函数、大小、对齐与方法函数指针的只读表。",
      layoutBlocks: [
        {
          name: "data_ptr (*const ())",
          size: "8 Bytes",
          role: "指向未知名义数据 X 的地址",
          color:
            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40",
        },
        {
          name: "vtable_ptr (*const Vtable)",
          size: "8 Bytes",
          role: "指向 X 的虚函数派发表",
          color:
            "bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/40",
        },
      ],
      assemblyHint:
        "mov rax, [rsi + 8]   ; 取出 vtable 指针\ncall [rax + 24]      ; 间接调用虚表中第 3 个函数",
    },
    universalVsExistential: {
      universalExample: "fn render<T: Draw>(item: T)",
      existentialExample: "fn render(item: &dyn Draw)",
      callerRole: "静态泛型 (∀)：调用方指定 T，单态化生成独立机器码",
      calleeRole:
        "动态存在 (∃)：函数接收任意实现了 Draw 的对象，共享同一份机器码",
      languageMapping: "C++ 虚基类接口指针 / Go interface{} 动态包装",
    },
    insight:
      "Rust 的 dyn Trait 本质上就是存在类型（Existential Type）在硬件物理内存中的标准投影——用 16 字节的胖指针精确容纳了‘存在某个实现了契约的类型 X’的全部必要信息。",
  },
  {
    id: "rust_impl_trait",
    label: "3. Rust impl Trait 静态存在类型 (单态化与零开销)",
    desc: "编译期存在类型：隐藏复杂闭包或私有结构体名称，保持 100% 单态化内联",
    formalTex:
      "\\text{fn produce}() \\to \\exists X: \\text{Iterator}\\langle\\text{Item}=u32\\rangle. \\; X",
    witnessType: "Map<Filter<Range<u32>, ...>, ...> (极其冗长的嵌套类型)",
    interfaceTex: "fn numbers() -> impl Iterator<Item = u32>",
    packCode:
      "// 打包 (Opaque Return Type): 隐藏长达数百字符的嵌套迭代器类型\nfn numbers() -> impl Iterator<Item = u32> {\n    (0..100).filter(|x| x % 2 == 0).map(|x| x * 2)\n}",
    safeUnpackCode:
      '// 调用方开箱：编译器静态知晓确切内存大小并直接进行循环展开\nfor n in numbers() {\n    println!("{}", n);\n}',
    illegalEscapeCode:
      "// 试图假设具体的迭代器类型：\nlet it = numbers();\n// let exact: Filter<Range<u32>> = it; // 💥 编译报错：不透明类型严禁逆向推导！",
    escapeErrorExplanation:
      "impl Trait 在语法上创造了绝对的类型不透明壁垒（Type Invisibility），调用方只能依赖 Iterator 提供的公有 API，无法对其进行任何具体类型的强转或模式匹配。",
    memoryModel: {
      paradigm: "Rust 编译期静态存在类型（Opaque Type）",
      overhead: "零运行时开销（0 额外指针，0 虚表，100% 静态内联优化）",
      layoutDescription:
        "编译器在单态化阶段替换为真实结构体尺寸，在栈上精确分配空间，LLVM 后端可将整个迭代管道完全向量化并内联折叠！",
      layoutBlocks: [
        {
          name: "inlined_data",
          size: "24 Bytes (Exact)",
          role: "直接存放内部结构体字段",
          color:
            "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40",
        },
      ],
      assemblyHint:
        "; 编译器完全消除了函数调用，直接生成 SIMD 向量累加指令\npaddd xmm0, xmm1",
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
          color:
            "bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-500/40",
        },
        {
          name: "invoker_ptr",
          size: "8 Bytes",
          role: "跳板调用函数指针",
          color:
            "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border border-indigo-500/40",
        },
        {
          name: "manager_ptr",
          size: "8 Bytes",
          role: "生命周期管理 (拷贝/析构)",
          color:
            "bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40",
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

const VIEW_OPTIONS: readonly KdeTabOption<
  | "pack_unpack"
  | "memory_dispatch"
  | "universal_vs_existential"
  | "code_sandbox"
>[] = [
  { id: "pack_unpack", label: "黑盒打包与开箱逃逸拦截" },
  { id: "memory_dispatch", label: "物理内存与分发视图" },
  { id: "universal_vs_existential", label: "∀ 与 ∃ 权力天平对比" },
  { id: "code_sandbox", label: "Rust 存在类型沙盒" },
];

const EXISTENTIAL_RUST_CODE = `// Rust 中的静态存在类型 (impl Trait) 与动态存在类型 (dyn Trait)
trait Counter {
    fn inc(&mut self);
    fn get(&self) -> u32;
}

struct FastCounter(u32);
impl Counter for FastCounter {
    fn inc(&mut self) { self.0 += 1; }
    fn get(&self) -> u32 { self.0 }
}

// 1. 静态存在类型 (impl Trait): 隐藏具体类型，零运行时开销 (单态化)
fn make_counter() -> impl Counter {
    FastCounter(0)
}

// 2. 动态存在类型 (dyn Trait 胖指针): 动态虚表分发 [数据指针 + 虚表指针]
fn process_counter(c: &mut dyn Counter) {
    c.inc();
    println!("Counter 当前值: {}", c.get());
}

fn main() {
    let mut static_ctr = make_counter();
    static_ctr.inc();
    println!("[impl Trait] 静态存在类型值: {}", static_ctr.get());

    let mut boxed: Box<dyn Counter> = Box::new(FastCounter(10));
    process_counter(&mut *boxed);
}
`;

export default function ExistentialTypesDiagram() {
  const [activeTab, setActiveTab] = useState<
    | "pack_unpack"
    | "memory_dispatch"
    | "universal_vs_existential"
    | "code_sandbox"
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
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · EXISTENTIAL TYPES"
          mark="∃"
          modeTag="DENSE-DOCK"
          title="存在类型（Existential Types）交互探针"
        >
          <InteractiveLayout
            preset="dense-dock"
            top={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--kde-muted)]">
                    探针视角：
                  </span>
                  <KdeTabs
                    onChange={(val) => setActiveTab(val)}
                    options={VIEW_OPTIONS}
                    size="sm"
                    value={activeTab}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <KdeBadge variant="primary">
                    {`∃-Type: $${currentPreset.formalTex}$`}
                  </KdeBadge>
                </div>
              </div>
            }
            main={
              <div className="relative flex h-[var(--demo-height,28rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--kde-border)] bg-[var(--kde-canvas)] p-5 shadow-inner">
                <CanvasToolbar onReset={handleReset} />

                {activeTab === "code_sandbox" ? (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                    <CodePlayground
                      code={EXISTENTIAL_RUST_CODE}
                      description="现场调用本地 rustc -O 编译并运行静态存在类型与动态虚表胖指针分发。"
                      lang="rust"
                      maxHeight="20rem"
                      title="Rust 存在类型沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Pack / Unpack & Type Escape Alert View */}
                    {activeTab === "pack_unpack" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        {/* Top Math & Witness Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)]">
                            <span className="text-[var(--kde-muted)] font-semibold block mb-1">
                              形式化抽象存在类型声明
                            </span>
                            <div className="text-[var(--kde-accent)] font-mono text-sm py-1 overflow-x-auto">
                              {`$${currentPreset.formalTex}$`}
                            </div>
                            <div className="text-[11px] text-[var(--kde-muted)] mt-1">
                              见证实体类型：
                              <strong className="text-[var(--kde-ink)]">
                                {currentPreset.witnessType}
                              </strong>
                            </div>
                          </div>

                          <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col justify-between">
                            <div>
                              <span className="text-[var(--kde-muted)] font-semibold block mb-1">
                                沙盒开关：代换与逃逸测试
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <KdeButton
                                  size="xs"
                                  variant={
                                    !isIllegalEscape ? "success" : "default"
                                  }
                                  onClick={() => setIsIllegalEscape(false)}
                                >
                                  合法安全开箱 (X 未逃逸)
                                </KdeButton>
                                <KdeButton
                                  size="xs"
                                  variant={
                                    isIllegalEscape ? "danger" : "default"
                                  }
                                  onClick={() => setIsIllegalEscape(true)}
                                >
                                  尝试非法逃逸 X (Type Escape)
                                </KdeButton>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px]">
                              状态：
                              <span
                                className={`font-semibold ${
                                  !isIllegalEscape
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-700 dark:text-rose-400"
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
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3.5 border border-[var(--kde-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="h-12 w-12 rounded-lg bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center font-mono font-bold text-indigo-700 dark:text-indigo-300 text-xl shadow-xs">
                              ∃X
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[var(--kde-ink)]">
                                存在类型密封黑盒 (Opaque Box)
                              </div>
                              <div className="text-[11px] text-[var(--kde-muted)] font-mono mt-0.5">
                                {isPacked
                                  ? "封包状态：外部不可见内部见证类型，仅通过契约交互"
                                  : "拆包状态：局部作用域内解开 X，受沙盒严密隔离"}
                              </div>
                            </div>
                          </div>

                          <KdeButton
                            size="xs"
                            variant="default"
                            onClick={() => setIsPacked(!isPacked)}
                          >
                            {isPacked
                              ? "点击模拟局部开箱 (open c)"
                              : "点击重新封存 (pack)"}
                          </KdeButton>
                        </div>

                        {/* Code & Logic Sandbox */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 text-xs">
                          <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] font-mono flex flex-col justify-between">
                            <div>
                              <div className="text-[var(--kde-muted)] font-semibold text-[11px] mb-1.5 flex items-center justify-between">
                                <span>1. 实现方代码：打包（Pack）操作</span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                  信息隐藏
                                </span>
                              </div>
                              <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {currentPreset.packCode}
                              </pre>
                            </div>
                            <div className="text-[11px] text-[var(--kde-muted)] mt-2 border-t border-[var(--kde-border)] pt-1.5">
                              实现方在这一步把具体的{" "}
                              <strong className="text-[var(--kde-ink)]">
                                {currentPreset.witnessType}
                              </strong>{" "}
                              封入黑盒。
                            </div>
                          </div>

                          <div
                            className={`rounded-lg p-3 border font-mono flex flex-col justify-between transition-colors ${
                              !isIllegalEscape
                                ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--kde-ink)] ring-1 ring-emerald-500/20"
                                : "bg-rose-500/10 border-rose-500/40 text-[var(--kde-ink)] ring-1 ring-rose-500/20"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-[11px] mb-1.5 flex items-center justify-between">
                                <span>
                                  2. 调用方代码：
                                  {!isIllegalEscape
                                    ? "合法使用"
                                    : "非法逃逸 (拦截)"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    !isIllegalEscape
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-rose-700 dark:text-rose-400"
                                  }`}
                                >
                                  {!isIllegalEscape
                                    ? "SAFE UNPACK"
                                    : "ESCAPE TRAPPED"}
                                </span>
                              </div>
                              <pre className="whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)] text-[var(--kde-ink)]">
                                {!isIllegalEscape
                                  ? currentPreset.safeUnpackCode
                                  : currentPreset.illegalEscapeCode}
                              </pre>
                            </div>

                            <div className="mt-2.5">
                              {!isIllegalEscape ? (
                                <KdeMessageBar variant="success" mode="card">
                                  开箱后只提取了不含类型变量 X
                                  的结果，类型系统安全证明成立。
                                </KdeMessageBar>
                              ) : (
                                <KdeMessageBar
                                  variant="danger"
                                  mode="card"
                                  title="类型变量逃逸拦截"
                                >
                                  {currentPreset.escapeErrorExplanation}
                                </KdeMessageBar>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Memory & Dispatch View */}
                    {activeTab === "memory_dispatch" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                            <span className="font-bold text-sm text-[var(--kde-ink)]">
                              物理实现范式：{currentPreset.memoryModel.paradigm}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 font-mono border border-indigo-500/30">
                              开销模型：{currentPreset.memoryModel.overhead}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--kde-muted)] leading-relaxed">
                            {currentPreset.memoryModel.layoutDescription}
                          </p>
                        </div>

                        {/* Visual Memory Blocks */}
                        <div className="rounded-lg bg-[var(--kde-raised)] p-4 border border-[var(--kde-border)]">
                          <div className="text-xs font-semibold text-[var(--kde-muted)] uppercase tracking-wider mb-2.5">
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
                                    <div className="text-[11px] opacity-90 mt-1">
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
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3.5 border border-[var(--kde-border)] font-mono text-xs">
                          <span className="text-[var(--kde-muted)] font-semibold block mb-1.5 text-[11px]">
                            编译器汇编 / 分发微架构剖析 (Assembly Codegen Trace)
                          </span>
                          <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                            {currentPreset.memoryModel.assemblyHint}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Universal vs Existential Balance View */}
                    {activeTab === "universal_vs_existential" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-1">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            全称多态（∀, Generics）与存在多态（∃,
                            ADT）的权力天平
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            调用方与实现方的绝对控制权反转：谁在指定类型？谁在隐藏类型？
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                          {/* Universal Side */}
                          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 text-[var(--kde-ink)] p-3.5 flex flex-col justify-between ring-1 ring-sky-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-sky-500/20 mb-2.5">
                                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                                  全称量词 ∀X (Universal Types)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200 font-mono">
                                  泛型函数
                                </span>
                              </div>
                              <div className="text-xs space-y-2">
                                <div>
                                  <span className="text-[var(--kde-muted)] text-[11px] block">
                                    代码范式：
                                  </span>
                                  <code className="text-[11px] font-mono text-[var(--kde-ink)] bg-[var(--kde-panel)] px-1.5 py-0.5 rounded border border-[var(--kde-border)]">
                                    {
                                      currentPreset.universalVsExistential
                                        .universalExample
                                    }
                                  </code>
                                </div>
                                <div className="text-[11px] text-[var(--kde-ink)] leading-relaxed">
                                  <strong>权力归属：</strong>
                                  <span className="text-[var(--kde-muted)]">
                                    {
                                      currentPreset.universalVsExistential
                                        .callerRole
                                    }
                                  </span>
                                </div>
                                <div className="text-[11px] text-[var(--kde-ink)] leading-relaxed">
                                  <strong>类型透明度：</strong>
                                  <span className="text-[var(--kde-muted)]">
                                    类型完全透明。调用方随时知道具体是 string
                                    还是 int。
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-[10px] text-sky-800 dark:text-sky-300 font-mono mt-3 border-t border-sky-500/20 pt-1.5">
                              关系隐喻：雇主（调用方）指派工种，工人必须服从任何合规材料。
                            </div>
                          </div>

                          {/* Existential Side */}
                          <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 text-[var(--kde-ink)] p-3.5 flex flex-col justify-between ring-1 ring-purple-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2.5">
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                  存在量词 ∃X (Existential Types)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-200 font-mono">
                                  抽象接口 / 模块
                                </span>
                              </div>
                              <div className="text-xs space-y-2">
                                <div>
                                  <span className="text-[var(--kde-muted)] text-[11px] block">
                                    代码范式：
                                  </span>
                                  <code className="text-[11px] font-mono text-[var(--kde-ink)] bg-[var(--kde-panel)] px-1.5 py-0.5 rounded border border-[var(--kde-border)]">
                                    {
                                      currentPreset.universalVsExistential
                                        .existentialExample
                                    }
                                  </code>
                                </div>
                                <div className="text-[11px] text-[var(--kde-ink)] leading-relaxed">
                                  <strong>权力归属：</strong>
                                  <span className="text-[var(--kde-muted)]">
                                    {
                                      currentPreset.universalVsExistential
                                        .calleeRole
                                    }
                                  </span>
                                </div>
                                <div className="text-[11px] text-[var(--kde-ink)] leading-relaxed">
                                  <strong>类型不透明度：</strong>
                                  <span className="text-[var(--kde-muted)]">
                                    彻底黑盒封印。两个相同接口的实例甚至无法直接比较相等（无法假设内部具体类型相同）。
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-[10px] text-purple-800 dark:text-purple-300 font-mono mt-3 border-t border-purple-500/20 pt-1.5">
                              映射关系：
                              {
                                currentPreset.universalVsExistential
                                  .languageMapping
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />
              </div>
            }
            side={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <KdeCard title="核心理论与工业界代表预设" variant="dense">
                  <PresetSelector
                    layout="vertical"
                    size="xs"
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
                </KdeCard>

                <KdeCard title="开箱与逃逸模拟控制" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">状态：</span>
                      <span
                        className={`font-semibold text-[11px] ${
                          !isIllegalEscape
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {!isIllegalEscape
                          ? "● 类型安全 (Safe)"
                          : "▲ 逃逸拦截 (Escape Error)"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <KdeButton
                        size="xs"
                        variant={!isIllegalEscape ? "primary" : "default"}
                        onClick={() => setIsIllegalEscape(false)}
                      >
                        安全开箱消费
                      </KdeButton>
                      <KdeButton
                        size="xs"
                        variant={isIllegalEscape ? "danger" : "default"}
                        onClick={() => setIsIllegalEscape(true)}
                      >
                        尝试非法逃逸 X
                      </KdeButton>
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="存在量化形式公理" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="p-1.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)] overflow-x-auto">
                      {`$${currentPreset.formalTex}$`}
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)]">
                      见证实体类型：
                      <strong className="text-[var(--kde-ink)]">
                        {currentPreset.witnessType}
                      </strong>
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <KdeCard title="🔍 存在类型理论洞见 (Existential Types Insight)">
                <p className="mt-1 text-xs leading-relaxed text-[var(--kde-ink)]">
                  {currentPreset.insight}
                </p>
              </KdeCard>
            }
          />
        </KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
