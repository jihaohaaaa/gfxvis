import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import KdeTabs, { type KdeTabOption } from "../framework/KdeTabs";
import KdeWindowShell from "../framework/KdeWindowShell";
import InteractiveLayout from "../framework/InteractiveLayout";
import KdeCard from "../framework/KdeCard";
import KdeBadge from "../framework/KdeBadge";
import KdeButtonGroup from "../framework/KdeButtonGroup";
import KdeProgressBar from "../framework/KdeProgressBar";
import CodePlayground from "../framework/CodePlayground";
import { AutoMath } from "../framework/AutoMath";
import ExpandableDemo from "../framework/ExpandableDemo";
import PresetSelector from "../framework/PresetSelector";
import KdeButton from "../framework/KdeButton";

// ============================================================================
// Types & Presets for Algebraic Effects & Effect Systems
// ============================================================================

export interface EffectStep {
  label: string;
  source: "caller" | "runtime" | "handler";
  codeSnippet: string;
  explanation: string;
  stateBadge: string;
  isPaused: boolean;
}

export interface EffectPreset {
  id: string;
  label: string;
  desc: string;
  formalTex: string;
  effectName: string;
  steps: EffectStep[];
  suspenseComparison: {
    algebraicWay: string;
    reactWay: string;
    reactLimitation: string;
  };
  coloredFunctionMatrix: {
    syncChain: string[];
    asyncChain: string[];
    coloredInfection: string;
    keywordGenericsSolution: string;
  };
  insight: string;
}

