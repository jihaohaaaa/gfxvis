import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import InteractiveLayout from "../framework/InteractiveLayout";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import CodePlayground from "../framework/CodePlayground";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import PresetSelector from "../framework/PresetSelector";
import KdeButton from "../framework/KdeButton";
import KdeInput from "../framework/KdeInput";
import KdeButtonGroup from "../framework/KdeButtonGroup";
import KdeMessageBar from "../framework/KdeMessageBar";

// ============================================================================
// Types & Presets for Dependent Type Theory
// ============================================================================

export interface DependentPreset {
  id: string;
  label: string;
  desc: string;
  formalSignature: string;
  theoryBadge: string;
  codeSnippet: string;
  explanation: string;
  piSigmaExplanation: {
    piRole: string;
    sigmaRole: string;
    proofRole: string;
  };
}

const PRESETS: DependentPreset[] = [
  {
    id: "vect_length",
    label: "1. 长度索引向量 (Vect n T: 编译期消灭空指针与越界)",
    desc: "将数组长度编码为类型签名的一部分，静态杜绝空向量 head 取值与数组越界",
    formalSignature:
      "\\text{Vect} : \\mathbb{N} \\to \\text{Type} \\to \\text{Type}, \\quad \\text{safe\\_head} : \\Pi (n: \\mathbb{N}). \\, \\text{Vect } (n + 1) \\, T \\to T",
    theoryBadge: "Π 类型 (Dependent Product)",
    codeSnippet:
      "// Idris / Lean 伪代码示意：\nsafe_head : Vect (n + 1) a -> a\nsafe_head (x :: xs) = x\n\n// 尝试对空向量调用：\n// safe_head Nil => 💥 编译期直接拦截！类型不匹配：Vect 0 a ≠ Vect (n + 1) a",
    explanation:
      "在普通语言中，`head(list)` 遇到空列表只能在运行时抛出异常或崩溃；在依赖类型中，`safe_head` 的参数类型是 `Vect (n + 1) a`，数学上保证了长度至少为 1，空向量从语法上根本无法作为实参传入！",
    piSigmaExplanation: {
      piRole:
        "Π 类型：函数的返回类型依赖于输入参数的值。例如 `append : Vect n a -> Vect m a -> Vect (n + m) a`，返回值类型中的 `(n + m)` 由两个参数的长度值决定！",
      sigmaRole:
        "Σ 类型：依赖对。将一个值和该值满足的性质绑定在一起。例如 `filter : (a -> Bool) -> Vect n a -> Σ (m: Nat). Vect m a`，由于过滤后的长度动态可知，Σ 类型把新长度 m 与新向量打包返回。",
      proofRole:
        "谓词逻辑全称量词 ∀ 对应 Π 类型：要证明对所有 n 都有性质 P(n)，就是编写一个函数接受 n 返回 P(n) 的证明项。",
    },
  },
  {
    id: "matrix_mul",
    label: "2. 矩阵乘法维度检查 (Matrix n k × Matrix k m → Matrix n m)",
    desc: "将行数与列数嵌入类型，两个矩阵只有内层维度精确相等时才允许相乘",
    formalSignature:
      "\\text{matmul} : \\Pi (n, k, m: \\mathbb{N}). \\, \\text{Matrix } n \\; k \\to \\text{Matrix } k \\; m \\to \\text{Matrix } n \\; m",
    theoryBadge: "多元 Π 类型约束",
    codeSnippet:
      "// 强类型矩阵乘法：\nmatmul : Matrix n k -> Matrix k m -> Matrix n m\n\nlet A : Matrix 3 4 = ...\nlet B : Matrix 4 2 = ...\nlet C = matmul A B // 类型推导通过：Matrix 3 2\n\nlet D : Matrix 5 2 = ...\nmatmul A D // 💥 编译报错！期望第二维度为 4，实际传入 5！",
    explanation:
      "机器学习与图形学中常见的‘矩阵内积维度不匹配’在传统语言中往往推迟到运行时 Tensor 形状断言触发崩溃。依赖类型将维度直接作为类型参数约束，编译器拒绝生成非法维度相乘的代码。",
    piSigmaExplanation: {
      piRole:
        "Π 类型在此处表达泛型维度变量 $n, k, m$ 的关联。只有当第一个矩阵的第二维度与第二个矩阵的第一维度在类型证明上恒等时，表达式才良构。",
      sigmaRole:
        "Σ 类型可用于封装动态加载的模型权重：`Σ (r: Nat, c: Nat). Matrix r c`，在运行时载入外部权重文件后解包使用。",
      proofRole:
        "若矩阵变换涉及转置操作，矩阵维度的翻转定理 $A^T : Matrix \\; c \\; r$ 可由类型检查器自动验证无误。",
    },
  },
  {
    id: "format_string",
    label: "3. 编译期 printf 格式化推导 (从字符串值推导参数元组类型)",
    desc: "函数所需的参数类型由格式化字符串的具体值决定（C++20 std::format 与伪依赖类型）",
    formalSignature:
      "\\text{printf} : \\Pi (fmt: \\text{String}). \\, \\text{FormatType}(fmt) \\to \\text{String}",
    theoryBadge: "值决定类型 (Value-to-Type)",
    codeSnippet:
      '// C++20 / 依赖类型经典应用：\n// FormatType("%s is %d years old") 求值为: (String -> Int -> String)\nprintf("%s is %d years old", "Alice", 25); // ✅ 编译通过\n\nprintf("%s is %d years old", "Alice"); // 💥 编译期参数缺失报错！\nprintf("%s is %d years old", "Alice", "Twenty-five"); // 💥 编译期类型不匹配报错！',
    explanation:
      "C 语言中的 `printf` 曾是安全漏洞的重灾区（格式化字符串漏洞可导致任意内存读写）。在依赖类型理论中，`FormatType` 是一个在编译期运行的函数，它接收一个字符串的值，返回一个具体的函数类型！",
    piSigmaExplanation: {
      piRole:
        "字符串中的占位符（如 %d, %s）是一个具体的数据值，它决定了后续函数的形参列表类型。这是‘值决定类型’的最直观工程应用。",
      sigmaRole:
        "解析器返回结构可以建模为 Σ 类型：`Σ (args: List Type). (Tuple args -> String)`。",
      proofRole:
        "保证格式化字符串与传入实参在数量和类型上的双射一一对应，在编译期杜绝栈指针越界。",
    },
  },
  {
    id: "curry_howard_pred",
    label: "4. 命题即类型与一阶谓词逻辑证明 (∀ 与 ∃ 的类型论对应)",
    desc: "柯里-霍华德同构的终极殿堂：全称量词 ∀ 对应 Π 类型，存在量词 ∃ 对应 Σ 类型",
    formalSignature:
      "(\\forall x \\in A. \\, P(x)) \\cong \\Pi (x: A). \\, P(x), \\quad (\\exists x \\in A. \\, P(x)) \\cong \\Sigma (x: A). \\, P(x)",
    theoryBadge: "Curry-Howard Predicate Logic",
    codeSnippet:
      "// 偶数定理证明程序：\n// 命题：对于任意自然数 n，n * 2 是偶数\n// 证明就是编写一个具有该类型的函数！\ntheorem double_is_even : (n : Nat) -> IsEven (n * 2)\ndouble_is_even n = EvenProof n (refl (n * 2))",
    explanation:
      "在命题即类型（Propositions as Types）的高阶形态中，‘编写一个类型为 Π(x:A). P(x) 的程序’与‘在数学上证明对所有的 x 该性质 P(x) 均成立’是同一回事！编译器不仅在编译代码，更在检验数学定理。",
    piSigmaExplanation: {
      piRole:
        "全称证明：给出任意一个实参 a : A，函数体必须构造出证明证据项 proof : P(a)。",
      sigmaRole:
        "存在证明：一个依赖对 (x, p)，其中 x 是构造出的具体实例，p 是证明该 x 满足性质 P(x) 的证据项。",
      proofRole:
        "消灭一切运行时断言：只要类型检查通过，程序就 100% 具有数学层面的正确性与安全性保证。",
    },
  },
];

