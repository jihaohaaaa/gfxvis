import { useState } from "react";
import CanvasToolbar from "../framework/CanvasToolbar";
import CanvasResizer from "../framework/CanvasResizer";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import PresetSelector from "../framework/PresetSelector";

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
      syncChain: [
        "main()",
        "process_order()",
        "calculate_discount()",
        "fetch_price()",
      ],
      asyncChain: [
        "async fn main()",
        "async fn process_order()",
        "async fn calculate_discount()",
        "async fn fetch_price()",
      ],
      coloredInfection:
        "染色函数感染定律：只要最底层的一个 fetch_price 变成了异步（红函数），整条调用链上的所有祖先函数必须全盘改成 async 并在调用点加上 await！",
      keywordGenericsSolution:
        "代数效应与效应多态：函数只需声明它可能产生 IO 效应，上层函数既可以被同步执行器消费，也可以被异步调度器消费，彻底终结‘红蓝函数’撕裂！",
    },
    insight:
      "代数效应是‘带返回键的超级异常’：普通异常（try/catch）在抛出后栈帧就灰飞烟灭了；而代数效应允许你在捕获异常后，递给它一个值，让它在原地满血复活！",
  },
  {
    id: "react_suspense",
    label: "2. React Suspense 异步数据获取 (前端工程中的代数效应落地)",
    desc: "Dan Abramov 称 React Suspense 为代数效应的世俗落地：抛出 Promise 暂停，解决后重放渲染",
    formalTex:
      "\\text{use(Promise)} \\cong \\text{perform Fetch(url)} \\quad \\& \\quad \\langle\\text{Suspense}\\rangle \\cong \\text{Handler}",
    effectName: "AsyncFetch (异步加载效应)",
    steps: [
      {
        label: "步骤 1: 组件调用 use(resource)，数据尚未就绪",
        source: "caller",
        codeSnippet:
          "function UserProfile({ id }) {\n  // 模拟 perform 效应：\n  const user = use(fetchUser(id)); // 命中缓存则直接返回，未命中则触发中断！\n  return <h1>{user.name}</h1>;\n}",
        explanation:
          "在 React 18/19 中，当组件读取未决的 Promise 时，React 内部抛出（Throw）该 Promise，立刻中断当前组件的渲染树生成。",
        stateBadge: "⏸️ 抛出中断 (Throw Promise)",
        isPaused: true,
      },
      {
        label: "步骤 2: 最近的外层 <Suspense> 边界捕获中断",
        source: "handler",
        codeSnippet:
          "<Suspense fallback={<Spinner />}>\n  <UserProfile id={42} />\n</Suspense>",
        explanation:
          "<Suspense> 边界扮演了效应处理器（Effect Handler）的角色。它捕获了被抛出的 Promise，并在主 DOM 树上挂载 fallback 骨架屏。",
        stateBadge: "🛡️ 展示占位 (Fallback UI)",
        isPaused: true,
      },
      {
        label: "步骤 3: 异步网络请求在后台完成响应",
        source: "runtime",
        codeSnippet:
          "promise.then(userData => {\n  cache.set(key, userData);\n  // 触发恢复信号！\n  triggerRerender();\n});",
        explanation:
          "当 Promise 敲定（Resolved），React 接收到信号，准备唤醒挂起的组件。",
        stateBadge: "⚡ 信号就绪 (Resolved)",
        isPaused: false,
      },
      {
        label: "步骤 4: 组件被重新调用，从缓存无缝读出数据",
        source: "caller",
        codeSnippet:
          "function UserProfile({ id }) {\n  const user = use(fetchUser(id)); // 第二次进入：从缓存立即读出数据！\n  return <h1>Alice</h1>; // 成功渲染！\n}",
        explanation:
          "第二次进入时 `use` 不再抛出，而是直接返回解析好的数据，真实 UI 替换掉骨架屏！",
        stateBadge: "✅ 渲染达成 (Rendered)",
        isPaused: false,
      },
    ],
    suspenseComparison: {
      algebraicWay:
        "真正的语言级效应：无需重复执行前半截无辜的计算，直接在中断语句继续下一行。",
      reactWay:
        "JavaScript 运行环境的无奈折中：通过抛出 Promise 模拟中断，通过重新执行整函数模拟恢复。虽然粗糙，却神奇地在前端实现了无需 useEffect 的无痛异步声明！",
      reactLimitation:
        "组件必须保持纯度（Idempotent），严禁在中断前的代码中产生未受保护的副作用（如向外部数组 push 数据），否则重新重放时会导致副作用成倍叠加！",
    },
    coloredFunctionMatrix: {
      syncChain: ["App", "Dashboard", "UserProfile", "Avatar"],
      asyncChain: [
        "async App",
        "async Dashboard",
        "async UserProfile",
        "async Avatar",
      ],
      coloredInfection:
        "如果没有 Suspense，UserProfile 必须声明为 async，导致其父组件全部被迫重构为异步流；有了 Suspense，组件在外部看来依旧是同步声明式函数！",
      keywordGenericsSolution:
        "React 将异步复杂性封装在调度器内部，向开发者呈现了一份伪同步的纯净代数效应图景。",
    },
    insight:
      "React 团队通过一次精彩的工程偷袭，在没有一阶延续（First-class Continuation）语法的纯 JavaScript 运行时中，硬生生模拟出了代数效应的绝大部分开发体验！",
  },
  {
    id: "rust_effects",
    label: "3. Rust 染色函数难题与 Keyword Generics 效应多态",
    desc: "解密‘函数颜色问题’：为什么 async 会像病毒一样传染？Rust 如何计划用效应多态拯救泛型生态",
    formalTex:
      "\\text{fn map}\\langle F: \\text{async? Fn}()\\rangle \\to \\text{async?} \\; \\text{Vec}\\langle T\\rangle",
    effectName: "Async & Try (Rust 硬编码双效应)",
    steps: [
      {
        label: "步骤 1: 编写普通同步泛型库函数",
        source: "caller",
        codeSnippet:
          "// 优秀的同步 map 函数：\npub fn map<T, U, F>(list: &[T], f: F) -> Vec<U> \nwhere F: Fn(&T) -> U {\n  let mut res = Vec::new();\n  for item in list { res.push(f(item)); }\n  res\n}",
        explanation:
          "此时函数是‘蓝色’的（纯同步）。如果调用方想要传入一个异步网络请求闭包呢？",
        stateBadge: "🔵 蓝色函数 (Sync)",
        isPaused: false,
      },
      {
        label: "步骤 2: 遭遇染色函数感染，生态被迫分裂为两份代码！",
        source: "runtime",
        codeSnippet:
          "// 为了支持异步，必须将整个函数重写为 async 红色版本：\npub async fn map_async<T, U, F, Fut>(list: &[T], f: F) -> Vec<U>\nwhere \n  F: Fn(&T) -> Fut,\n  Fut: Future<Output = U> {\n  let mut res = Vec::new();\n  for item in list { res.push(f(item).await); }\n  res\n}",
        explanation:
          "这就是臭名昭著的‘函数颜色问题’：`map` 和 `map_async` 逻辑一模一样，但由于 Rust 缺乏效应多态，标准库和生态库被迫复制代码（如 async-std vs std）！",
        stateBadge: "🔴 红色感染 (Async Duplication)",
        isPaused: true,
      },
      {
        label: "步骤 3: 引入 Keyword Generics（效应多态提议）",
        source: "handler",
        codeSnippet:
          "// Rust 未来效应多态愿景语法：\npub async<A> fn map<T, U, F>(list: &[T], f: F) -> Vec<U>\nwhere \n  F: async<A> Fn(&T) -> U {\n  let mut res = Vec::new();\n  for item in list { res.push(f(item).await<A>); }\n  res\n}",
        explanation:
          "效应参数 A 代表该函数是否带有 async 效应。若传入同步闭包，A=false，函数编译为极速纯同步代码；若传入异步闭包，A=true，函数编译为状态机协程！",
        stateBadge: "🟣 效应多态 (Effect Polymorphic)",
        isPaused: false,
      },
      {
        label: "步骤 4: 编译期单态化分发，一石二鸟",
        source: "caller",
        codeSnippet:
          "// 一份代码，双向通吃！\nlet v1 = map(&data, |x| x + 1);             // 生成极速同步内联汇编！\nlet v2 = map(&data, |x| async { fetch(x) }).await; // 生成高效状态机！",
        explanation:
          "效应系统让语言在编译期把‘是否有副作用’作为类型系统的维度推导，彻底根除代码重复。",
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

// ============================================================================
// Component Definition
// ============================================================================

export default function EffectsDiagram() {
  const [activeTab, setActiveTab] = useState<
    "perform_resume" | "react_suspense" | "function_color"
  >("perform_resume");

  const [selectedPresetId, setSelectedPresetId] = useState<string>("state_log");
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const handleReset = () => {
    setSelectedPresetId("state_log");
    setActiveTab("perform_resume");
    setCurrentStepIdx(0);
  };

  const activeStep =
    currentPreset.steps[currentStepIdx] || currentPreset.steps[0];

  return (
    <AutoMath>
      <ExpandableDemo id="effects-sandbox">
        <div className="my-8 rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
          {/* Header Info */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>代数效应与效应系统（Algebraic Effects）交互探针</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  Perform / Resume 与副作用驯服
                </span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                单步演示代数效应的暂停与延续恢复（Perform & Resume）、React
                Suspense 模拟代数效应的运行拓扑，以及染色函数（Function Color
                Problem）与效应多态。
              </p>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              现代效应模型经典场景预设
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
                setCurrentStepIdx(0);
              }}
            />
          </div>

          {/* Mode Capsule Tabs */}
          <div className="mb-4">
            <CapsuleTabs
              options={[
                {
                  id: "perform_resume",
                  label: "代数效应时序追踪 (Perform & Resume)",
                },
                { id: "react_suspense", label: "React Suspense 效应对照" },
                { id: "function_color", label: "染色函数与效应多态矩阵" },
              ]}
              value={activeTab}
              onChange={(tab) =>
                setActiveTab(
                  tab as "perform_resume" | "react_suspense" | "function_color",
                )
              }
              size="sm"
            />
          </div>

          {/* Main Interactive Stage Container */}
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-card/60 p-4 sm:p-5 h-[var(--demo-height,28rem)] flex flex-col justify-between">
            {/* Canvas Toolbar with S/M/L heights */}
            <CanvasToolbar onReset={handleReset} />
            <CanvasResizer className="absolute bottom-0 inset-x-0 z-20" />

            {/* Tab 1: Perform & Resume Stepper View */}
            {activeTab === "perform_resume" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="rounded-lg bg-card/80 p-3 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block mb-0.5">
                      形式化效应签名 (Formal Effect Signature)
                    </span>
                    <div className="text-primary font-mono text-sm">
                      {`$${currentPreset.formalTex}$`}
                    </div>
                  </div>
                  <div className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-mono">
                    效应目标：{currentPreset.effectName}
                  </div>
                </div>

                {/* Stepper Controls Bar */}
                <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      执行流步进：
                    </span>
                    <div className="flex gap-1">
                      {currentPreset.steps.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`执行步进 ${idx + 1}`}
                          onClick={() => setCurrentStepIdx(idx)}
                          className={`h-6 w-6 rounded text-xs font-mono font-bold transition-all ${
                            currentStepIdx === idx
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentStepIdx === 0}
                      onClick={() =>
                        setCurrentStepIdx((prev) => Math.max(0, prev - 1))
                      }
                      className="px-2.5 py-1 text-xs rounded bg-secondary text-secondary-foreground disabled:opacity-40"
                    >
                      ◀ 上一步
                    </button>
                    <button
                      type="button"
                      disabled={
                        currentStepIdx === currentPreset.steps.length - 1
                      }
                      onClick={() =>
                        setCurrentStepIdx((prev) =>
                          Math.min(currentPreset.steps.length - 1, prev + 1),
                        )
                      }
                      className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-40"
                    >
                      下一步 ▶
                    </button>
                  </div>
                </div>

                {/* Active Step Visual Card */}
                <div className="rounded-lg bg-card/90 border border-border/80 p-4 shadow-sm flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/40 gap-2 mb-2">
                      <span className="font-bold text-xs text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        {activeStep.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-primary/10 text-primary">
                        {activeStep.stateBadge}
                      </span>
                    </div>

                    <pre className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-xs bg-black/30 p-3 rounded-lg border border-white/5 font-mono mb-3">
                      {activeStep.codeSnippet}
                    </pre>
                  </div>

                  <div className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded border border-border/40">
                    💡 <strong>时序解析</strong>：{activeStep.explanation}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: React Suspense Comparison View */}
            {activeTab === "react_suspense" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="text-center max-w-xl mx-auto py-0.5">
                  <h4 className="text-sm font-bold text-foreground">
                    纯粹代数效应 vs React Suspense 的工程世俗化
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    从语言级第一类延续（Continuation）到 JavaScript 抛出 Promise
                    与重放
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 text-xs">
                  {/* Pure Algebraic Effects */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 mb-2">
                        <span className="font-bold text-emerald-400">
                          真正的代数效应 (Koka / Eff)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          语言级一等延续
                        </span>
                      </div>
                      <div className="space-y-2 text-muted-foreground text-[11px] leading-relaxed">
                        <p>{currentPreset.suspenseComparison.algebraicWay}</p>
                        <div className="p-2.5 rounded bg-black/30 font-mono text-[11px] text-emerald-200 border border-emerald-500/20">
                          let user = perform Fetch(id);
                          <br />
                          // 延续 k 仅仅包含下一行：
                          <br />
                          render(user);
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-300/80 font-mono mt-2 border-t border-emerald-500/20 pt-1.5">
                      零重放开销，只执行一次，局部状态安全保留。
                    </div>
                  </div>

                  {/* React Suspense Pragmatic Compromise */}
                  <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/15 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 mb-2">
                        <span className="font-bold text-cyan-400">
                          React Suspense 实用主义实现
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          Throw Promise & Replay
                        </span>
                      </div>
                      <div className="space-y-2 text-muted-foreground text-[11px] leading-relaxed">
                        <p>{currentPreset.suspenseComparison.reactWay}</p>
                        <div className="p-2.5 rounded bg-black/30 font-mono text-[11px] text-cyan-200 border border-cyan-500/20">
                          if (!cache.has(id)) throw promise;
                          <br />
                          // Suspense 捕获并重置组件！
                          <br />
                          // 之后再次从第一行重新执行组件！
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-rose-300 font-mono mt-2 border-t border-cyan-500/20 pt-1.5">
                      ⚠️ 限制：
                      {currentPreset.suspenseComparison.reactLimitation}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Function Color & Keyword Generics View */}
            {activeTab === "function_color" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="text-center max-w-xl mx-auto py-0.5">
                  <h4 className="text-sm font-bold text-foreground">
                    染色函数难题（Function Color Problem）与效应多态
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    红函数（Async）与蓝函数（Sync）的生态割裂，以及效应系统如何消除重复代码
                  </p>
                </div>

                {/* Call Stack Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-blue-500/30 bg-blue-950/15 p-3">
                    <div className="font-bold text-blue-400 mb-1 flex items-center justify-between">
                      <span>🔵 纯同步调用链 (Blue Stack)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                        Sync
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] text-blue-200/90 mt-2">
                      {currentPreset.coloredFunctionMatrix.syncChain.map(
                        (fnName, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px]">
                              L{idx + 1}:
                            </span>
                            <span>{fnName}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-rose-500/30 bg-rose-950/15 p-3">
                    <div className="font-bold text-rose-400 mb-1 flex items-center justify-between">
                      <span>🔴 异步传染调用链 (Red Infection)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                        Infected
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] text-rose-200/90 mt-2">
                      {currentPreset.coloredFunctionMatrix.asyncChain.map(
                        (fnName, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px]">
                              L{idx + 1}:
                            </span>
                            <span>{fnName}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Solution Banner */}
                <div className="rounded-lg bg-card/90 border border-border/80 p-3.5 text-xs">
                  <div className="font-bold text-primary mb-1">
                    💡 效应多态（Effect Polymorphism）终极破局：
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px] mb-2">
                    {
                      currentPreset.coloredFunctionMatrix
                        .keywordGenericsSolution
                    }
                  </p>
                  <div className="font-mono text-[11px] bg-black/30 p-2.5 rounded border border-white/5 text-foreground/90">
                    {currentPreset.coloredFunctionMatrix.coloredInfection}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Insight */}
            <div className="mt-3 rounded bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/40 flex items-start gap-2">
              <span className="text-primary font-bold">💡 理论洞见：</span>
              <span className="flex-1">{currentPreset.insight}</span>
            </div>
          </div>

          {/* Speed Reference Accordion */}
          <details className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <summary className="font-semibold text-foreground cursor-pointer select-none">
              代数效应（Algebraic Effects）与现代语言理论核心速查
            </summary>
            <div className="mt-3 text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                <strong>1. Plotkin & Pretnar（2009）代数效应与处理器</strong>：
                将副作用的形式化建模从传统的
                Monad（单子）中彻底解耦。操作声明只规定“我要发起什么效应（Perform）”，具体的副作用执行完全由外层动态绑定的处理器（Handler）决定，实现了副作用与纯计算的彻底正交。
              </p>
              <p>
                <strong>
                  2. 什么是单次恢复（One-shot）与多次恢复（Multi-shot）？
                </strong>
                ： 若延续闭包 $k$ 只能被调用一次（如大多数异步
                I/O、状态读写），称为 One-shot 延续；若延续闭包 $k${" "}
                允许被多次重复调用（例如在回溯算法、概率编程和非确定性多分支中分叉探索），称为
                Multi-shot 延续。
              </p>
              <p>
                <strong>3. 效应行多态（Effect Row Polymorphism）</strong>：
                类型签名形如{" "}
                {
                  "$f: A \\to B \\ \\& \\ \\langle \\text{IO}, \\text{State} \\mid \\rho \\rangle$"
                }
                。类型系统不仅检查入参和出参的类型，还显式推导计算过程中会引发哪些副作用集合。未被处理的效应将自动向上冒泡，保证了无遗漏的编译期静态效应安全。
              </p>
            </div>
          </details>
        </div>
      </ExpandableDemo>
    </AutoMath>
  );
}
