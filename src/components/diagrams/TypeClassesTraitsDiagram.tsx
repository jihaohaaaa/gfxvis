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
// Types & Presets for Type Classes & Traits
// ============================================================================

export interface TypeClassPreset {
  id: string;
  label: string;
  desc: string;
  formalTex: string;
  typeclassName: string;
  originalCode: string;
  desugaredCode: string;
  coherenceScenario: {
    crateA: string;
    crateB: string;
    crateC: string;
    isViolating: boolean;
    compilerOutcome: string;
    diagnosticMessage: string;
  };
  rustVsCpp: {
    rustCode: string;
    cppCode: string;
    rustPhilosophy: string;
    cppPhilosophy: string;
    rustPros: string;
    cppPros: string;
  };
  insight: string;
}

const PRESETS: TypeClassPreset[] = [
  {
    id: "eq_show",
    label: "1. 经典 Haskell Eq/Show (字典传递脱糖基准)",
    desc: "将类型类约束脱糖为隐式数据字典（Dictionary Passing）：T: Eq => dict_Eq_T",
    formalTex:
      "\\text{class } \\text{Eq } a \\text{ where } (==) :: a \\to a \\to \\text{Bool}",
    typeclassName: "Eq<T> (等价性判定类型类)",
    originalCode:
      "// 原始高层代码：带有类型类约束\nfn contains<T: Eq>(list: &[T], target: &T) -> bool {\n  for item in list {\n    if item == target { return true; }\n  }\n  false\n}",
    desugaredCode:
      "// 编译器脱糖产物：隐式字典传递 (Dictionary Passing)\nstruct EqDict<T> {\n  eq: fn(&T, &T) -> bool,\n}\n\nfn contains_desugared<T>(\n  dict_Eq_T: &EqDict<T>, // 编译器隐式注入的字典参数！\n  list: &[T], \n  target: &T\n) -> bool {\n  for item in list {\n    if (dict_Eq_T.eq)(item, target) { return true; }\n  }\n  false\n}",
    coherenceScenario: {
      crateA: "crate_core: 定义了类型 struct UserID(u64)",
      crateB: "crate_crypto: 定义了类型类 trait Hashable",
      crateC: "crate_app: 试图书写 impl Hashable for UserID",
      isViolating: false,
      compilerOutcome:
        "✅ 合法通过：在当前应用模块内完成孤儿规则适配或使用 Newtype 包装",
      diagnosticMessage:
        "💥 编译器拦截：error[E0117] 违反孤儿规则！无法为外部类型实现外部 Trait，全局一致性（Coherence）被摧毁！",
    },
    rustVsCpp: {
      rustCode:
        "// Rust: 必须显式实现 Trait\ntrait Summable {\n  fn sum(&self) -> f64;\n}\n\nimpl Summable for Point {\n  fn sum(&self) -> f64 { self.x + self.y }\n}",
      cppCode:
        "// C++20: 隐式满足 Concept，无需显式 impl！\ntemplate<typename T>\nconcept Summable = requires(T a) {\n  { a.sum() } -> std::convertible_to<double>;\n};\n// Point 只要有 sum() 方法，自动满足 Summable！",
      rustPhilosophy:
        "显式名义契约（Explicit Nominal）：意图清晰、重构安全、杜绝巧合匹配",
      cppPhilosophy:
        "隐式结构谓词（Implicit Structural）：非侵入式、极度灵活、零胶水代码",
      rustPros: "避免两个方法名相同但语义南辕北辙的结构体发生意外匹配",
      cppPros: "无需为第三方库类型编写包装层，只要签名吻合即可无缝融入泛型算法",
    },
    insight:
      "菲利普·瓦德勒在 1989 年引入的‘字典传递转换（Dictionary Passing）’雄辩地揭示出：类型类在语义上就等于‘在调用时由编译器自动查找并悄悄传递的方法表指针’！",
  },
  {
    id: "rust_coherence",
    label: "2. Rust 孤儿规则与全局唯一性 (Coherence 防线)",
    desc: "为什么 Rust 严禁为外部类型实现外部 Trait？二义性崩溃与 E0117 拦截",
    formalTex:
      "\\text{Coherence: } \\forall T, \\text{Trait}. \\; |\\{ \\text{impl Trait for } T \\}| \\le 1",
    typeclassName: "Display (标准库格式化 Trait)",
    originalCode:
      "// 孤儿规则 (The Orphan Rule)：\n// impl<T> Display for Vec<T> // 💥 严禁！\n// 目标 Trait (Display) 来自 std，目标类型 (Vec) 亦来自 std！",
    desugaredCode:
      '// 正确解法：使用 Newtype 模式重夺所有权\nstruct MyVec<T>(pub Vec<T>); // 本地定义的新类型\n\nimpl<T: std::fmt::Display> std::fmt::Display for MyVec<T> {\n  fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {\n    write!(f, "[...]")\n  }\n}',
    coherenceScenario: {
      crateA: "crate_alpha: 为 std::string::String 实现了 Serialize",
      crateB:
        "crate_beta: 同样为 std::string::String 实现了 Serialize (不同格式)",
      crateC: "app_main: 同时依赖 alpha 和 beta，调用 str.serialize()",
      isViolating: true,
      compilerOutcome:
        "💥 编译器拦截：error[E0117] 违反孤儿规则 (Orphan Rule Violation)",
      diagnosticMessage:
        "全局一致性（Coherence）被摧毁！编译器无法在两个相互冲突的全局实现之间做出抉择，二义性将导致静默的数据序列化灾难！",
    },
    rustVsCpp: {
      rustCode:
        "// 强一致性防御：拒绝重复实现\nimpl PartialEq for Point { ... }\n// 编译器保证整个世界只有这一份 Point 的相等性定义！",
      cppCode:
        "// C++ 无孤儿规则：可在命名空间内自由重载\nbool operator==(const Point& a, const Point& b) { ... }\n// 若多个头文件重载冲突，可能引发 ODR (One Definition Rule) 违规或链接期报错",
      rustPhilosophy:
        "全局一致性第一（Coherence Over Convenience）：绝不允许哈希表因判等实现漂移而损坏",
      cppPhilosophy:
        "自由组合优先：允许在局部作用域通过 ADL（参数依赖查找）注入特化重载",
      rustPros: "重构无后顾之忧，库无论如何升级都不会出现静默行为漂移",
      cppPros: "可以灵活为任意既有类型外挂自定义操作符",
    },
    insight:
      "如果允许外部孤儿实现，当一个程序引用了两个相互不知情的依赖包时，只要它们‘心有灵犀’地为同一标准类型实现了同一接口，整个程序就会在依赖升级时轰然崩溃！",
  },
  {
    id: "cpp20_concepts",
    label: "3. C++20 Concepts 概念约束 (隐式结构化匹配)",
    desc: "C++ 终结 SFINAE 500 行报错地狱：纯编译期静态谓词与鸭子类型概念",
    formalTex:
      "\\text{template}\\langle\\text{typename } T\\rangle \\; \\text{concept Hashable} = \\text{requires}(T \\; a) \\{ \\dots \\}",
    typeclassName: "std::equality_comparable (C++20 标准概念)",
    originalCode:
      "// C++20 Concepts 约束模板：\ntemplate <std::equality_comparable T>\nbool are_equal(const T& a, const T& b) {\n    return a == b;\n}",
    desugaredCode:
      "// 编译期静态求值 (Compile-time Predicate Check):\n// 编译器在模板实例化时测试表达式 a == b 的良构性 (Well-formedness)\n// 若类型定义了 operator==，概念求值为 true，直接生成内联机器指令\n// 绝无任何虚表，亦无需传递任何运行时字典！",
    coherenceScenario: {
      crateA: "第三方数学库 A：struct Vector2D { float x, y; }",
      crateB: "定义了 operator==(Vector2D, Vector2D)",
      crateC: "主程序直接将 Vector2D 传入 are_equal 泛型算法",
      isViolating: false,
      compilerOutcome:
        "✅ 自动匹配通过：零侵入，自动满足 std::equality_comparable 概念",
      diagnosticMessage:
        "C++ 依靠编译期 AST 模式匹配验证语法契约，只要表达式合法，概念自动满足。",
    },
    rustVsCpp: {
      rustCode:
        "// Rust 必须显式声明继承关系\ntrait Ord: Eq + PartialOrd {\n  fn cmp(&self, other: &Self) -> Ordering;\n}",
      cppCode:
        "// C++20 概念 subsumption 包含规则：\ntemplate<typename T>\nconcept TotallyOrdered = EqualityComparable<T> && requires(T a, T b) {\n  { a < b } -> std::convertible_to<bool>;\n};",
      rustPhilosophy: "名义超特质继承（Supertrait）：层级清晰、形式化严谨",
      cppPhilosophy:
        "原子约束合取（Atomic Constraint Conjunction）：根据原子谓词包含度自动偏特化选择更优重载",
      rustPros: "编译器错误定位快且明确，单态化前即可完成形式化类型验证",
      cppPros:
        "根据概念的精细程度自动分派最高效的算法实现（如利用随机访问迭代器优化）",
    },
    insight:
      "C++20 Concepts 是结构化鸭子类型在编译期静态单态化上的巅峰之作；而 Rust Trait 则是名义类型论在零开销抽象上的严谨代表。两者代表了现代系统级语言设计的两条终极哲学路径！",
  },
  {
    id: "csharp_static_abstract",
    label: "4. C# 11 静态抽象接口 (泛型数学计算 INumber)",
    desc: "攻克面向对象语言 20 年痛点：允许在泛型接口中声明 static abstract 操作符",
    formalTex:
      "\\text{public interface INumber}\\langle T\\rangle \\text{ where } T : \\text{ INumber}\\langle T\\rangle",
    typeclassName: "INumber<T> (静态抽象数学接口)",
    originalCode:
      "// C# 11 泛型数学计算 (Generic Math):\npublic static T SumAll<T>(T[] numbers) where T : INumber<T> {\n    T total = T.Zero; // 访问静态抽象属性！\n    foreach (var n in numbers) {\n        total += n;   // 调用静态抽象重载操作符 operator+！\n    }\n    return total;\n}",
    desugaredCode:
      "// CLR 运行时虚表特化 (Runtime JIT Specialization):\n// .NET 运行时为具体的 struct int32/double 生成特化代码\n// T.Zero 与 total += n 被 JIT 编译器直接内联为纯 CPU 加法指令 (add / fadd)\n// 彻底消除了传统接口调用导致的装箱（Boxing）与对象头开销！",
    coherenceScenario: {
      crateA: "System.Runtime: 定义了 INumber<T> 静态抽象接口",
      crateB: "System.Int32: struct int : INumber<int> (显式实现)",
      crateC: "用户定义复数 struct Complex : INumber<Complex>",
      isViolating: false,
      compilerOutcome:
        "✅ 泛型算法通用生效：整数、浮点数、复数均可复用同一个 SumAll 算法",
      diagnosticMessage:
        "打破了面向对象接口只能依赖实例调用的旧枷锁，静态成员首次成为第一类抽象契约。",
    },
    rustVsCpp: {
      rustCode:
        "// Rust 诞生第一天就支持静态关联函数与操作符重载\ntrait Zero {\n  fn zero() -> Self;\n}\ntrait Add<Rhs=Self> {\n  type Output;\n  fn add(self, rhs: Rhs) -> Self::Output;\n}",
      cppCode:
        "// C++ 通过模板操作符自然支持\ntemplate<typename T>\nT sum(const std::vector<T>& v) {\n    T total{};\n    for (const auto& x : v) total = total + x;\n    return total;\n}",
      rustPhilosophy: "一切操作符皆 Trait：无魔法、无特例",
      cppPhilosophy: "操作符重载与模板展开浑然天成",
      rustPros: "类型系统完备，无隐式转换暗坑",
      cppPros: "模板代码编写极简自然",
    },
    insight:
      "C# 11 对 static abstract 成员的支持，标志着主流面向对象语言终于承认：单纯依靠对象实例分发的多态是残缺的，类型级别的特设多态（类型类）是不可或缺的基础设施！",
  },
];