const VIEW_OPTIONS: readonly KdeTabOption<
  "vect_simulator" | "format_parser" | "lambda_cube" | "code_sandbox"
>[] = [
  { id: "vect_simulator", label: "长度索引向量 (Vect) 交互模拟器" },
  { id: "format_parser", label: "编译期格式化类型推导 (值决定类型)" },
  { id: "lambda_cube", label: "Barendregt Lambda 立方体全景" },
  { id: "code_sandbox", label: "TS 长度向量沙盒" },
];

const DEPENDENT_TS_CODE = `// TypeScript 模拟依赖类型：类型级长度约束与安全向量
type TupleOf<T, N extends number, R extends unknown[] = []> = 
  R['length'] extends N ? R : TupleOf<T, N, [T, ...R]>;

// 1. 长度索引向量 (Length-indexed Vector)
type Vect<N extends number, T> = TupleOf<T, N>;

// 2. 编译期安全的 head (要求长度 N >= 1, 长度为 0 直接拦截)
function safeHead<N extends number, T>(
  vec: [T, ...T[]] & Vect<N, T>
): T {
  return vec[0];
}

// 3. 编译期安全的 append (长度求和 N + M)
function append<N extends number, M extends number, T>(
  a: Vect<N, T>,
  b: Vect<M, T>
): TupleOf<T, any> {
  return [...a, ...b];
}

const v3: Vect<3, number> = [10, 20, 30];
const v2: Vect<2, number> = [40, 50];

console.log("safeHead(v3) 首元素 =", safeHead(v3));
console.log("append(v3, v2) 合并长度 5 =", append(v3, v2));
`;