const PRESETS: EffectPreset[] = [
  {
    id: "state_log",
    label: "1. 经典代数效应 (State & Log: 纯函数内的外部状态与日志)",
    desc: "函数无需显式传参或全局变量，通过 perform 读写状态，测试与生产环境无缝切换处理器",
    formalTex:
      "\\text{effect } \\text{State}\\langle S\\rangle = \\{ \\text{get}: () \\to S, \\; \\text{set}: S \\to () \\}",
    effectName: "State<S> & Log (状态与日志效应)",
    steps: [
      {
        label: "步骤 1: 业务代码执行，触发 perform",
        source: "caller",
        codeSnippet:
          '// 业务代码就像写普通同步代码一样：\nlet count = perform State.get();\nperform Log.info("Count is: " + count);\nperform State.set(count + 1);\nreturn count * 2;',
        explanation:
          "业务函数执行到 perform State.get() 时，计算立即被定界暂停（Suspended），当前调用栈延续 k 被打包捕获。",
        stateBadge: "⏸️ 执行暂停 (Suspended)",
        isPaused: true,
      },
      {
        label: "步骤 2: 运行时沿动态调用栈寻找就近的 Handler",
        source: "runtime",
        codeSnippet:
          "// 运行时寻找到外层的作用域处理器：\nhandle business_logic() with MemoryStateHandler(42)",
        explanation:
          "不同于 Monad 需要将所有内部函数签名层层包装为 State Monad，代数效应沿着动态作用域向上查找匹配的效应处理器（类似 try/catch）。",
        stateBadge: "🔍 向上分派 (Handler Dispatch)",
        isPaused: true,
      },
      {
        label: "步骤 3: 处理器介入并调用 resume 恢复执行",
        source: "handler",
        codeSnippet:
          "// 处理器截获 State.get 效应：\non State.get() => {\n  // 内存字典中取出当前状态 42，调用延续闭包 k 恢复！\n  resume(k, current_state); \n}",
        explanation:
          "处理器决定向延续注入数值 42。神奇的事情发生了：业务代码在暂停的原点毫发无损地复活，将 42 赋值给 count 并继续运行！",
        stateBadge: "▶️ 恢复执行 (Resumed)",
        isPaused: false,
      },
      {
        label: "步骤 4: 业务计算完成，返回最终结果",
        source: "caller",
        codeSnippet:
          "// 最终返回结果:\n// count = 42, count + 1 = 43 被存回状态字典\nreturn 84; // 42 * 2",
        explanation:
          "业务函数最终完成计算。测试环境下可以注入 MockHandler 纯内存运行，生产环境可以注入 DatabaseHandler 读写数据库，业务代码零侵入！",
        stateBadge: "✅ 计算完毕 (Completed)",
        isPaused: false,
      },
    ],
    suspenseComparison: {
      algebraicWay:
        "真正的代数效应：perform 触发后精确保留调用栈位置，handler 异步完成后直接从暂停行恢复，局部变量完好无损。",
      reactWay:
        "React Suspense 的实用主义折中：调用 useData() 发现无缓存，直接 throw 一个 Promise 砸穿整个渲染树，由 Suspense 边界展示 Fallback；Promise 完成后重新完整重放（Re-render）组件！",
      reactLimitation:
        "由于 JavaScript 缺乏语言级延续（Continuation），React 无法就地恢复，只能‘自杀并重生’，因此必须遵守 Hooks 严禁在条件语句中调用的规则以维持调用顺序。",
    },
    coloredFunctionMatrix: {
      syncChain: ["getUser()", "calculateTax()", "renderUI()"],
      asyncChain: [
        "async getUser()",
        "async calculateTax()",
        "async renderUI()",
      ],
      coloredInfection:
        "一旦底层函数染上 async 红色，调用栈上层的所有函数都必须被迫加上 async/await，代码结构被彻底分裂为两套生态。",
      keywordGenericsSolution:
        "代数效应视角下，异步只是一种普通的 Effect（如 perform Await(p)），外层函数的签名保持完全透明一致，彻底消除染色！",
    },
    insight:
      "代数效应（Algebraic Effects）是定界延续（Delimited Continuation）的高级类型化具象：它将‘效应的声明（Perform）’与‘效应的解释（Handler）’彻底解耦，实现了真正意义上的关注点分离！",
  },
  {
    id: "react_suspense",
    label: "2. React Suspense 异步数据获取 (实用主义代数效应落地)",
    desc: "React 团队用 throw Promise 模拟 perform，用 Suspense 边界模拟 Handler 的工程壮举",
    formalTex:
      "\\text{useData}(id) \\longrightarrow \\text{throw } \\text{Promise} \\; (\\cong \\text{perform Fetch})",
    effectName: "AsyncFetch (异步加载效应)",
    steps: [
      {
        label: "步骤 1: 组件读取尚未加载的资源",
        source: "caller",
        codeSnippet:
          "function UserProfile({ id }) {\n  // 试图同步读取尚未到位的异步数据：\n  const user = useData(fetchUser(id));\n  return <h1>{user.name}</h1>;\n}",
        explanation:
          "组件没有写任何 async/await，也没有在 useEffect 中管理 loading 状态，代码如同纯同步数据流一样清爽。",
        stateBadge: "📦 触发加载 (Trigger Use)",
        isPaused: true,
      },
      {
        label: "步骤 2: 缓存未命中，扔出 Promise 抛向外层",
        source: "runtime",
        codeSnippet:
          "// useData 内部实现：\nif (!cache.has(id)) {\n  const promise = api.get(id).then(res => cache.set(id, res));\n  throw promise; // 💥 用 throw 砸穿执行栈！\n}",
        explanation:
          "因为 JS 引擎没有原生 `perform` 指令，React 巧妙借用 `throw` 将控制权强制回溯到外层作用域。",
        stateBadge: "🚀 抛出 Promise (Throwing)",
        isPaused: true,
      },
      {
        label: "步骤 3: Suspense 边界捕获 Promise 并展示骨架屏",
        source: "handler",
        codeSnippet:
          "<Suspense fallback={<Skeleton />}>\n  <UserProfile id={42} />\n</Suspense>",
        explanation:
          "Suspense 边界充当了 Effect Handler 的角色：捕获被扔出的 Promise，挂起当前分支，并优雅渲染 fallback 占位符。",
        stateBadge: "⏳ 渲染 Fallback (Suspended Boundary)",
        isPaused: true,
      },
      {
        label: "步骤 4: Promise 决议，React 重新发起渲染",
        source: "runtime",
        codeSnippet:
          "// Promise.then 触发重新渲染：\n// 再次调用 UserProfile({ id: 42 })\n// 此时 cache.get(id) 命中缓存，顺利返回 user 对象！",
        explanation:
          "数据就绪后，React 重新执行组件函数。这次缓存已在，组件成功完成渲染并挂载到真实的 DOM 树上！",
        stateBadge: "✨ 重放成功 (Re-rendered)",
        isPaused: false,
      },
    ],
    suspenseComparison: {
      algebraicWay: "一次暂停，就地恢复。无重复执行开销。",
      reactWay: "整树重放（Re-render）。依赖纯函数无副作用假设。",
      reactLimitation:
        "如果组件函数内部包含不可重入的非幂等副作用，重放将导致状态错乱。",
    },
    coloredFunctionMatrix: {
      syncChain: ["Component()", "Child()", "Leaf()"],
      asyncChain: ["async Component() // 破坏 React 原生 JSX 渲染机制"],
      coloredInfection:
        "React 之所以不用 async/await 组件，就是为了防止整个 React 虚拟 DOM 树被异步传染导致调度器瘫痪。",
      keywordGenericsSolution:
        "Suspense 让所有组件保持普通同步函数外貌，内部通过代数效应风格中断。",
    },
    insight:
      "Sebastian Markbåge（React 核心架构师）直言：Suspense 的灵感完全源自 OCaml 和 Eff 的代数效应。它是函数式编程学术思想在数亿终端工业界面上的最伟大降维应用之一！",
  },
  {
    id: "rust_colored_functions",
    label: "3. Rust 染色函数难题与 Keyword Generics 效应多态",
    desc: "函数颜色之痛：为什么 async fn 和普通 fn 无法复用？以及未来的 ?async 效应系统解决方案",
    formalTex:
      "\\text{trait } \\text{Read} = \\{ \\text{fn read}(\\&\\text{mut self}) \\to \\text{Result} \\quad \\& \\quad \\text{?async} \\}",
    effectName: "Async & Try (Rust 硬编码双效应)",
    steps: [
      {
        label: "步骤 1: 现实痛苦：同步与异步的两套平行标准库",
        source: "caller",
        codeSnippet:
          "// 同步版本:\ntrait Read { fn read(&mut self, buf: &mut [u8]) -> Result<usize>; }\n// 异步版本 (完全相同的逻辑，却必须重写一遍！):\ntrait AsyncRead { fn poll_read(...) -> Poll<Result<usize>>; }",
        explanation:
          "Rust 当前缺乏通用的效应系统，导致所有的 I/O Trait 都被迫分裂为两套互不兼容的代码库。",
        stateBadge: "🎨 颜色分裂 (Colored Split)",
        isPaused: true,
      },
      {
        label: "步骤 2: 效应多态登场：Keyword Generics 提议",
        source: "runtime",
        codeSnippet:
          "// 编写一次，同时适配同步与异步：\ntrait Read<const is_async: bool = false> {\n    async<is_async> fn read(&mut self, buf: &mut [u8]) -> Result<usize>;\n}",
        explanation:
          "通过将 `async` 提升为编译期的‘效应标记参数’，同一个 Trait 可以根据调用上下文自动具象化为同步或异步版本！",
        stateBadge: "🔮 效应多态 (Effect Polymorphic)",
        isPaused: true,
      },
      {
        label: "步骤 3: 泛型算法的终极复用",
        source: "caller",
        codeSnippet:
          "// 无论传入的是文件还是网络套接字，算法自动继承参数效应：\nasync<T::is_async> fn copy_all<T: Read>(reader: &mut T) {\n    reader.read(...).await<T::is_async>;\n}",
        explanation:
          "若传入同步 Reader，`.await` 自动消除退化为普通调用；若传入异步 Reader，编译器自动生成状态机 Future！",
        stateBadge: "🚀 自动退化/特化 (Auto Specialization)",
        isPaused: false,
      },
      {
        label: "步骤 4: 零开销消除双重代码维护地狱",
        source: "handler",
        codeSnippet:
          "// 编译产物：\n// 1. 同步环境生成极简裸调用，零抽象开销！\n// 2. 异步环境生成精确 Future 状态机，零堆分配！",
        explanation:
          "Rust 的 Keyword Generics 计划将把代数效应理论转化为编译期单态化的零开销利刃！",
        stateBadge: "🎉 终极统一 (Unified)",
        isPaused: false,
      },
    ],
    suspenseComparison: {
      algebraicWay:
        "代数效应视角：异步并不是一种必须把返回值包装为 Future<T> 的容器类型，而是一种能够在中间中断的计算效应。",
      reactWay:
        "前端框架在调度层吸收异步，而系统级语言必须在物理内存布局与零开销之间死磕。",
      reactLimitation:
        "Rust 不可能引入类似 JS 的 GC 和全局重放，状态必须由编译器严格追踪。",
    },
    coloredFunctionMatrix: {
      syncChain: ["iterator.map()", "slice.filter()", "vec.sort_by()"],
      asyncChain: ["stream.map()", "stream.filter()", "stream.sort_by()"],
      coloredInfection:
        "几乎所有的同步高阶函数在异步世界里都必须重新实现一套 `Stream` 版本，造成了严重的认知负荷与 API 冗余。",
      keywordGenericsSolution:
        "效应系统让 `Iterator` 和 `Stream` 在数学上归一为同一个‘具备不同效应标记’的统一 Trait。",
    },
    insight:
      "Bob Nystrom 的名篇《What Color is Your Function》指出了异步染色的痛楚；而代数效应与效应行多态（Effect Row Polymorphism），就是终结颜色分裂的终极解药！",
  },
  {
    id: "cpp_coroutines",
    label: "4. C++20 无栈协程与 promise_type (可编程的效应处理器)",
    desc: "C++ 史上最复杂的模板定制：利用 promise_type 和 coroutine_handle 实现自定义效应捕获与恢复",
    formalTex:
      "\\text{co\\_await expr} \\cong \\text{perform Await} \\quad \\& \\quad \\text{promise\\_type} \\cong \\text{Handler}",
    effectName: "CoroutinePromise (协程处理器效应)",
    steps: [
      {
        label: "步骤 1: 业务协程调用 co_await 触发挂起",
        source: "caller",
        codeSnippet:
          'Task<int> compute_async() {\n  std::cout << "Before await\\n";\n  int value = co_await FetchDataTask(); // 触发暂停！\n  std::cout << "After await: " << value << "\\n";\n  co_return value * 2;\n}',
        explanation:
          "`co_await` 关键字正是 C++ 的 `perform`：当前协程帧被分配在堆上并挂起，返回一个延续句柄。",
        stateBadge: "⏸️ 协程挂起 (Suspended Frame)",
        isPaused: true,
      },
      {
        label: "步骤 2: 控制权移交至 promise_type 处理器",
        source: "handler",
        codeSnippet:
          "struct TaskPromise {\n  // 效应处理器核心钩子：\n  auto initial_suspend() { return std::suspend_always{}; }\n  auto final_suspend() noexcept { return std::suspend_always{}; }\n  void return_value(int val) { result = val; }\n  void unhandled_exception() { std::terminate(); }\n};",
        explanation:
          "C++20 没有把协程行为写死在运行时中，而是允许开发者自由实现 `promise_type` 作为效应处理器，定制协程创建、挂起与销毁的每一步行为！",
        stateBadge: "⚙️ 处理器调度 (Promise Hook)",
        isPaused: true,
      },
      {
        label: "步骤 3: 通过 coroutine_handle 恢复延续",
        source: "runtime",
        codeSnippet:
          "// 获取代表延续 k 的底层协程句柄：\nstd::coroutine_handle<TaskPromise> handle = ...;\n// 异步事件敲定后恢复延续：\nhandle.resume(); // 相当于代数效应的 resume(k)！",
        explanation:
          "`std::coroutine_handle` 就是形式化理论中的定界延续 $k$。调用 `handle.resume()`，CPU 立即恢复执行至原中断点！",
        stateBadge: "▶️ 延续唤醒 (Handle Resumed)",
        isPaused: false,
      },
      {
        label: "步骤 4: 协程计算完毕，取出返回值",
        source: "caller",
        codeSnippet:
          "int final_res = handle.promise().result; // 获取 co_return 的最终结果\nhandle.destroy(); // 显式清理协程堆帧",
        explanation:
          "C++20 协程展示了一种极致底层的效应实现：无栈分配（HALO 优化下甚至能内联消除堆分配），将延续控制权完全交还给系统工程师。",
        stateBadge: "✅ 堆帧销毁 (Destroyed)",
        isPaused: false,
      },
    ],
    suspenseComparison: {
      algebraicWay:
        "代数效应在高级语言中完全隐式分发并由垃圾回收器管理延续闭包内存。",
      reactWay: "前端无需关心句柄与销毁，全部交给框架调度。",
      reactLimitation:
        "C++ 开发者必须极度谨慎地管理 `coroutine_handle` 的生命周期，否则会立刻遭遇悬垂协程指针与物理内存泄漏！",
    },
    coloredFunctionMatrix: {
      syncChain: ["int func()"],
      asyncChain: ["Task<int> func()"],
      coloredInfection:
        "一旦函数体内部出现 `co_await`，该函数的返回值类型就必须改变（例如从 `int` 变为包含 `promise_type` 的 `Task<int>`），同样存在返回值签名染色的现象。",
      keywordGenericsSolution:
        "C++ 社区目前主要依赖标准模板库与未来的执行器（Executors / std::execution）规范进行异构分发。",
    },
    insight:
      "C++20 协程的 `promise_type` 本质上就是一个用模板特化实现的静态类型效应处理器（Static Effect Handler）！",
  },
];

