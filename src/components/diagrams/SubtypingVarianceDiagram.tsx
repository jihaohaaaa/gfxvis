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
import KdeMessageBar from "../framework/KdeMessageBar";
import CodePlayground from "../framework/CodePlayground";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import PresetSelector from "../framework/PresetSelector";

// ============================================================================
// Types & Presets for Subtyping & Variance
// ============================================================================

export interface VariancePreset {
  id: string;
  label: string;
  desc: string;
  ruleTex: string;
  codeSnippet: string;
  validAssignmentTex: string;
  invalidAssignmentTex: string;
  validReason: string;
  invalidReason: string;
  polarityExplanation: string;
  safetySandbox: {
    language: string;
    scenario: string;
    runtimeEffect: string;
    isSafe: boolean;
  };
  insight: string;
}

const PRESETS: VariancePreset[] = [
  {
    id: "fn_subtyping",
    label: "1. 函数子类型公理 (Contravariant In, Covariant Out)",
    desc: "函数入参逆变，返回值协变：(S1 → S2) <: (T1 → T2)",
    ruleTex:
      "\\frac{T_1 <: S_1 \\quad S_2 <: T_2}{S_1 \\to S_2 <: T_1 \\to T_2}",
    codeSnippet:
      "Dog <: Animal\nfn1: Animal -> Dog\nfn2: Dog -> Animal\n// 判定: fn1 能否安全赋值给 fn2？",
    validAssignmentTex:
      "(\\text{Animal} \\to \\text{Dog}) <: (\\text{Dog} \\to \\text{Animal})",
    invalidAssignmentTex:
      "(\\text{Dog} \\to \\text{Animal}) \\not<: (\\text{Animal} \\to \\text{Dog})",
    validReason:
      "✅ 合法：调用方承诺传入 Dog，fn1 内部只需当成更宽泛的 Animal 处理即可（入参逆变宽限）；fn1 保证产出 Dog，调用方期待宽泛的 Animal，接收完全安全（出参协变收敛）。",
    invalidReason:
      "❌ 拒绝：如果允许该赋值，调用方可能传入 Cat（作为 Animal 的合法实例），但被赋值的目标函数却期待只接收 Dog，内部试图访问 Dog 特有字段时将导致严重的运行时崩溃（Type Confusion）！",
    polarityExplanation:
      "函数签名 S → T 中，输入参数 S 处于负极性位置（-，逆变）；输出参数 T 处于正极性位置（+，协变）。",
    safetySandbox: {
      language: "TypeScript (with strictFunctionTypes)",
      scenario: "let handler: (a: Dog) => Animal = (a: Animal) => new Dog();",
      runtimeEffect:
        "类型检查器顺利通过，保证调用方无论传任何具体狗，均安全被 Animal 接口兼容消费。",
      isSafe: true,
    },
    insight:
      "里氏替换原则（LSP）在函数上的精髓是‘需求更少，供给更多’：一个合格的替代函数，其接受的输入必须比原先更宽容（逆变），产出的输出必须比原先更精准（协变）。",
  },
  {
    id: "record_subtyping",
    label: "2. 记录宽度与深度子类型 (Record Subtyping)",
    desc: "字段更多更具体的是子类型：{x, y, z} <: {x, y}",
    ruleTex:
      "\\frac{k \\ge n}{\\{l_1:T_1, \\dots, l_k:T_k\\} <: \\{l_1:T_1, \\dots, l_n:T_n\\}} \\quad (\\text{Width})",
    codeSnippet:
      "Point2D = { x: Real, y: Real }\nPoint3D = { x: Real, y: Real, z: Real }\n// 判定: Point3D <: Point2D",
    validAssignmentTex:
      "\\{x: \\text{Real}, y: \\text{Real}, z: \\text{Real}\\} <: \\{x: \\text{Real}, y: \\text{Real}\\}",
    invalidAssignmentTex:
      "\\{x: \\text{Real}\\} \\not<: \\{x: \\text{Real}, y: \\text{Real}\\}",
    validReason:
      "✅ 合法：Point3D 拥有 Point2D 所需的全部属性（x 与 y），当函数只需读取 x 与 y 时，传入 Point3D 绝不会缺失任何字段。",
    invalidReason:
      "❌ 拒绝：Point1D 缺少必须的 y 字段，读取 obj.y 将引发未定义属性访问错误。",
    polarityExplanation:
      "宽度子类型中‘信息量越丰富、约束条件越严苛’的类型，其满足值的集合反而越小，因而是更具体的子类型（Subtype）。",
    safetySandbox: {
      language: "TypeScript / OCaml",
      scenario:
        "function render(p: { x: number, y: number }) { return p.x + p.y; }\nrender({ x: 1, y: 2, z: 3 });",
      runtimeEffect:
        "宽度子类型允许传入包含多余字段的对象，函数安全解构前置字段，多余字段被无害忽略。",
      isSafe: true,
    },
    insight:
      "直觉上的‘加法’在类型论中往往对应子类型层级的‘向下收敛’：每多声明一个必须字段，就是对值空间多施加一条过滤条件，形成的子集当然更小更具体。",
  },
  {
    id: "polarity_algebra",
    label: "3. 极性符号代数 (Polarity Calculus: 负负得正)",
    desc: "高阶函数入参的入参极性翻转：((A → B) → C)",
    ruleTex:
      "\\text{Polarity}((A \\to B) \\to C) \\implies A:(-\\times - = +), \\; B:(-\\times + = -), \\; C:(+)",
    codeSnippet:
      "type Transform = (callback: (item: A) => B) => C\n// 问: A 在整个高阶签名中处于什么极性？",
    validAssignmentTex:
      "A \\text{ 处于正极性 (+) 位置，因而高阶函数对 } A \\text{ 协变！}",
    invalidAssignmentTex:
      "A \\text{ 绝非负极性 (-)，不可当成常规函数入参的逆变处理}",
    validReason:
      "✅ 深刻规律：callback 自身是外层函数的入参（极性为 -1）；而 A 是 callback 的入参（极性再次乘 -1）。负负得正（-1 × -1 = +1），因此外层高阶函数对 A 表现为协变！",
    invalidReason:
      "❌ 直觉误区：若机械地认为‘只要出现在参数位置就是逆变’，就会错误判断 A 的型变方向，导致高阶管道组合时出现虚假类型报错。",
    polarityExplanation:
      "极性代数规则：每次穿过箭头左侧，极性乘以 -1；穿过箭头右侧，极性乘以 +1。乘积结果为 + 则协变，为 - 则逆变。",
    safetySandbox: {
      language: "Scala / Haskell / C#",
      scenario:
        "trait HighOrder[+A] { def apply(cb: A => Unit): Unit } // 编译通过！",
      runtimeEffect:
        "编译器正确推导出 A 处于两次逆变嵌套之内，因而允许 A 标注为协变型变参数 (+A)。",
      isSafe: true,
    },
    insight:
      "代数符号法则再次在类型论中完美印证：高阶函数不是深不可测的黑盒，通过极性符号相乘，任意深度的函数管道都可以机械推导出各类型变量的协变或逆变归宿。",
  },
  {
    id: "producer_cov",
    label: "4. 只读生产端与协变 (+T / out T)",
    desc: "只产出不接收的只读数据源是协变的：Producer[S] <: Producer[T]",
    ruleTex:
      "S <: T \\implies \\text{Producer}[S] <: \\text{Producer}[T] \\quad (\\text{Covariant})",
    codeSnippet:
      "interface Producer<out T> {\n  fun get(): T\n}\n// Dog <: Animal  =>  Producer<Dog> <: Producer<Animal>",
    validAssignmentTex:
      "\\text{Producer}[\\text{Dog}] <: \\text{Producer}[\\text{Animal}]",
    invalidAssignmentTex:
      "\\text{Producer}[\\text{Animal}] \\not<: \\text{Producer}[\\text{Dog}]",
    validReason:
      "✅ 合法：Producer 只负责向外部交付数据。调用方期待领养一只 Animal，数据源给出的必定是 Dog，狗完全满足 Animal 的一切要求。",
    invalidReason:
      "❌ 拒绝：调用方期待专门领养 Dog，而数据源只能保证产出宽泛的 Animal（可能是 Cat），无法满足特化需求。",
    polarityExplanation:
      "T 仅出现在方法的返回位置（正极性 +），不接收外部输入，因此类型构造器与 T 保持同向变化（协变）。",
    safetySandbox: {
      language: "Kotlin / C#",
      scenario:
        "val dogSource: Producer<Dog> = ...\nval animalSource: Producer<Animal> = dogSource // 安全赋值",
      runtimeEffect:
        "只读集合（如不可变 List、Iterator）天然支持协变传递，赋予代码极致的复用灵活性。",
      isSafe: true,
    },
    insight:
      "生产者的契约是‘承诺供给’：交付更高规格的子类产品（Dog）去满足低规格的通用需求（Animal），在物理逻辑上永远是安全的。",
  },
  {
    id: "consumer_contra",
    label: "5. 只写消费端与逆变 (-T / in T)",
    desc: "只接收不产出的消费端是逆变的：Consumer[T] <: Consumer[S]",
    ruleTex:
      "S <: T \\implies \\text{Consumer}[T] <: \\text{Consumer}[S] \\quad (\\text{Contravariant})",
    codeSnippet:
      "interface Consumer<in T> {\n  fun accept(item: T): Unit\n}\n// Dog <: Animal  =>  Consumer<Animal> <: Consumer<Dog>",
    validAssignmentTex:
      "\\text{Consumer}[\\text{Animal}] <: \\text{Consumer}[\\text{Dog}]",
    invalidAssignmentTex:
      "\\text{Consumer}[\\text{Dog}] \\not<: \\text{Consumer}[\\text{Animal}]",
    validReason:
      "✅ 合法：Consumer[Animal] 能够消费任何动物（包括狗、猫、鸟）。当我们把它当作 Consumer[Dog] 使用时，喂给它一只狗，它完全有能力消化处理！",
    invalidReason:
      "❌ 拒绝：Consumer[Dog] 只懂得如何处理狗，若强行当成 Consumer[Animal] 接收猫，在执行时访问狗独有逻辑必将崩溃。",
    polarityExplanation:
      "T 仅出现在方法的参数位置（负极性 -），因此类型构造器与 T 呈逆向反转变化（逆变）。",
    safetySandbox: {
      language: "Kotlin / Java (Comparable<? super T>)",
      scenario:
        "val animalFeeder: Consumer<Animal> = ...\nval dogFeeder: Consumer<Dog> = animalFeeder // 逆变安全替换",
      runtimeEffect:
        "比较器 Comparator<Animal> 可以无缝替代 Comparator<Dog> 来为狗的列表排序，反之则不可。",
      isSafe: true,
    },
    insight:
      "消费者的契约是‘包容输入’：具备更宽广消化能力的大胃王（Consumer[Animal]），完全可以轻松胜任挑食挑剔的专属胃口（Consumer[Dog]）。",
  },
  {
    id: "java_array_disaster",
    label: "6. Java 数组协变灾难 (Array Covariance Disaster)",
    desc: "可变容器强行协变引发的 ArrayStoreException 惨剧",
    ruleTex:
      "\\text{String}[] <: \\text{Object}[] \\quad (\\text{Java Historical Mistake})",
    codeSnippet:
      "String[] strArr = new String[5];\nObject[] objArr = strArr; // 允许协变！\nobjArr[0] = Integer.valueOf(42); // 写入整数！\nString s = strArr[0]; // 崩溃！",
    validAssignmentTex:
      "\\text{编译期完全放行：String}[] \\text{ 被误判为 } \\text{Object}[] \\text{ 的子类型}",
    invalidAssignmentTex:
      "\\text{运行期瞬间暴雷：抛出 java.lang.ArrayStoreException}",
    validReason:
      "❌ 漏洞根源：可变数组既能读（要求协变）又能写（要求逆变）。强行协变使得通过 objArr 别名写入非 String 对象成为可能，破坏了内存堆中原生数组的类型同质性！",
    invalidReason:
      "✅ 唯一正确的解法：可读写容器在数学上必须是不变（Invariant）的！只读集合才能协变，只写集合才能逆变。",
    polarityExplanation:
      "读方法 get(): T 产生正极性 (+)，写方法 set(val: T) 产生负极性 (-)。二者叠加 (+ × - = ±)，迫使型变只能被锁定为 Invariant（不变）。",
    safetySandbox: {
      language: "Java Runtime",
      scenario:
        "objArr[0] = 42; // JVM 被迫在每次数组写入时注入运行时类型嗅探指令 checkcast",
      runtimeEffect:
        "为了弥补类型系统的非健全漏洞，JVM 在每次数组存储时必须付出额外的性能惩罚（检查元素真实类型）。",
      isSafe: false,
    },
    insight:
      "Java 早期为了在缺乏泛型时支持通用排序（如 Arrays.sort(Object[])）而牺牲了类型系统的健全性。这一沉痛的历史教训彻底警示了后来的语言设计者：可变性与协变绝对不可兼得！",
  },
  {
    id: "rust_mut_invariance",
    label: "7. Rust 可变引用不变性 (Rust &'a mut T Invariance)",
    desc: "为什么 &'a mut T 对 T 必须严格不变？防止 Use-After-Free 悬垂逃逸",
    ruleTex:
      "\\&'a \\text{ mut } T \\text{ 对 } 'a \\text{ 协变，但对 } T \\text{ 严格不变 (Invariant)}",
    codeSnippet:
      "// 设 'long: 'short ('long 比 'short 活得久)\n// 若允许 &mut &'long T 协变为 &mut &'short T:\nfn exploit(outer: &mut &'long str) {\n  let temp: &'short str = ...;\n  *outer = temp; // 短生命周期指针写入外部长指针！\n}\n// 函数退出后，外部指针成为悬垂指针 (UAF)！",
    validAssignmentTex:
      "\\&'a \\text{ mut } T \\text{ 只能赋值给类型严格一致的 } \\&'a \\text{ mut } T",
    invalidAssignmentTex:
      "\\&'a \\text{ mut } \\&'\\text{long } T \\not<: \\&'a \\text{ mut } \\&'\\text{short } T",
    validReason:
      "✅ 编译器铁壁防御：因为对 T 严格不变，Rust 拦截了试图将 short 指针伪装写入 long 槽位的可能，彻底消除了悬垂引用（Use-After-Free）与内存踩踏漏洞！",
    invalidReason:
      "❌ 伪协变的灾难：若允许对 T 协变，可变引用将允许攻击者把栈上短命局部变量的地址走私写入全局长命指针中，在栈帧弹出后引发内存安全崩溃。",
    polarityExplanation:
      "生命周期也是一种子类型：活得越久越泛化（'long <: 'short）。对生命周期参数 'a 是协变的（可以随时把租期缩短），但对被借用的内容类型 T 必须严格不变。",
    safetySandbox: {
      language: "Rust Borrow Checker",
      scenario:
        "error[E0308]: mismatched types: lifetime may not live long enough",
      runtimeEffect:
        "编译期直接截断生命周期走私逃逸，在零运行时开销下达成 100% 内存安全。",
      isSafe: true,
    },
    insight:
      "Rust 将子类型理论（Subtyping）高度内化于生命周期系统（Lifetimes）中。不变性（Invariance）在这里不是教条的数学公式，而是守护计算机物理内存安全最坚不可摧的防线。",
  },
];