export default function DependentTypeDiagram() {
  const [activeTab, setActiveTab] = useState<
    "vect_simulator" | "format_parser" | "lambda_cube" | "code_sandbox"
  >("vect_simulator");

  const [selectedPresetId, setSelectedPresetId] =
    useState<string>("vect_length");

  // State for Vect Simulator
  const [vec1Len, setVec1Len] = useState<number>(3);
  const [vec2Len, setVec2Len] = useState<number>(2);
  const [targetOp, setTargetOp] = useState<"append" | "safe_head" | "zip_with">(
    "append",
  );

  // State for Format String Synthesizer
  const [formatText, setFormatText] = useState<string>(
    "User %s logged in with ID: %d",
  );

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleReset = () => {
    setSelectedPresetId("vect_length");
    setActiveTab("vect_simulator");
    setVec1Len(3);
    setVec2Len(2);
    setTargetOp("append");
    setFormatText("User %s logged in with ID: %d");
  };

  const handlePresetChange = (id: string) => {
    setSelectedPresetId(id);
    if (id === "format_string") {
      setActiveTab("format_parser");
    } else if (id === "curry_howard_pred") {
      setActiveTab("lambda_cube");
    } else {
      setActiveTab("vect_simulator");
    }
  };

  const isHeadValid = vec1Len >= 1;
  const isZipValid = vec1Len === vec2Len;

  // Format string parser
  const parsedSpecs: { spec: string; type: string; desc: string }[] = [];
  const regex = /%([sfdcb])/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(formatText)) !== null) {
    const char = match[1];
    if (char === "s")
      parsedSpecs.push({ spec: "%s", type: "String", desc: "文本字符串" });
    else if (char === "d")
      parsedSpecs.push({ spec: "%d", type: "Int", desc: "有符号整数" });
    else if (char === "f")
      parsedSpecs.push({ spec: "%f", type: "Float", desc: "单/双精度浮点" });
    else if (char === "c")
      parsedSpecs.push({ spec: "%c", type: "Char", desc: "单个 Unicode 字符" });
    else if (char === "b")
      parsedSpecs.push({ spec: "%b", type: "Bool", desc: "布尔逻辑值" });
  }

  return (
    <AutoMath>
      <ExpandableDemo id="dependent-types-sandbox">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · DEPENDENT TYPES"
          mark="Π"
          modeTag="DENSE-DOCK"
          title="依值类型论（Dependent Type Theory）交互探针"
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
                    {currentPreset.theoryBadge}
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
                      code={DEPENDENT_TS_CODE}
                      description="在线运行 TypeScript 类型级元组长度约束，模拟 safeHead 与 append 长度计算。"
                      lang="ts"
                      maxHeight="20rem"
                      title="TypeScript 依值类型沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Shared Top Mathematical Formal Signature */}
                    <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-semibold text-[var(--kde-muted)] block mb-0.5">
                          形式化签名 (Dependent Type Signature)
                        </span>
                        <div className="text-[var(--kde-accent)] font-mono text-sm overflow-x-auto">
                          {`$${currentPreset.formalSignature}$`}
                        </div>
                      </div>
                      <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--kde-panel)] text-[var(--kde-ink)] font-mono border border-[var(--kde-border)]">
                        {currentPreset.theoryBadge}
                      </div>
                    </div>

                    {/* Tab 1: Length-indexed Vector Interactive Simulator */}
                    {activeTab === "vect_simulator" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        {/* Dynamic Dimension & Operation Configurator */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Vector Length Tweakers */}
                          <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex items-center justify-between">
                            <span className="font-semibold text-[var(--kde-muted)]">
                              向量 A 长度 (n):
                            </span>
                            <div className="flex items-center gap-1.5 font-mono">
                              {[0, 1, 2, 3, 4].map((len) => (
                                <KdeButton
                                  key={len}
                                  size="xs"
                                  variant={
                                    vec1Len === len ? "primary" : "default"
                                  }
                                  aria-label={`向量 A 长度 ${len}`}
                                  onClick={() => setVec1Len(len)}
                                  className="w-7 h-7 p-0"
                                >
                                  {len}
                                </KdeButton>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex items-center justify-between">
                            <span className="font-semibold text-[var(--kde-muted)]">
                              向量 B 长度 (m):
                            </span>
                            <div className="flex items-center gap-1.5 font-mono">
                              {[0, 1, 2, 3, 4].map((len) => (
                                <KdeButton
                                  key={len}
                                  size="xs"
                                  variant={
                                    vec2Len === len ? "primary" : "default"
                                  }
                                  aria-label={`向量 B 长度 ${len}`}
                                  onClick={() => setVec2Len(len)}
                                  className="w-7 h-7 p-0"
                                >
                                  {len}
                                </KdeButton>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Operation Selector Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--kde-raised)] p-2.5 rounded-lg border border-[var(--kde-border)] text-xs">
                          <span className="text-[var(--kde-muted)] font-medium">
                            选择调用的依值类型函数：
                          </span>
                          <div className="flex gap-1.5">
                            <KdeButton
                              size="xs"
                              variant={
                                targetOp === "append" ? "primary" : "default"
                              }
                              onClick={() => setTargetOp("append")}
                            >
                              append (拼接)
                            </KdeButton>
                            <KdeButton
                              size="xs"
                              variant={
                                targetOp === "safe_head" ? "primary" : "default"
                              }
                              onClick={() => setTargetOp("safe_head")}
                            >
                              safe_head (取首元)
                            </KdeButton>
                            <KdeButton
                              size="xs"
                              variant={
                                targetOp === "zip_with" ? "primary" : "default"
                              }
                              onClick={() => setTargetOp("zip_with")}
                            >
                              zipWith (等长并合)
                            </KdeButton>
                          </div>
                        </div>

                        {/* Interactive Vector Visual Stage */}
                        <div className="rounded-lg bg-[var(--kde-raised)] border border-[var(--kde-border)] p-3.5 shadow-xs flex flex-col justify-between flex-1 text-xs">
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--kde-border)] mb-3">
                              <span className="font-bold text-[var(--kde-ink)] flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                当前类型推导与求值状态
                              </span>

                              {/* Dynamic Compilation Status Badge */}
                              {targetOp === "append" && (
                                <span className="px-2 py-0.5 rounded font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                  ✅ 编译通过：返回 Vect ({vec1Len + vec2Len}) T
                                </span>
                              )}
                              {targetOp === "safe_head" && (
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-semibold ${
                                    isHeadValid
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {isHeadValid
                                    ? `✅ 编译通过：Vect ${vec1Len} ≥ 1`
                                    : "💥 编译期类型检查拦截：拒绝空向量 Nil"}
                                </span>
                              )}
                              {targetOp === "zip_with" && (
                                <span
                                  className={`px-2 py-0.5 rounded font-mono font-semibold ${
                                    isZipValid
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {isZipValid
                                    ? `✅ 编译通过：两向量长度精确一致 (${vec1Len} == ${vec2Len})`
                                    : `💥 编译期拦截：长度不匹配 (${vec1Len} ≠ ${vec2Len})`}
                                </span>
                              )}
                            </div>

                            {/* Visual Vector Cells */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="w-24 font-mono text-[var(--kde-muted)]">
                                  Vector A [{vec1Len}]:
                                </span>
                                <div className="flex gap-1">
                                  {vec1Len === 0 ? (
                                    <span className="font-mono text-[var(--kde-muted)] italic px-2 py-0.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)]">
                                      Nil (空向量)
                                    </span>
                                  ) : (
                                    Array.from({ length: vec1Len }).map(
                                      (_, i) => (
                                        <div
                                          key={i}
                                          className="h-7 w-7 rounded bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center font-mono font-bold text-indigo-800 dark:text-indigo-200"
                                        >
                                          a{i + 1}
                                        </div>
                                      ),
                                    )
                                  )}
                                </div>
                              </div>

                              {targetOp !== "safe_head" && (
                                <div className="flex items-center gap-3">
                                  <span className="w-24 font-mono text-[var(--kde-muted)]">
                                    Vector B [{vec2Len}]:
                                  </span>
                                  <div className="flex gap-1">
                                    {vec2Len === 0 ? (
                                      <span className="font-mono text-[var(--kde-muted)] italic px-2 py-0.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)]">
                                        Nil (空向量)
                                      </span>
                                    ) : (
                                      Array.from({ length: vec2Len }).map(
                                        (_, i) => (
                                          <div
                                            key={i}
                                            className="h-7 w-7 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] flex items-center justify-center font-mono font-bold text-[var(--kde-ink)]"
                                          >
                                            b{i + 1}
                                          </div>
                                        ),
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Operation Semantic Explanation */}
                            <div className="p-2.5 rounded-lg bg-[var(--kde-panel)] font-mono text-[11px] leading-relaxed border border-[var(--kde-border)] text-[var(--kde-ink)]">
                              {targetOp === "append" && (
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                    append
                                  </span>{" "}
                                  : Vect {vec1Len} T -&gt; Vect {vec2Len} T
                                  -&gt;{" "}
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    Vect ({vec1Len} + {vec2Len} ={" "}
                                    {vec1Len + vec2Len}) T
                                  </span>
                                  <div className="text-[var(--kde-muted)] text-[10px] mt-1 font-sans">
                                    拼接后的向量长度是两个输入长度之和，在类型级别被静态严密证明。
                                  </div>
                                </div>
                              )}
                              {targetOp === "safe_head" && (
                                <div>
                                  {isHeadValid ? (
                                    <div>
                                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                        safe_head
                                      </span>{" "}
                                      : Vect {vec1Len} T -&gt;{" "}
                                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                        T
                                      </span>{" "}
                                      (返回值: a1)
                                      <div className="text-[var(--kde-muted)] text-[10px] mt-1 font-sans">
                                        由于长度 {vec1Len} 满足 $n+1$
                                        约束，模式匹配必定能解构出第一个元素，运行时绝不可能发生越界！
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-rose-700 dark:text-rose-400">
                                      <div>
                                        TypeError: Couldn't match expected type
                                        'Vect (n + 1) T' with actual type 'Vect
                                        0 T'
                                      </div>
                                      <div className="text-[var(--kde-muted)] text-[10px] mt-1 font-sans">
                                        在传统语言（如
                                        C/Java/JS）中，对空数组调用 head
                                        导致崩溃。依赖类型在编译期直接拦截，杜绝漏洞！
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {targetOp === "zip_with" && (
                                <div>
                                  {isZipValid ? (
                                    <KdeMessageBar
                                      variant="success"
                                      mode="card"
                                      title={`zipWith : Vect ${vec1Len} A -> Vect ${vec2Len} B -> Vect ${vec1Len} (A, B)`}
                                    >
                                      两输入向量长度严格相等，并合过程不需要处理长度不齐的边界情况。
                                    </KdeMessageBar>
                                  ) : (
                                    <KdeMessageBar
                                      variant="danger"
                                      mode="card"
                                      title={`DimensionMismatch: Cannot zip vectors of length ${vec1Len} and ${vec2Len}`}
                                    >
                                      无需在函数内部编写 if (a.length !=
                                      b.length) throw
                                      异常，类型系统在编译期直接拦截！
                                    </KdeMessageBar>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-[var(--kde-muted)] mt-2 border-t border-[var(--kde-border)] pt-2 flex items-center justify-between">
                            <span>
                              💡 <strong>核心直觉</strong>
                              ：类型不再是孤立的标签，而是携带数学等式与长度约束的命题证据。
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Compile-time Format String Parser */}
                    {activeTab === "format_parser" && (
                      <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-0.5">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            编译期格式化字符串推导 (从字符串值计算类型签名)
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            输入格式化模板字符串，观察依赖类型解释器如何由“字符串值”动态合成函数实参类型元组
                          </p>
                        </div>

                        {/* Format String Input Field */}
                        <div className="bg-[var(--kde-raised)] p-3 rounded-lg border border-[var(--kde-border)]">
                          <label className="text-xs font-semibold text-[var(--kde-muted)] block mb-1">
                            编辑格式化字符串 (试着输入 %s, %d, %f, %c, %b)：
                          </label>
                          <div className="flex gap-2 items-center">
                            <KdeInput
                              mono
                              size="xs"
                              value={formatText}
                              onChange={(e) => setFormatText(e.target.value)}
                              placeholder="例如: %s has %d items, cost: %f"
                              className="flex-1"
                            />
                            <KdeButtonGroup attached size="xs">
                              <KdeButton
                                size="xs"
                                variant="default"
                                onClick={() =>
                                  setFormatText("User %s logged in with ID: %d")
                                }
                                className="whitespace-nowrap"
                              >
                                示例 1
                              </KdeButton>
                              <KdeButton
                                size="xs"
                                variant="default"
                                onClick={() =>
                                  setFormatText(
                                    "Matrix[%d, %d] = %f (valid: %b)",
                                  )
                                }
                                className="whitespace-nowrap"
                              >
                                示例 2
                              </KdeButton>
                            </KdeButtonGroup>
                          </div>
                        </div>

                        {/* Synthesized Signature & Token Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 text-xs">
                          {/* Left: Dependent Type Synthesis */}
                          <KdeCard
                            title="合成目标函数类型 (Synthesized Function Type)"
                            badge={
                              <KdeBadge variant="primary">
                                Π(fmt: String)
                              </KdeBadge>
                            }
                            variant="highlight"
                            footer={
                              <div className="text-[10px] text-[var(--kde-accent)] font-mono">
                                类型签名参数个数：{parsedSpecs.length}{" "}
                                项强类型参数
                              </div>
                            }
                          >
                            <div className="p-2.5 rounded-lg bg-[var(--kde-panel)] font-mono text-xs text-[var(--kde-ink)] border border-[var(--kde-border)] mb-2 leading-relaxed">
                              {parsedSpecs.length === 0 ? (
                                <span className="text-[var(--kde-muted)] italic">
                                  () -&gt; String (无需任何参数)
                                </span>
                              ) : (
                                <span>
                                  {parsedSpecs.map((s) => s.type).join(" -> ")}{" "}
                                  -&gt;{" "}
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    String
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed">
                              在普通语言（如
                              C/Java）中，函数的签名必须在编译期静态硬编码；而在依赖类型（或
                              C++20 `std::format` 编译期常量求值）中，
                              <strong className="text-[var(--kde-ink)]">
                                函数所需的形参类型直接取决于 format
                                字符串的内容！
                              </strong>
                            </div>
                          </KdeCard>

                          {/* Right: Parsed Tokens Mapping Table */}
                          <div className="rounded-lg border border-[var(--kde-border)] bg-[var(--kde-raised)] p-3 flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-[var(--kde-ink)] mb-2 flex items-center justify-between border-b border-[var(--kde-border)] pb-1.5">
                                <span>占位符语义映射表 (Value to Type)</span>
                                <span className="text-[10px] text-[var(--kde-muted)]">
                                  共解析到 {parsedSpecs.length} 个占位符
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {parsedSpecs.length === 0 ? (
                                  <div className="text-[var(--kde-muted)] text-center py-4 italic">
                                    未检测到占位符，函数为纯文本返回
                                  </div>
                                ) : (
                                  parsedSpecs.map((spec, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between p-1.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px]"
                                    >
                                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                        Arg #{i + 1} ({spec.spec})
                                      </span>
                                      <span className="text-indigo-800 dark:text-indigo-200 bg-indigo-500/15 px-2 py-0.5 rounded text-[10px]">
                                        {spec.type} ({spec.desc})
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="text-[10px] text-[var(--kde-muted)] border-t border-[var(--kde-border)] pt-1.5">
                              ⚠️
                              若调用时参数数量或类型不一致，编译器在类型检查阶段直接拒绝生成机器码。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Lambda Cube Explorer */}
                    {activeTab === "lambda_cube" && (
                      <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-0.5">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            Barendregt Lambda 立方体（The Lambda Cube）全景定位
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            类型论的三维演进：项依值于项、项依值于类型、类型依值于类型与类型依值于项
                          </p>
                        </div>

                        {/* 4 Major Dimensions / Quadrants */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 text-xs">
                          {/* 1. STLC */}
                          <div className="rounded-lg border border-[var(--kde-border)] bg-[var(--kde-raised)] p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--kde-border)] mb-1.5">
                                <span className="font-bold text-[var(--kde-ink)] font-mono">
                                  λ→ (STLC)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--kde-panel)] text-[var(--kde-muted)] font-mono">
                                  项依赖于项
                                </span>
                              </div>
                              <p className="text-[var(--kde-muted)] text-[11px] leading-relaxed">
                                基础简单类型 λ 演算：值到值的普通函数抽象（`\x:
                                Int &rarr; x + 1`）。函数只操作运行时的数据值。
                              </p>
                            </div>
                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-1 border-t border-[var(--kde-border)] pt-1">
                              工业对应：C 语言函数、Pascal、基础 JavaScript
                            </div>
                          </div>

                          {/* 2. System F */}
                          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-sky-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-sky-500/20 mb-1.5">
                                <span className="font-bold text-sky-700 dark:text-sky-300 font-mono">
                                  λ2 (System F)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200 font-mono">
                                  项依赖于类型 (多态)
                                </span>
                              </div>
                              <p className="text-[var(--kde-muted)] text-[11px] leading-relaxed">
                                参数多态（Parametric
                                Polymorphism）：函数接收一个类型作为参数，生成具体类型的项（`\X.
                                \x: X &rarr; x`）。
                              </p>
                            </div>
                            <div className="text-[10px] font-mono text-sky-800 dark:text-sky-300 mt-1 border-t border-sky-500/20 pt-1">
                              工业对应：C++ 模板、Rust 泛型、Java/C# 泛型
                            </div>
                          </div>

                          {/* 3. System Fw */}
                          <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-3 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-purple-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20 mb-1.5">
                                <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">
                                  λω (Higher-Kinded Types)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-200 font-mono">
                                  类型依赖于类型
                                </span>
                              </div>
                              <p className="text-[var(--kde-muted)] text-[11px] leading-relaxed">
                                高阶类型构造器（Type
                                Operators）：类型层面的函数（Kind 机制，如 `Type
                                &rarr; Type`，Monad 的 `m: * &rarr; *`）。
                              </p>
                            </div>
                            <div className="text-[10px] font-mono text-purple-800 dark:text-purple-300 mt-1 border-t border-purple-500/20 pt-1">
                              工业对应：Haskell、Scala HKT、C++ 模板模板参数
                            </div>
                          </div>

                          {/* 4. Lambda P / CoC */}
                          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-emerald-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20 mb-1.5">
                                <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                  λP / CoC (Dependent Types)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-mono font-bold">
                                  ★ 类型依赖于项 (依值类型)
                                </span>
                              </div>
                              <p className="text-[var(--kde-muted)] text-[11px] leading-relaxed">
                                类型系统的最高峰：类型的构造由运行时的项（值）直接决定（如
                                `Vect n
                                a`、`FormatType(str)`）。谓词逻辑与计算完全统一。
                              </p>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 mt-1 border-t border-emerald-500/20 pt-1">
                              代表语言：Idris、Agda、Lean 4、Coq / Rocq
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
                <KdeCard title="依值类型三大经典范式预设" variant="dense">
                  <PresetSelector
                    layout="vertical"
                    size="xs"
                    options={PRESETS.map((p) => ({
                      id: p.id,
                      label: p.label,
                      description: p.desc,
                    }))}
                    value={selectedPresetId}
                    onChange={handlePresetChange}
                  />
                </KdeCard>

                <KdeCard title="向量长度约束与类型判定" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        运算操作：
                      </span>
                      <span className="font-mono font-bold text-[var(--kde-accent)]">
                        {targetOp === "append"
                          ? "向量拼接 (++)"
                          : targetOp === "safe_head"
                            ? "安全 Head"
                            : "配对 Zip"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        长度1 / 长度2：
                      </span>
                      <span className="font-mono font-bold text-[var(--kde-ink)]">
                        {vec1Len} / {vec2Len}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--kde-muted)]">
                        类型判定：
                      </span>
                      <KdeBadge
                        variant={
                          targetOp === "safe_head"
                            ? isHeadValid
                              ? "success"
                              : "danger"
                            : targetOp === "zip_with"
                              ? isZipValid
                                ? "success"
                                : "danger"
                              : "primary"
                        }
                      >
                        {targetOp === "safe_head"
                          ? isHeadValid
                            ? "合法 (len ≥ 1)"
                            : "拒绝 (空向量)"
                          : targetOp === "zip_with"
                            ? isZipValid
                              ? "合法 (等长)"
                              : "拒绝 (长度不匹配)"
                            : "类型安全"}
                      </KdeBadge>
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="依赖类型形式签名" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="p-1.5 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)] overflow-x-auto">
                      {`$${currentPreset.formalSignature}$`}
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)]">
                      范式分类：<strong>{currentPreset.theoryBadge}</strong>
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <KdeCard title="🔍 依值类型理论洞见 (Dependent Types Insight)">
                <p className="mt-1 text-xs leading-relaxed text-[var(--kde-ink)]">
                  {currentPreset.explanation}
                </p>
              </KdeCard>
            }
          />
        </KdeWindowShell>
      </ExpandableDemo>
    </AutoMath>
  );
}