const VIEW_OPTIONS: readonly KdeTabOption<
  | "timeline_tracer"
  | "suspense_comparison"
  | "colored_functions"
  | "code_sandbox"
>[] = [
  { id: "timeline_tracer", label: "代数效应时序追踪器" },
  { id: "suspense_comparison", label: "React Suspense 效应对照" },
  { id: "colored_functions", label: "染色函数与效应多态矩阵" },
  { id: "code_sandbox", label: "TS 发生器效应沙盒" },
];

const EFFECTS_TS_CODE = `// TypeScript 使用 Generator 模拟代数效应 (Algebraic Effects)
// 1. 定义效应标识
type Effect = 
  | { type: "GET_STATE" }
  | { type: "SET_STATE"; value: number }
  | { type: "LOG"; message: string };

// 2. 纯业务代码 (通过 yield 触发 perform)
function* businessLogic() {
  const initial: number = yield { type: "GET_STATE" };
  yield { type: "LOG", message: "读取当前状态: " + initial };
  
  yield { type: "SET_STATE", value: initial + 10 };
  const updated: number = yield { type: "GET_STATE" };
  
  return updated * 2;
}

// 3. 效应处理器 Handler (管理定界延续与状态存储)
function runWithHandler<T>(gen: Generator<Effect, T, any>, initialStore = 0): T {
  let store = initialStore;
  let nextVal: any = undefined;
  
  while (true) {
    const result = gen.next(nextVal);
    if (result.done) return result.value;
    
    const eff = result.value;
    switch (eff.type) {
      case "GET_STATE":
        nextVal = store;
        break;
      case "SET_STATE":
        store = eff.value;
        nextVal = undefined;
        break;
      case "LOG":
        console.log("[Effect Handler Log]", eff.message);
        nextVal = undefined;
        break;
    }
  }
}

const finalResult = runWithHandler(businessLogic(), 42);
console.log("最终业务计算结果 ( (42 + 10) * 2 ) =", finalResult);
`;