const VIEW_OPTIONS: readonly KdeTabOption<
  "lsp" | "polarity" | "safety" | "variance_matrix" | "code_sandbox"
>[] = [
  { id: "lsp", label: "LSP 与函数子类型验证" },
  { id: "polarity", label: "极性符号代数推导" },
  { id: "safety", label: "内存安全与破坏沙盒" },
  { id: "variance_matrix", label: "四大语言型变全景矩阵" },
  { id: "code_sandbox", label: "TS 型变测试沙盒" },
];

const VARIANCE_TS_CODE = `// TypeScript 严格函数子类型与型变测试 (strictFunctionTypes)
class Animal { name = "Animal"; }
class Dog extends Animal { bark() { return "Woof!"; } }
class Cat extends Animal { meow() { return "Meow!"; } }

// 1. 函数参数逆变验证 (Contravariant Parameter)
// (Animal -> Dog) <: (Dog -> Animal)
type AnimalConsumer = (a: Animal) => void;
type DogConsumer = (d: Dog) => void;

const handleAnimal: AnimalConsumer = (a: Animal) => {
  console.log("处理通用动物:", a.name);
};

// ✅ 合法逆变替换：入参要求更少 (Animal) 替代入参要求更多 (Dog)
const handleDog: DogConsumer = handleAnimal;
handleDog(new Dog()); // 安全通过！

// 2. 函数返回值协变验证 (Covariant Return)
type DogProducer = () => Dog;
type AnimalProducer = () => Animal;

const makeDog: DogProducer = () => new Dog();
// ✅ 合法协变替换：产出更精准 (Dog) 满足期待通用 (Animal)
const makeAnimal: AnimalProducer = makeDog;
console.log("协变产出:", makeAnimal().name, "叫声:", makeDog().bark());
`;