const VIEW_OPTIONS: readonly KdeTabOption<
  "dictionary_passing" | "coherence_sandbox" | "rust_vs_cpp" | "code_sandbox"
>[] = [
  { id: "dictionary_passing", label: "字典传递脱糖流程" },
  { id: "coherence_sandbox", label: "孤儿规则与一致性沙盒" },
  { id: "rust_vs_cpp", label: "Rust 显式 impl vs C++ Concepts 隐式匹配" },
  { id: "code_sandbox", label: "Rust Trait 沙盒" },
];

const TRAITS_RUST_CODE = `// Rust 中的 Trait 特设多态与孤儿规则
pub trait Printable {
    fn format(&self) -> String;
}

pub struct User {
    pub id: u64,
    pub name: String,
}

// 显式为本地类型实现 Trait (符合孤儿规则)
impl Printable for User {
    fn format(&self) -> String {
        format!("User #{} ({})", self.id, self.name)
    }
}

// 泛型函数带 Trait 约束 (静态单态化)
fn print_item<T: Printable>(item: &T) {
    println!("[Printable Item] {}", item.format());
}

fn main() {
    let u = User { id: 101, name: "Alice".into() };
    print_item(&u);
}
`;

export default function TypeClassesTraitsDiagram() {
  const [activeTab, setActiveTab] = useState<
    "dictionary_passing" | "coherence_sandbox" | "rust_vs_cpp" | "code_sandbox"
  >("dictionary_passing");

  const [selectedPresetId, setSelectedPresetId] = useState<string>("eq_show");
  const [isViolatingOrphan, setIsViolatingOrphan] = useState<boolean>(false);

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleReset = () => {
    setSelectedPresetId("eq_show");
    setActiveTab("dictionary_passing");
    setIsViolatingOrphan(false);
  };

  return (
    <AutoMath>
      <ExpandableDemo id="type-classes-traits-sandbox">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · TYPE CLASSES & TRAITS"
          mark="C"
          modeTag="DENSE-DOCK"
          title="类型类与特质（Type Classes & Traits）交互探针"
        >
          <InteractiveLayout
            preset="dense-dock"
            top={
              <div className="flex flex-col gap-3">
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
                </div>
              </div>
            }
            main={
              <div className="relative flex h-[var(--demo-height,28rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--kde-border)] bg-[var(--kde-canvas)] p-5 shadow-inner">
                <CanvasToolbar onReset={handleReset} />

                {activeTab === "code_sandbox" ? (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-1">
                    <CodePlayground
                      code={TRAITS_RUST_CODE}
                      description="现场调用本地 rustc -O 编译并运行 Trait 特设多态与单态化泛型代码。"
                      lang="rust"
                      maxHeight="20rem"
                      title="Rust Trait 沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Dictionary Passing Desugaring View */}
                    {activeTab === "dictionary_passing" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-[var(--kde-muted)] block mb-0.5">
                              类型类形式化声明 (Formal Typeclass Signature)
                            </span>
                            <div className="text-[var(--kde-accent)] font-mono text-sm">
                              {`$${currentPreset.formalTex}$`}
                            </div>
                          </div>
                          <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--kde-panel)] text-[var(--kde-ink)] font-mono border border-[var(--kde-border)]">
                            目标接口：{currentPreset.typeclassName}
                          </div>
                        </div>

                        {/* Dual Code Panel: High-level vs Desugared */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 text-xs font-mono">
                          <div className="rounded-lg bg-[var(--kde-raised)] p-3.5 border border-[var(--kde-border)] flex flex-col justify-between">
                            <div>
                              <div className="text-[var(--kde-muted)] font-semibold text-[11px] mb-2 flex items-center justify-between">
                                <span>1. 高层抽象源码（程序员视角）</span>
                                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                                  HIGH LEVEL
                                </span>
                              </div>
                              <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {currentPreset.originalCode}
                              </pre>
                            </div>
                            <div className="text-[11px] text-[var(--kde-muted)] mt-2 border-t border-[var(--kde-border)] pt-1.5">
                              表面上看，函数只要求类型 T
                              拥有某些操作，代码清爽干净。
                            </div>
                          </div>

                          <div className="rounded-lg bg-[var(--kde-raised)] p-3.5 border border-[var(--kde-border)] flex flex-col justify-between">
                            <div>
                              <div className="text-[var(--kde-accent)] font-semibold text-[11px] mb-2 flex items-center justify-between">
                                <span>2. 编译器注入字典后（脱糖底层机理）</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  DESUGARED
                                </span>
                              </div>
                              <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {currentPreset.desugaredCode}
                              </pre>
                            </div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2 border-t border-[var(--kde-border)]/50 pt-1.5 font-sans">
                              💡 <strong>脱糖奥秘</strong>
                              ：类型类约束被化解为显式传递的“函数指针记录（Dictionary）”。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Coherence & Orphan Rules Sandbox */}
                    {activeTab === "coherence_sandbox" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-sm text-[var(--kde-ink)]">
                              多模块生态孤儿规则推演沙盒 (Coherence Checker)
                            </span>
                            <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                              当两个第三方 Crate
                              同时试图为同一标准类型实现相同接口时会发生什么？
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <KdeButton
                              size="xs"
                              variant={
                                !isViolatingOrphan ? "success" : "default"
                              }
                              onClick={() => setIsViolatingOrphan(false)}
                            >
                              遵守孤儿规则 (Safe)
                            </KdeButton>
                            <KdeButton
                              size="xs"
                              variant={isViolatingOrphan ? "danger" : "default"}
                              onClick={() => setIsViolatingOrphan(true)}
                            >
                              违反孤儿规则 (Trigger E0117)
                            </KdeButton>
                          </div>
                        </div>

                        {/* Dependency Graph & Conflict Simulation */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="rounded-lg border border-[var(--kde-border)] bg-[var(--kde-raised)] p-3">
                            <div className="font-bold text-[var(--kde-ink)] mb-1">
                              模块 A (Crate Alpha)
                            </div>
                            <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed">
                              {currentPreset.coherenceScenario.crateA}
                            </div>
                          </div>

                          <div className="rounded-lg border border-[var(--kde-border)] bg-[var(--kde-raised)] p-3">
                            <div className="font-bold text-[var(--kde-ink)] mb-1">
                              模块 B (Crate Beta)
                            </div>
                            <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed">
                              {currentPreset.coherenceScenario.crateB}
                            </div>
                          </div>

                          <div
                            className={`rounded-lg border p-3 transition-colors ${
                              !isViolatingOrphan
                                ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--kde-ink)] ring-1 ring-emerald-500/20"
                                : "bg-rose-500/10 border-rose-500/40 text-[var(--kde-ink)] ring-1 ring-rose-500/20"
                            }`}
                          >
                            <div className="font-bold mb-1">
                              主应用 (App Main)
                            </div>
                            <div className="text-[11px] leading-relaxed">
                              {!isViolatingOrphan
                                ? "正确使用 Newtype 包装器，类型定义权属于本地，无二义性冲突。"
                                : currentPreset.coherenceScenario.crateC}
                            </div>
                          </div>
                        </div>

                        {/* Compiler Diagnostic Output Box */}
                        <KdeMessageBar
                          variant={!isViolatingOrphan ? "success" : "danger"}
                          mode="card"
                          title={
                            !isViolatingOrphan
                              ? "编译器一致性检查通过 (STATUS: PASSED)"
                              : "编译器孤儿规则拦截 (STATUS: ERROR[E0117])"
                          }
                        >
                          {!isViolatingOrphan
                            ? currentPreset.coherenceScenario.compilerOutcome
                            : currentPreset.coherenceScenario.diagnosticMessage}
                        </KdeMessageBar>
                      </div>
                    )}

                    {/* Tab 3: Rust Trait vs C++20 Concepts View */}
                    {activeTab === "rust_vs_cpp" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-0.5">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            系统级双雄的哲学分野：显式名义实现 vs 隐式结构匹配
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            Rust 选择用严格的 impl 块守卫重构安全性；C++20
                            选择用 Concepts 赋予模板极致的非侵入灵活性。
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 text-xs">
                          {/* Rust Column */}
                          <KdeCard
                            title="Rust: 显式名义实现 (impl Trait for T)"
                            badge={
                              <KdeBadge variant="warning">Nominal</KdeBadge>
                            }
                            footer={
                              <div className="text-[10px] text-[var(--kde-muted)]">
                                保证全局唯一映射，拒绝任何误打误撞的偶然匹配。
                              </div>
                            }
                          >
                            <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)] font-mono mb-2">
                              {currentPreset.rustVsCpp.rustCode}
                            </pre>
                            <div className="text-[11px] text-[var(--kde-ink)] space-y-1">
                              <div>
                                <strong>核心哲学：</strong>
                                <span className="text-[var(--kde-muted)]">
                                  {currentPreset.rustVsCpp.rustPhilosophy}
                                </span>
                              </div>
                              <div>
                                <strong>优势防线：</strong>
                                <span className="text-[var(--kde-muted)]">
                                  {currentPreset.rustVsCpp.rustPros}
                                </span>
                              </div>
                            </div>
                          </KdeCard>

                          {/* C++ Column */}
                          <KdeCard
                            title="C++20: 隐式结构匹配 (Concepts / Requires)"
                            badge={
                              <KdeBadge variant="primary">Structural</KdeBadge>
                            }
                            footer={
                              <div className="text-[10px] text-[var(--kde-muted)]">
                                零胶水适配，第三方库无需感知概念存在即可被无缝消费。
                              </div>
                            }
                          >
                            <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)] font-mono mb-2">
                              {currentPreset.rustVsCpp.cppCode}
                            </pre>
                            <div className="text-[11px] text-[var(--kde-ink)] space-y-1">
                              <div>
                                <strong>核心哲学：</strong>
                                <span className="text-[var(--kde-muted)]">
                                  {currentPreset.rustVsCpp.cppPhilosophy}
                                </span>
                              </div>
                              <div>
                                <strong>优势自由：</strong>
                                <span className="text-[var(--kde-muted)]">
                                  {currentPreset.rustVsCpp.cppPros}
                                </span>
                              </div>
                            </div>
                          </KdeCard>
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
                <KdeCard title="特设多态与 Trait 代表性预设" variant="dense">
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
                      setIsViolatingOrphan(false);
                    }}
                  />
                </KdeCard>

                <KdeCard title="孤儿规则与一致性控制" variant="dense">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        一致性状态：
                      </span>
                      <KdeBadge
                        variant={!isViolatingOrphan ? "success" : "danger"}
                      >
                        {!isViolatingOrphan
                          ? "COHERENT (PASSED)"
                          : "ORPHAN VIOLATION (E0117)"}
                      </KdeBadge>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <KdeButton
                        size="xs"
                        variant={!isViolatingOrphan ? "success" : "default"}
                        onClick={() => setIsViolatingOrphan(false)}
                      >
                        遵守孤儿规则 (Safe)
                      </KdeButton>
                      <KdeButton
                        size="xs"
                        variant={isViolatingOrphan ? "danger" : "default"}
                        onClick={() => setIsViolatingOrphan(true)}
                      >
                        违反孤儿规则 (Trigger E0117)
                      </KdeButton>
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed border-t border-[var(--kde-border)] pt-1.5">
                      Trait 实现必须满足：或者 Trait
                      为本地定义，或者实现类型为本地类型。
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="形式化接口签名" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)]">
                      {`$${currentPreset.formalTex}$`}
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed">
                      目标接口：<strong>{currentPreset.typeclassName}</strong>
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <KdeCard>
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  🔍 类型类与特质理论洞见 (Type Classes & Traits Insight)
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--kde-ink)]">
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