export default function EffectsDiagram() {
  const [activeTab, setActiveTab] = useState<
    | "timeline_tracer"
    | "suspense_comparison"
    | "colored_functions"
    | "code_sandbox"
  >("timeline_tracer");

  const [selectedPresetId, setSelectedPresetId] = useState<string>("state_log");
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleReset = () => {
    setSelectedPresetId("state_log");
    setActiveTab("timeline_tracer");
    setCurrentStepIdx(0);
  };

  const currentStep =
    currentPreset.steps[currentStepIdx] || currentPreset.steps[0];
  const totalSteps = currentPreset.steps.length;

  return (
    <AutoMath>
      <ExpandableDemo id="effects-sandbox">
        <KdeWindowShell
          eyebrow="TYPE THEORY WORKSPACE · ALGEBRAIC EFFECTS"
          mark="ε"
          modeTag="DENSE-DOCK"
          title="代数效应与效应系统（Algebraic Effects）交互探针"
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
                      code={EFFECTS_TS_CODE}
                      description="使用 ES6 Generator yield 模拟 perform 与定界延续，实时运行状态读取与日志记录效应。"
                      lang="ts"
                      maxHeight="20rem"
                      title="TypeScript 代数效应沙盒"
                    />
                  </div>
                ) : (
                  <>
                    {/* Shared Top Formal Signature */}
                    <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-semibold text-[var(--kde-muted)] block mb-0.5">
                          形式化效应签名 (Formal Effect Signature)
                        </span>
                        <div className="text-[var(--kde-accent)] font-mono text-sm">
                          {`$${currentPreset.formalTex}$`}
                        </div>
                      </div>
                      <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--kde-panel)] text-[var(--kde-ink)] font-mono border border-[var(--kde-border)]">
                        目标效应：{currentPreset.effectName}
                      </div>
                    </div>

                    {/* Tab 1: Algebraic Effects Timeline Tracer View */}
                    {activeTab === "timeline_tracer" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        {/* Stepper Timeline Navigation */}
                        <div className="rounded-lg bg-[var(--kde-raised)] p-3 border border-[var(--kde-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
                          <KdeButtonGroup attached size="xs">
                            <KdeButton
                              size="xs"
                              variant="default"
                              disabled={currentStepIdx === 0}
                              onClick={() =>
                                setCurrentStepIdx((prev) =>
                                  Math.max(0, prev - 1),
                                )
                              }
                            >
                              ◀ 上一步
                            </KdeButton>
                            {currentPreset.steps.map((_, idx) => (
                              <KdeButton
                                key={idx}
                                size="xs"
                                variant={
                                  currentStepIdx === idx ? "primary" : "default"
                                }
                                onClick={() => setCurrentStepIdx(idx)}
                                aria-label={`执行步进 ${idx + 1}`}
                              >
                                {idx + 1}
                              </KdeButton>
                            ))}
                            <KdeButton
                              size="xs"
                              variant="primary"
                              disabled={currentStepIdx === totalSteps - 1}
                              onClick={() =>
                                setCurrentStepIdx((prev) =>
                                  Math.min(totalSteps - 1, prev + 1),
                                )
                              }
                            >
                              下一步 ▶
                            </KdeButton>
                          </KdeButtonGroup>

                          <div className="flex items-center gap-2.5">
                            <KdeProgressBar
                              steps={totalSteps}
                              value={currentStepIdx + 1}
                              size="sm"
                              className="w-28"
                              showLabel={false}
                            />
                            <KdeBadge variant="primary">
                              Step {currentStepIdx + 1} / {totalSteps}
                            </KdeBadge>
                          </div>
                        </div>

                        {/* Active Step Visual Box */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 text-xs">
                          {/* Left: Code Box */}
                          <div className="rounded-lg bg-[var(--kde-raised)] p-3.5 border border-[var(--kde-border)] font-mono flex flex-col justify-between">
                            <div>
                              <div className="text-[var(--kde-muted)] font-semibold text-[11px] mb-2 flex items-center justify-between">
                                <span>{currentStep.label}</span>
                                <KdeBadge
                                  variant={
                                    currentStep.source === "caller"
                                      ? "primary"
                                      : currentStep.source === "runtime"
                                        ? "warning"
                                        : "success"
                                  }
                                >
                                  {currentStep.source.toUpperCase()}
                                </KdeBadge>
                              </div>
                              <pre className="text-[var(--kde-ink)] whitespace-pre-wrap leading-relaxed text-[11px] bg-[var(--kde-panel)] p-2.5 rounded-lg border border-[var(--kde-border)]">
                                {currentStep.codeSnippet}
                              </pre>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px] border-t border-[var(--kde-border)] pt-2">
                              <span className="text-[var(--kde-muted)]">
                                执行状态：
                              </span>
                              <span className="font-bold text-[var(--kde-ink)]">
                                {currentStep.stateBadge}
                              </span>
                            </div>
                          </div>

                          {/* Right: Architectural Explanation */}
                          <KdeCard
                            title="延续流转机理（Continuation Dynamics）"
                            badge={
                              <KdeBadge variant="primary">
                                CONTROL FLOW
                              </KdeBadge>
                            }
                            variant="highlight"
                            footer={
                              <div className="text-[11px] text-[var(--kde-muted)]">
                                <strong>控制流拓扑：</strong>
                                {currentStep.isPaused
                                  ? " 执行暂停在当前定界帧，CPU 控制权向上移交至就近的 Handler。"
                                  : " 定界延续被唤醒，控制权无缝切回原调用点继续向前求值。"}
                              </div>
                            }
                          >
                            <p className="text-[var(--kde-ink)] leading-relaxed text-xs">
                              {currentStep.explanation}
                            </p>
                          </KdeCard>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: React Suspense Comparison View */}
                    {activeTab === "suspense_comparison" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-0.5">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            纯粹代数效应 vs React Suspense 的工程世俗化
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            从学术界的“原点就地恢复”到工程界的“重放渲染（Re-render）”
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 text-xs">
                          {/* Theoretical Algebraic Effect Side */}
                          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-emerald-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 mb-2">
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                  真正的代数效应 (Koka / Eff)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-mono">
                                  Delimited Cont
                                </span>
                              </div>
                              <div className="text-xs space-y-2 text-[var(--kde-ink)]">
                                <p className="leading-relaxed">
                                  {
                                    currentPreset.suspenseComparison
                                      .algebraicWay
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono mt-2 border-t border-emerald-500/20 pt-1.5">
                              优势：单步暂停与精准复原，零冗余计算开销。
                            </div>
                          </div>

                          {/* React Suspense Side */}
                          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3.5 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-sky-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-sky-500/20 mb-2">
                                <span className="font-bold text-sky-700 dark:text-sky-300">
                                  React Suspense 实用主义实现
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200 font-mono">
                                  Throw Promise
                                </span>
                              </div>
                              <div className="text-xs space-y-2 text-[var(--kde-ink)]">
                                <p className="leading-relaxed">
                                  {currentPreset.suspenseComparison.reactWay}
                                </p>
                                <div className="p-2 rounded-lg bg-amber-500/10 text-[11px] text-[var(--kde-ink)] border border-amber-500/30 mt-2">
                                  ⚠️{" "}
                                  <strong className="text-amber-700 dark:text-amber-400">
                                    局限性：
                                  </strong>
                                  <span className="text-[var(--kde-muted)]">
                                    {
                                      currentPreset.suspenseComparison
                                        .reactLimitation
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] text-sky-800 dark:text-sky-300 font-mono mt-2 border-t border-sky-500/20 pt-1.5">
                              哲学：借助 JS
                              异常机制跨级跳转，依靠纯函数重放绕开延续缺乏。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Colored Functions Matrix View */}
                    {activeTab === "colored_functions" && (
                      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="text-center max-w-xl mx-auto py-0.5">
                          <h4 className="text-sm font-bold text-[var(--kde-ink)]">
                            染色函数难题（Function Color Problem）与效应多态
                          </h4>
                          <p className="text-xs text-[var(--kde-muted)] mt-0.5">
                            “你的函数是什么颜色？”——代数效应如何一劳永逸终结异步传染
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 text-xs">
                          {/* Blue Synchronous Stack */}
                          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3.5 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-sky-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-sky-500/20 mb-2">
                                <span className="font-bold text-sky-700 dark:text-sky-300">
                                  🔵 纯同步调用链 (Blue Stack)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-200 font-mono">
                                  Sync
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[11px]">
                                {currentPreset.coloredFunctionMatrix.syncChain.map(
                                  (item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-1.5 rounded bg-[var(--kde-panel)] text-[var(--kde-ink)] border border-[var(--kde-border)]"
                                    >
                                      {item}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] text-sky-800 dark:text-sky-300 font-mono mt-2 border-t border-sky-500/20 pt-1.5">
                              同步函数只能调用同步函数，一旦混入异步便彻底断裂。
                            </div>
                          </div>

                          {/* Red Asynchronous Stack */}
                          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 flex flex-col justify-between text-[var(--kde-ink)] ring-1 ring-rose-500/20">
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 mb-2">
                                <span className="font-bold text-rose-700 dark:text-rose-300">
                                  🔴 异步传染调用链 (Red Infection)
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-800 dark:text-rose-200 font-mono">
                                  Async Infected
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[11px]">
                                {currentPreset.coloredFunctionMatrix.asyncChain.map(
                                  (item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-1.5 rounded bg-[var(--kde-panel)] text-[var(--kde-ink)] border border-[var(--kde-border)]"
                                    >
                                      {item}
                                    </div>
                                  ),
                                )}
                              </div>
                              <div className="mt-2 text-[11px] text-[var(--kde-muted)]">
                                {
                                  currentPreset.coloredFunctionMatrix
                                    .coloredInfection
                                }
                              </div>
                            </div>
                            <div className="text-[10px] text-rose-800 dark:text-rose-300 font-mono mt-2 border-t border-rose-500/20 pt-1.5">
                              解法：
                              {
                                currentPreset.coloredFunctionMatrix
                                  .keywordGenericsSolution
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
                <KdeCard title="精选代数效应工程预设" variant="dense">
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
                      setCurrentStepIdx(0);
                    }}
                  />
                </KdeCard>

                <KdeCard title="时序流转与执行状态" variant="dense">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--kde-muted)]">
                        当前步骤：
                      </span>
                      <span className="font-semibold text-[var(--kde-ink)] truncate max-w-[140px]">
                        {currentStep.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--kde-muted)]">
                        执行状态：
                      </span>
                      <span className="font-bold text-[var(--kde-accent)]">
                        {currentStep.stateBadge}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--kde-muted)]">
                        流转来源：
                      </span>
                      <KdeBadge
                        variant={
                          currentStep.source === "caller"
                            ? "primary"
                            : currentStep.source === "runtime"
                              ? "warning"
                              : "success"
                        }
                      >
                        {currentStep.source.toUpperCase()}
                      </KdeBadge>
                    </div>
                    <div className="pt-1">
                      <KdeProgressBar
                        steps={totalSteps}
                        value={currentStepIdx + 1}
                        size="sm"
                        showLabel
                      />
                    </div>
                  </div>
                </KdeCard>

                <KdeCard title="形式化效应代数公理" variant="dense">
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded bg-[var(--kde-panel)] border border-[var(--kde-border)] font-mono text-[11px] text-[var(--kde-accent)]">
                      {`$${currentPreset.formalTex}$`}
                    </div>
                    <div className="text-[11px] text-[var(--kde-muted)] leading-relaxed">
                      目标效应契约：<strong>{currentPreset.effectName}</strong>
                      。代数效应通过定界延续与就近 Handler
                      实现无侵入控制流跳转。
                    </div>
                  </div>
                </KdeCard>
              </div>
            }
            bottom={
              <KdeCard>
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  🔍 代数效应理论洞见 (Algebraic Effects Insight)
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