export default function SubtypingVarianceDiagram() {
  const [activePresetId, setActivePresetId] = useState<string>("fn_subtyping");
  const [viewMode, setViewMode] = useState<
    "lsp" | "polarity" | "safety" | "variance_matrix" | "code_sandbox"
  >("lsp");
  const [activeAssignmentType, setActiveAssignmentType] = useState<
    "valid" | "invalid"
  >("valid");

  const preset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];

  const handleReset = () => {
    setActivePresetId("fn_subtyping");
    setViewMode("lsp");
    setActiveAssignmentType("valid");
  };

  const handlePresetChange = (id: string) => {
    setActivePresetId(id);
    setActiveAssignmentType("valid");
  };

  return (
    <AutoMath>
      <ExpandableDemo id="subtyping-variance-sandbox">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · LSP & VARIANCE"
          mark="<:"
          modeTag="DENSE-DOCK"
          title="子类型与型变（Subtyping & Variance）交互探针"
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
                    onChange={(val) => setViewMode(val)}
                    options={VIEW_OPTIONS}
                    size="sm"
                    value={viewMode}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <KdeBadge variant="primary">
                    {`Rule: $${preset.ruleTex}$`}
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
                      code={VARIANCE_TS_CODE}
                      description="实时执行 strictFunctionTypes 下的逆变入参与协变返回值替换测试。"
                      lang="ts"
                      maxHeight="20rem"
                      title="TypeScript 函数型变沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Stepper / Toggle Toolbar in LSP Mode */}
                    {viewMode === "lsp" && (
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kde-border)] pb-3">
                        <KdeButtonGroup attached size="xs">
                          <KdeButton
                            size="xs"
                            variant={
                              activeAssignmentType === "valid"
                                ? "success"
                                : "default"
                            }
                            onClick={() => setActiveAssignmentType("valid")}
                          >
                            ✅ 合法替换 (LSP Subtype)
                          </KdeButton>
                          <KdeButton
                            size="xs"
                            variant={
                              activeAssignmentType === "invalid"
                                ? "danger"
                                : "default"
                            }
                            onClick={() => setActiveAssignmentType("invalid")}
                          >
                            ❌ 非法替换 (Rejected Subtype)
                          </KdeButton>
                        </KdeButtonGroup>

                        <div className="flex items-center gap-2">
                          <KdeBadge
                            variant={
                              activeAssignmentType === "valid"
                                ? "success"
                                : "danger"
                            }
                          >
                            {activeAssignmentType === "valid"
                              ? "通过类型检查"
                              : "拦截类型错误"}
                          </KdeBadge>
                        </div>
                      </div>
                    )}

                    {/* Main View Area */}
                    <div className="flex flex-1 flex-col justify-center overflow-y-auto overflow-x-auto text-center">
                      {viewMode === "lsp" && (
                        <div className="space-y-4 py-2">
                          {/* Assignment Display */}
                          <div className="flex items-center justify-center overflow-x-auto px-4 py-2">
                            <div className="rounded-2xl border border-[var(--kde-border)] bg-[var(--kde-raised)] px-6 py-4 shadow-sm">
                              <div className="font-mono text-sm font-bold text-[var(--kde-ink)] sm:text-base">
                                {`$${
                                  activeAssignmentType === "valid"
                                    ? preset.validAssignmentTex
                                    : preset.invalidAssignmentTex
                                }$`}
                              </div>
                            </div>
                          </div>

                          {/* Explanation Banner */}
                          <div className="mx-auto max-w-xl">
                            <KdeMessageBar
                              variant={
                                activeAssignmentType === "valid"
                                  ? "success"
                                  : "danger"
                              }
                              mode="card"
                              title={
                                activeAssignmentType === "valid"
                                  ? "里氏替换原则 (LSP) 验证通过"
                                  : "违反里氏替换原则 (LSP 拦截)"
                              }
                            >
                              {activeAssignmentType === "valid"
                                ? preset.validReason
                                : preset.invalidReason}
                            </KdeMessageBar>
                          </div>
                        </div>
                      )}

                      {viewMode === "polarity" && (
                        <div className="space-y-4 py-3 text-center">
                          <div className="mx-auto max-w-xl text-left">
                            <KdeCard
                              title="极性符号运算法则 (Polarity Multiplication)"
                              badge={
                                <KdeBadge variant="warning">Polarity</KdeBadge>
                              }
                              variant="default"
                            >
                              <div className="mb-2 font-mono text-xs text-[var(--kde-ink)] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {preset.codeSnippet}
                              </div>
                              <div className="mt-3 text-xs leading-relaxed text-[var(--kde-ink)]">
                                💡 <strong>符号相乘推演</strong>：
                                <span className="text-[var(--kde-muted)]">
                                  {preset.polarityExplanation}
                                </span>
                              </div>
                            </KdeCard>
                          </div>
                        </div>
                      )}

                      {viewMode === "safety" && (
                        <div className="space-y-4 py-3 text-center">
                          <div className="mx-auto max-w-xl text-left">
                            <KdeCard
                              title="物理内存安全沙盒与运行时行为"
                              badge={
                                <KdeBadge
                                  variant={
                                    preset.safetySandbox.isSafe
                                      ? "success"
                                      : "danger"
                                  }
                                >
                                  {preset.safetySandbox.isSafe
                                    ? "安全契约生效"
                                    : "引发严重 Bug"}
                                </KdeBadge>
                              }
                              variant="default"
                            >
                              <div className="mb-2 text-xs font-semibold text-[var(--kde-muted)]">
                                目标系统：
                                <strong className="text-[var(--kde-ink)]">
                                  {preset.safetySandbox.language}
                                </strong>
                              </div>

                              <div className="mt-2 font-mono text-xs text-[var(--kde-ink)] whitespace-pre-wrap bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {preset.safetySandbox.scenario}
                              </div>

                              <div className="mt-3 text-[11px] leading-relaxed text-[var(--kde-ink)]">
                                💡 <strong>真实影响分析</strong>：
                                <span className="text-[var(--kde-muted)]">
                                  {preset.safetySandbox.runtimeEffect}
                                </span>
                              </div>
                            </KdeCard>
                          </div>
                        </div>
                      )}

                      {viewMode === "variance_matrix" && (
                        <div className="flex-1 flex flex-col gap-3 py-1 overflow-y-auto text-left text-xs">
                          <div className="text-center max-w-xl mx-auto py-0.5">
                            <div className="text-xs font-bold text-[var(--kde-accent)]">
                              四大主流语言型变（Covariance / Contravariance /
                              Invariance）全景矩阵
                            </div>
                            <p className="text-[11px] text-[var(--kde-muted)] mt-0.5">
                              从 C# 声明点型变、TypeScript 结构妥协，到 Rust
                              生命周期防线与 C++ 模板不变性
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* C# */}
                            <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 text-[var(--kde-ink)] p-3 flex flex-col justify-between ring-1 ring-purple-500/20">
                              <div>
                                <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20 mb-1.5 font-bold text-purple-700 dark:text-purple-300">
                                  <span>C#：声明点型变 (out / in)</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-200">
                                    Declaration-site
                                  </span>
                                </div>
                                <div className="space-y-1 text-[11px] text-[var(--kde-ink)]">
                                  <p>
                                    <strong className="text-purple-700 dark:text-purple-300">
                                      协变 (out T)
                                    </strong>
                                    ：只充当返回值，如{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      IEnumerable&lt;out T&gt;
                                    </code>
                                    、
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      Func&lt;out R&gt;
                                    </code>
                                    ；
                                  </p>
                                  <p>
                                    <strong className="text-purple-700 dark:text-purple-300">
                                      逆变 (in T)
                                    </strong>
                                    ：只充当入参，如{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      IComparable&lt;in T&gt;
                                    </code>
                                    、
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      Action&lt;in T&gt;
                                    </code>
                                    ；
                                  </p>
                                  <p>
                                    <strong className="text-purple-700 dark:text-purple-300">
                                      不变
                                    </strong>
                                    ：普通类、结构体、读写接口；数组历史性保留可变协变（带运行时检查）。
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] font-mono text-purple-800 dark:text-purple-300 border-t border-purple-500/20 pt-1">
                                IEnumerable&lt;Dog&gt; 可以安全赋给
                                IEnumerable&lt;Animal&gt;
                              </div>
                            </div>

                            {/* TypeScript */}
                            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 text-[var(--kde-ink)] p-3 flex flex-col justify-between ring-1 ring-sky-500/20">
                              <div>
                                <div className="flex items-center justify-between pb-1.5 border-b border-sky-500/20 mb-1.5 font-bold text-sky-700 dark:text-sky-300">
                                  <span>TypeScript：结构化推导与双向协变</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200">
                                    Structural Inferred
                                  </span>
                                </div>
                                <div className="space-y-1 text-[11px] text-[var(--kde-ink)]">
                                  <p>
                                    <strong className="text-sky-700 dark:text-sky-300">
                                      协变
                                    </strong>
                                    ：对象只读属性、函数返回值；
                                  </p>
                                  <p>
                                    <strong className="text-sky-700 dark:text-sky-300">
                                      逆变
                                    </strong>
                                    ：开启{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      --strictFunctionTypes
                                    </code>{" "}
                                    后的函数参数；
                                  </p>
                                  <p>
                                    <strong className="text-sky-700 dark:text-sky-300">
                                      双向协变 (Bivariant)
                                    </strong>
                                    ：对象方法形参默认双向协变，以兼容{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      addEventListener
                                    </code>{" "}
                                    等 DOM 历史代码。
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] font-mono text-sky-800 dark:text-sky-300 border-t border-sky-500/20 pt-1">
                                (x: Animal) =&gt; Dog 可以赋给 (x: Dog) =&gt;
                                Animal
                              </div>
                            </div>

                            {/* Rust */}
                            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-[var(--kde-ink)] p-3 flex flex-col justify-between ring-1 ring-emerald-500/20">
                              <div>
                                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20 mb-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                                  <span>Rust：生命周期型变与内存安全</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                                    Lifetime Subtyping
                                  </span>
                                </div>
                                <div className="space-y-1 text-[11px] text-[var(--kde-ink)]">
                                  <p>
                                    <strong className="text-emerald-700 dark:text-emerald-300">
                                      协变
                                    </strong>
                                    ：不可变引用{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      &amp;'a T
                                    </code>{" "}
                                    对 <code>'a</code> 和 <code>T</code>{" "}
                                    均协变；
                                  </p>
                                  <p>
                                    <strong className="text-emerald-700 dark:text-emerald-300">
                                      严格不变
                                    </strong>
                                    ：
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      &amp;'a mut T
                                    </code>{" "}
                                    对 <code>'a</code> 协变，但对 <code>T</code>{" "}
                                    严格不变（消灭悬垂指针！）；
                                  </p>
                                  <p>
                                    <strong className="text-emerald-700 dark:text-emerald-300">
                                      逆变
                                    </strong>
                                    ：函数指针{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      fn(T)
                                    </code>{" "}
                                    对入参 <code>T</code> 逆变；可用{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      PhantomData&lt;fn(T)&gt;
                                    </code>{" "}
                                    标记。
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 border-t border-emerald-500/20 pt-1">
                                'static 可以收窄为短生命周期
                                'a（长寿命可假装短寿命）
                              </div>
                            </div>

                            {/* C++ */}
                            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-[var(--kde-ink)] p-3 flex flex-col justify-between ring-1 ring-amber-500/20">
                              <div>
                                <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20 mb-1.5 font-bold text-amber-700 dark:text-amber-300">
                                  <span>C++：模板不变性与虚函数协变</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
                                    Template Invariance
                                  </span>
                                </div>
                                <div className="space-y-1 text-[11px] text-[var(--kde-ink)]">
                                  <p>
                                    <strong className="text-amber-700 dark:text-amber-300">
                                      协变返回
                                    </strong>
                                    ：虚函数派生重写允许返回更具体的派生类指针{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      Derived*
                                    </code>
                                    ；
                                  </p>
                                  <p>
                                    <strong className="text-amber-700 dark:text-amber-300">
                                      入参拒绝逆变
                                    </strong>
                                    ：派生类改写参数类型直接判定为重载隐藏（Method
                                    Hiding）；
                                  </p>
                                  <p>
                                    <strong className="text-amber-700 dark:text-amber-300">
                                      模板严格不变
                                    </strong>
                                    ：
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      vector&lt;Dog*&gt;
                                    </code>{" "}
                                    与{" "}
                                    <code className="bg-[var(--kde-panel)] px-1 rounded border border-[var(--kde-border)] font-mono">
                                      vector&lt;Animal*&gt;
                                    </code>{" "}
                                    绝无继承关系；智能指针靠转换构造函数模拟。
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] font-mono text-amber-800 dark:text-amber-300 border-t border-amber-500/20 pt-1">
                                std::unique_ptr&lt;Derived&gt;
                                通过移动转换构造转移给 Base
                              </div>
                            </div>
                          </div>
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
                <KdeCard title="精选子类型公理与型变预设" variant="dense">
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

                <KdeCard title="LSP 替换合法性判定" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        替换模式：
                      </span>
                      <span
                        className={`font-semibold text-[11px] ${
                          activeAssignmentType === "valid"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {activeAssignmentType === "valid"
                          ? "✅ 符合 LSP"
                          : "❌ 违反子类型"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <KdeButton
                        size="xs"
                        variant={
                          activeAssignmentType === "valid"
                            ? "primary"
                            : "default"
                        }
                        onClick={() => setActiveAssignmentType("valid")}
                      >
                        合法替换 (LSP)
                      </KdeButton>
                      <KdeButton
                        size="xs"
                        variant={
                          activeAssignmentType === "invalid"
                            ? "danger"
                            : "default"
                        }
                        onClick={() => setActiveAssignmentType("invalid")}
                      >
                        非法替换 (Reject)
                      </KdeButton>
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="形式化公理规则" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="p-1.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)] overflow-x-auto">
                      {`$${preset.ruleTex}$`}
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)]">
                      极性法则：{preset.polarityExplanation}
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <KdeCard title="🔍 子类型与型变深邃理论洞见 (Subtyping & Variance Insight)">
                <p className="mt-1 text-xs leading-relaxed text-[var(--kde-ink)]">
                  {preset.insight}
                </p>
              </KdeCard>
            }
          />
        </KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
