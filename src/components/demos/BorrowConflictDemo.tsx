import {
  useId,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Editor from "@monaco-editor/react";
import { actions } from "astro:actions";
import { initMonaco, computeEditorHeight } from "../../lib/editor/monaco";
import { resolveMonacoTheme } from "../../lib/editor/themes";
import { useGfxSettings } from "../../lib/settings/settings-store";
import CapsuleTabs from "../framework/CapsuleTabs";
import ExpandableDemo from "../framework/ExpandableDemo";
import { AutoMath } from "../framework/AutoMath";
import ParamSlider from "../framework/ParamSlider";

type Permission = "R" | "W";

interface PlaceScenario {
  id: string;
  label: string;
  p1: string;
  p2: string;
  aliases: boolean;
  desc: string;
}

const SCENARIOS: readonly PlaceScenario[] = [
  {
    id: "same-var",
    label: "同一变量 (x vs x)",
    p1: "x",
    p2: "x",
    aliases: true,
    desc: "访问同一个存储位置，必满足 p₁ ∼ p₂。",
  },
  {
    id: "disjoint-fields",
    label: "独立字段 (x.0 vs x.1)",
    p1: "x.0",
    p2: "x.1",
    aliases: false,
    desc: "元组/结构体的不相交字段，内存位置独立，p₁ ≁ p₂。",
  },
  {
    id: "parent-child",
    label: "整体与字段 (x vs x.0)",
    p1: "x",
    p2: "x.0",
    aliases: true,
    desc: "父级 place 与子字段重叠，修改或借出整体会包含子字段，p₁ ∼ p₂。",
  },
  {
    id: "reborrow",
    label: "指针解引用 (*r vs *r)",
    p1: "*r",
    p2: "*r",
    aliases: true,
    desc: "经由同一引用进行的寻址访问，指向同一目标内存，p₁ ∼ p₂。",
  },
];

const PERMISSION_OPTIONS: readonly { id: Permission; label: string }[] = [
  { id: "R", label: "读访问 (R / Shared)" },
  { id: "W", label: "写访问 (W / Exclusive)" },
];

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    syncTheme();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          syncTheme();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function BorrowConflictDemo() {
  const [scenarioId, setScenarioId] = useState<string>("same-var");
  const [alpha1, setAlpha1] = useState<Permission>("R");
  const [alpha2, setAlpha2] = useState<Permission>("W");
  const [s1, setS1] = useState<number>(1);
  const [e1, setE1] = useState<number>(6);
  const [s2, setS2] = useState<number>(4);
  const [e2, setE2] = useState<number>(9);

  const isDark = useIsDarkMode();
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [copied, setCopied] = useState(false);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  // 1. Place 冲突判据
  const placeConflict = scenario.aliases;

  // 2. 生命周期重叠判据: [s1, e1] 与 [s2, e2] 的交集
  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1, e2);
  const timeOverlap = overlapStart <= overlapEnd;

  // 3. 权限冲突判据: 非 (R && R)
  const permConflict = !(alpha1 === "R" && alpha2 === "R");

  // 三者合取: 最终借用冲突
  const isConflict = placeConflict && timeOverlap && permConflict;

  const uniqueId = useId();

  // 根据当前形式化三维状态动态生成的真实 Rust 代码
  const generatedRustCode = useMemo(() => {
    if (scenarioId === "disjoint-fields") {
      if (timeOverlap) {
        return [
          "struct Pair {",
          "    first: i32,",
          "    second: i32,",
          "}",
          "",
          "fn main() {",
          "    let mut x = Pair { first: 10, second: 20 };",
          `    let r1 = &${alpha1 === "W" ? "mut " : ""}x.first;  // A1: ${alpha1 === "W" ? "独占写 W" : "只读 R"}(x.0)`,
          `    let r2 = &${alpha2 === "W" ? "mut " : ""}x.second; // A2: ${alpha2 === "W" ? "独占写 W" : "只读 R"}(x.1)`,
          '    println!("r1 (x.0): {}, r2 (x.1): {}", r1, r2);',
          '    println!("✓ 形式化判定：x.0 与 x.1 内存物理不相交 (x.0 ≁ x.1)，编译执行成功！");',
          "}",
        ].join("\n");
      }
      return [
        "struct Pair {",
        "    first: i32,",
        "    second: i32,",
        "}",
        "",
        "fn main() {",
        "    let mut x = Pair { first: 10, second: 20 };",
        "    {",
        `        let r1 = &${alpha1 === "W" ? "mut " : ""}x.first;`,
        '        println!("A1 执行完成: {}", r1);',
        "    } // r1 生命周期结束",
        `    let r2 = &${alpha2 === "W" ? "mut " : ""}x.second;`,
        '    println!("A2 执行完成: {}", r2);',
        '    println!("✓ 内存独立且时间轴错开，安全编译通过！");',
        "}",
      ].join("\n");
    }

    if (scenarioId === "parent-child") {
      if (timeOverlap) {
        if (alpha1 === "R" && alpha2 === "R") {
          return [
            "struct Pair {",
            "    first: i32,",
            "    second: i32,",
            "}",
            "",
            "fn main() {",
            "    let x = Pair { first: 10, second: 20 };",
            "    let r1 = &x;       // A1: 访问父级整体 x (R)",
            "    let r2 = &x.first; // A2: 访问子字段 x.0 (R)",
            '    println!("r1: ({}, {}), r2: {}", r1.first, r1.second, r2);',
            '    println!("✓ 读读共享，即使存在包含别名 (x ∼ x.0) 也完全安全！");',
            "}",
          ].join("\n");
        }
        return [
          "struct Pair {",
          "    first: i32,",
          "    second: i32,",
          "}",
          "",
          "fn main() {",
          "    let mut x = Pair { first: 10, second: 20 };",
          `    let r1 = &${alpha1 === "W" ? "mut " : ""}x;       // A1: 访问父级整体 x (${alpha1})`,
          `    let r2 = &${alpha2 === "W" ? "mut " : ""}x.first; // A2: 访问子字段 x.0 (${alpha2})`,
          '    println!("活跃区间重叠: {:p}, {:p}", r1, r2); // 冲突：父级 Place 包含子字段，独占写被触犯！',
          "}",
        ].join("\n");
      }
      return [
        "struct Pair {",
        "    first: i32,",
        "    second: i32,",
        "}",
        "",
        "fn main() {",
        "    let mut x = Pair { first: 10, second: 20 };",
        "    {",
        `        let r1 = &${alpha1 === "W" ? "mut " : ""}x;`,
        '        println!("A1 操作整体完成");',
        "    } // r1 生命周期终结，让渡出子字段权限",
        `    let r2 = &${alpha2 === "W" ? "mut " : ""}x.first;`,
        '    println!("A2 操作子字段: {}", r2);',
        '    println!("✓ 时间轴错开，编译运行通过！");',
        "}",
      ].join("\n");
    }

    if (scenarioId === "reborrow") {
      if (timeOverlap) {
        if (alpha1 === "R" && alpha2 === "R") {
          return [
            "fn main() {",
            "    let mut val = 42;",
            "    let r: &mut i32 = &mut val;",
            "    let r1 = &*r; // A1: 从 *r 重借只读 R",
            "    let r2 = &*r; // A2: 从 *r 重借只读 R",
            '    println!("r1: {}, r2: {}", r1, r2);',
            '    println!("✓ 多个只读重借安全共存！");',
            "}",
          ].join("\n");
        }
        return [
          "fn main() {",
          "    let mut val = 42;",
          "    let r: &mut i32 = &mut val;",
          `    let r1 = &${alpha1 === "W" ? "mut " : ""}*r; // A1: 重借 (${alpha1})`,
          `    let r2 = &${alpha2 === "W" ? "mut " : ""}*r; // A2: 重借 (${alpha2})`,
          '    println!("活跃重叠: {}, {}", r1, r2); // 冲突：重借指向同一解引用且含写权限！',
          "}",
        ].join("\n");
      }
      return [
        "fn main() {",
        "    let mut val = 42;",
        "    let r: &mut i32 = &mut val;",
        "    {",
        `        let r1 = &${alpha1 === "W" ? "mut " : ""}*r;`,
        '        println!("A1 完成: {}", r1);',
        "    } // r1 生命周期终结",
        `    let r2 = &${alpha2 === "W" ? "mut " : ""}*r;`,
        '    println!("A2 完成: {}", r2);',
        '    println!("✓ 解引用生命周期完全错开，安全通过！");',
        "}",
      ].join("\n");
    }

    // default: same-var
    if (timeOverlap) {
      if (alpha1 === "R" && alpha2 === "R") {
        return [
          "fn main() {",
          "    let mut x = 42;",
          "    let r1 = &x; // A1: 只读共享借用 R(x)",
          "    let r2 = &x; // A2: 只读共享借用 R(x)",
          '    println!("r1: {}, r2: {}", r1, r2);',
          '    println!("✓ 读读安全共享，即使生命周期重叠也完全合规！");',
          "}",
        ].join("\n");
      }
      return [
        "fn main() {",
        "    let mut x = 42;",
        `    let r1 = &${alpha1 === "W" ? "mut " : ""}x; // A1: 访问事件 (${alpha1})`,
        `    let r2 = &${alpha2 === "W" ? "mut " : ""}x; // A2: 访问事件 (${alpha2})`,
        '    println!("r1: {}, r2: {}", r1, r2); // 冲突：同时满足同变量、时间重叠与写冲突！',
        "}",
      ].join("\n");
    }

    return [
      "fn main() {",
      "    let mut x = 42;",
      "    // 访问事件 A1 生命周期：",
      "    {",
      `        let r1 = &${alpha1 === "W" ? "mut " : ""}x;`,
      `        println!("A1 (${alpha1}) 执行完成: {}", r1);`,
      "    } // r1 生命周期终结，释放独占/共享权限",
      "",
      "    // 访问事件 A2 生命周期（时间轴完全错开）：",
      `    let r2 = &${alpha2 === "W" ? "mut " : ""}x;`,
      `    println!("A2 (${alpha2}) 执行完成: {}", r2);`,
      '    println!("✓ 生命周期完全错开，无并发交集，安全通过！");',
      "}",
    ].join("\n");
  }, [scenarioId, timeOverlap, alpha1, alpha2]);

  const [editorHeight, setEditorHeight] = useState(200);
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const { settings } = useGfxSettings();

  useEffect(() => {
    initMonaco().then(() => {
      setMonacoLoaded(true);
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
    const updateHeight = () => {
      const computed = computeEditorHeight(editor, 420, 100);
      setEditorHeight(computed);
      requestAnimationFrame(() => {
        editor.layout();
      });
    };
    editor.onDidContentSizeChange?.(updateHeight);
    updateHeight();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedRustCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [generatedRustCode]);

  const runCompilation = useCallback(async (codeToRun: string) => {
    setCompiling(true);
    try {
      const { data, error } = await actions.executeCode({
        lang: "rust",
        code: codeToRun.trim(),
      });
      if (error) {
        setOutput({
          stdout: "",
          stderr: error.message,
          exitCode: 1,
          durationMs: 0,
        });
      } else if (data) {
        setOutput(data);
      }
    } catch (err: unknown) {
      setOutput({
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        durationMs: 0,
      });
    } finally {
      setCompiling(false);
    }
  }, []);

  // 500ms 防抖自动调用本地 rustc 编译
  useEffect(() => {
    const timer = setTimeout(() => {
      runCompilation(generatedRustCode);
    }, 500);
    return () => clearTimeout(timer);
  }, [generatedRustCode, runCompilation]);

  return (
    <AutoMath>
      <ExpandableDemo id="borrow-conflict-simulator">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface/50 p-4 sm:p-5">
          {/* 顶部标题与说明 */}
          <div>
            <h4 className="text-base font-semibold text-ink">
              借用冲突三维判定模拟器
            </h4>
            <p className="mt-1 text-xs text-muted">
              验证形式化冲突判据：
              <span className="font-mono text-ink">
                A₁ ⋈ A₂ ⟺ (p₁ ∼ p₂) ∧ (ℓ₁ ∩ ℓ₂ ≠ ∅) ∧ conflict(α₁, α₂)
              </span>
            </p>
          </div>

          {/* 场景选择 */}
          <div className="flex flex-wrap items-center gap-3">
            <CapsuleTabs
              options={SCENARIOS}
              value={scenarioId}
              onChange={(id) => setScenarioId(id)}
              size="xs"
              label="Place 场景："
            />
          </div>
          <p className="text-xs text-muted">
            场景说明：{scenario.desc}
            <span className="ml-2 font-mono text-ink">
              {scenario.p1} {placeConflict ? "∼" : "≁"} {scenario.p2}
            </span>
          </p>

          {/* 访问事件 A1 与 A2 调节面板 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 事件 A1 */}
            <div className="flex flex-col gap-2.5 rounded-md border border-border bg-surface p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">访问事件 $A_1$</span>
                <span className="font-mono text-xs text-muted">
                  p₁ = {scenario.p1}
                </span>
              </div>
              <CapsuleTabs
                options={PERMISSION_OPTIONS}
                value={alpha1}
                onChange={(val) => setAlpha1(val)}
                size="xs"
                label="权限 α₁："
              />
              <div className="space-y-1.5 pt-1">
                <ParamSlider
                  label={<span className="text-xs">起始时刻 $s_1$</span>}
                  value={s1}
                  min={0}
                  max={Math.min(e1, 10)}
                  step={1}
                  display={String(s1)}
                  onChange={(val) => setS1(Math.min(val, e1))}
                  widthClass="w-32"
                />
                <ParamSlider
                  label={<span className="text-xs">释放时刻 $e_1$</span>}
                  value={e1}
                  min={Math.max(s1, 0)}
                  max={10}
                  step={1}
                  display={String(e1)}
                  onChange={(val) => setE1(Math.max(val, s1))}
                  widthClass="w-32"
                />
              </div>
              <p className="font-mono text-xs text-muted">
                区间 ℓ₁: [{s1}, {e1})，跨度 {Math.max(0, e1 - s1)}
              </p>
            </div>

            {/* 事件 A2 */}
            <div className="flex flex-col gap-2.5 rounded-md border border-border bg-surface p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">访问事件 $A_2$</span>
                <span className="font-mono text-xs text-muted">
                  p₂ = {scenario.p2}
                </span>
              </div>
              <CapsuleTabs
                options={PERMISSION_OPTIONS}
                value={alpha2}
                onChange={(val) => setAlpha2(val)}
                size="xs"
                label="权限 α₂："
              />
              <div className="space-y-1.5 pt-1">
                <ParamSlider
                  label={<span className="text-xs">起始时刻 $s_2$</span>}
                  value={s2}
                  min={0}
                  max={Math.min(e2, 10)}
                  step={1}
                  display={String(s2)}
                  onChange={(val) => setS2(Math.min(val, e2))}
                  widthClass="w-32"
                />
                <ParamSlider
                  label={<span className="text-xs">释放时刻 $e_2$</span>}
                  value={e2}
                  min={Math.max(s2, 0)}
                  max={10}
                  step={1}
                  display={String(e2)}
                  onChange={(val) => setE2(Math.max(val, s2))}
                  widthClass="w-32"
                />
              </div>
              <p className="font-mono text-xs text-muted">
                区间 ℓ₂: [{s2}, {e2})，跨度 {Math.max(0, e2 - s2)}
              </p>
            </div>
          </div>

          {/* 时间轴可视化 (Timeline SVG) */}
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">
                控制流活跃时间轴（CFG 投影）：
              </span>
              <span
                className={`font-mono font-medium ${
                  timeOverlap
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : "text-emerald-600 dark:text-emerald-400 font-semibold"
                }`}
              >
                ℓ₁ ∩ ℓ₂ {timeOverlap ? "≠ ∅ (重叠)" : "= ∅ (无交集)"}
              </span>
            </div>

            {/* SVG 时间轴 */}
            <div className="overflow-x-auto py-1">
              <svg
                viewBox="0 0 520 90"
                className="h-24 w-full min-w-[480px] select-none text-[11px]"
                role="img"
                aria-labelledby={`${uniqueId}-title`}
              >
                <title id={`${uniqueId}-title`}>
                  借用检查生命周期重叠时间轴投影图
                </title>

                {/* 背景标尺刻度网格 */}
                {Array.from({ length: 11 }).map((_, idx) => {
                  const x = 50 + idx * 45;
                  return (
                    <g key={`grid-${x}`}>
                      <line
                        x1={x}
                        y1={15}
                        x2={x}
                        y2={75}
                        stroke="var(--color-border, #e5e7eb)"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={88}
                        textAnchor="middle"
                        fill="var(--color-muted, #9ca3af)"
                        className="font-mono text-[10px]"
                      >
                        {idx}
                      </text>
                    </g>
                  );
                })}

                {/* 重叠区间着色高亮（若有） */}
                {timeOverlap && overlapEnd > overlapStart && (
                  <rect
                    x={50 + overlapStart * 45}
                    y={18}
                    width={(overlapEnd - overlapStart) * 45}
                    height={54}
                    fill="var(--color-destructive, #ef4444)"
                    opacity="0.12"
                    rx="4"
                  />
                )}

                {/* A1 生命周期段 */}
                <g>
                  <text
                    x={15}
                    y={35}
                    fill="var(--color-ink, #1f2937)"
                    className="font-mono text-[11px] font-semibold"
                  >
                    A₁
                  </text>
                  <rect
                    x={50 + s1 * 45}
                    y={22}
                    width={Math.max((e1 - s1) * 45, 3)}
                    height={18}
                    rx="3"
                    fill={
                      alpha1 === "W"
                        ? "var(--color-accent, #3b82f6)"
                        : "var(--color-ink, #10b981)"
                    }
                    opacity="0.85"
                  />
                </g>

                {/* A2 生命周期段 */}
                <g>
                  <text
                    x={15}
                    y={63}
                    fill="var(--color-ink, #1f2937)"
                    className="font-mono text-[11px] font-semibold"
                  >
                    A₂
                  </text>
                  <rect
                    x={50 + s2 * 45}
                    y={50}
                    width={Math.max((e2 - s2) * 45, 3)}
                    height={18}
                    rx="3"
                    fill={
                      alpha2 === "W"
                        ? "var(--color-accent, #3b82f6)"
                        : "var(--color-ink, #10b981)"
                    }
                    opacity="0.85"
                  />
                </g>
              </svg>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between text-[11px] text-muted">
              <span>
                图例：<span className="font-mono">R (Read)</span> 为常规色，
                <span className="font-mono text-accent">W (Write)</span>{" "}
                为强调色
              </span>
              <span>
                {timeOverlap
                  ? `重叠活跃区间: [${overlapStart}, ${overlapEnd}]`
                  : "生命周期完全错开（无交集）"}
              </span>
            </div>
          </div>

          {/* 判定三要素矩阵卡片 */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div
              className={`rounded-lg border p-3 text-xs transition-all ${
                placeConflict
                  ? "border-red-500/50 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/15"
                  : "border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/60 dark:bg-emerald-500/15"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`font-semibold ${
                    placeConflict
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  ① 空间判定：
                  {"$p_1 \\sim p_2$"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                    placeConflict
                      ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                      : "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {placeConflict ? "true (冲突)" : "false (安全)"}
                </span>
              </div>
              <p
                className={`mt-1.5 font-medium ${
                  placeConflict
                    ? "text-red-800 dark:text-red-200"
                    : "text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {placeConflict ? "存在别名重叠 (true)" : "内存完全独立 (false)"}
              </p>
            </div>

            <div
              className={`rounded-lg border p-3 text-xs transition-all ${
                timeOverlap
                  ? "border-red-500/50 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/15"
                  : "border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/60 dark:bg-emerald-500/15"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`font-semibold ${
                    timeOverlap
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  ② 时间判定：
                  {"$\\ell_1 \\cap \\ell_2 \\neq \\varnothing$"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                    timeOverlap
                      ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                      : "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {timeOverlap ? "true (冲突)" : "false (安全)"}
                </span>
              </div>
              <p
                className={`mt-1.5 font-medium ${
                  timeOverlap
                    ? "text-red-800 dark:text-red-200"
                    : "text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {timeOverlap ? "生命周期重叠 (true)" : "生命周期错开 (false)"}
              </p>
            </div>

            <div
              className={`rounded-lg border p-3 text-xs transition-all ${
                permConflict
                  ? "border-red-500/50 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/15"
                  : "border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/60 dark:bg-emerald-500/15"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`font-semibold ${
                    permConflict
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  ③ 权限判定：
                  {"$\\operatorname{conflict}(\\alpha_1, \\alpha_2)$"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                    permConflict
                      ? "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                      : "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {permConflict ? "true (冲突)" : "false (安全)"}
                </span>
              </div>
              <p
                className={`mt-1.5 font-medium ${
                  permConflict
                    ? "text-red-800 dark:text-red-200"
                    : "text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {permConflict
                  ? `包含写权限冲突 (${alpha1} vs ${alpha2}) (true)`
                  : `读读安全共享 (${alpha1} ∥ ${alpha2}) (false)`}
              </p>
            </div>
          </div>

          {/* 综合裁决结果 */}
          <div
            className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm transition-all ${
              isConflict
                ? "border-red-500/60 bg-red-500/10 text-red-800 dark:border-red-500/70 dark:bg-red-500/15 dark:text-red-200"
                : "border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-200"
            }`}
            aria-live="polite"
          >
            <div className="mt-0.5 text-lg">{isConflict ? "❌" : "✅"}</div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold">
                {isConflict
                  ? "借用检查失败：检测到非法冲突访问 (A₁ ⋈ A₂ = true)"
                  : "借用检查通过：访问事件允许安全共存 (A₁ ⋈ A₂ = false)"}
              </p>
              <p className="text-xs opacity-90">
                {isConflict
                  ? "同时满足【空间别名】、【生命周期重叠】与【写权限冲突】。Rust 编译器在此处将报告借用检查错误（例如 E0499 或 E0502）。"
                  : !placeConflict
                    ? "访问的 Place 物理不重叠，即便生命周期重叠且均为写操作，也是完全安全的分离字段修改。"
                    : !timeOverlap
                      ? "生命周期已完全分离，前一个借用已经结束并交还权限，后续访问不再产生冲突。"
                      : "所有并发访问均为只读权限 (Shared/Read)，允许多方安全并发读取。"}
              </p>
            </div>
          </div>

          {/* 联动现场 Rust 代码与 rustc 编译面板 */}
          <div className="mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {/* 代码面板头部 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-hover/60 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Rust
                </span>
                <span className="font-semibold text-ink">
                  实时映射代码与现场 rustc 编译验证
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="cursor-pointer rounded-md border border-border/70 bg-surface px-2.5 py-1 text-muted transition-colors hover:border-accent hover:text-ink active:scale-95"
                  title="复制代码"
                >
                  {copied ? "✓ 已复制" : "复制代码"}
                </button>
                <button
                  type="button"
                  onClick={() => runCompilation(generatedRustCode)}
                  disabled={compiling}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1 font-semibold text-accent-foreground shadow-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  title="重新编译执行"
                >
                  {compiling ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>编译中...</span>
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      <span>重新运行</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="border-b border-border/50 bg-surface/30 px-3.5 py-1.5 text-[11px] text-muted">
              跟随上方参数实时生成的 Rust 代码（停止调节 500ms 后自动调用本地
              rustc -O 编译并捕获真机诊断）：
            </p>

            {/* Monaco Editor 只读展示 */}
            <div
              className="relative transition-all"
              style={{ height: `${editorHeight}px` }}
            >
              {monacoLoaded ? (
                <Editor
                  height="100%"
                  language="rust"
                  value={generatedRustCode}
                  theme={resolveMonacoTheme(settings.editorTheme, isDark)}
                  onMount={handleEditorMount}
                  loading={
                    <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <span>载入 Monaco Editor...</span>
                    </div>
                  }
                  options={{
                    readOnly: true,
                    minimap: { enabled: settings.editorMinimap },
                    lineNumbers: settings.editorLineNumbers ? "on" : "off",
                    lineNumbersMinChars: 2,
                    folding: true,
                    scrollBeyondLastLine: false,
                    fontSize: settings.editorFontSize,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    automaticLayout: true,
                    scrollbar: {
                      vertical: "auto",
                      horizontal: "auto",
                      verticalScrollbarSize: 6,
                      horizontalScrollbarSize: 6,
                    },
                    tabSize: settings.editorTabSize,
                    wordWrap: "on",
                  }}
                />
              ) : (
                <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span>载入 Monaco Editor...</span>
                </div>
              )}
            </div>

            {/* rustc 输出控制台 */}
            <div className="border-t border-border bg-neutral-950 p-3.5 text-xs text-neutral-200">
              <div className="mb-2 flex items-center justify-between border-b border-neutral-800 pb-1.5 text-[11px] font-mono text-neutral-400">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      compiling
                        ? "animate-pulse bg-amber-400"
                        : output?.exitCode === 0
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                    }`}
                  />
                  <span className="font-semibold">
                    {compiling
                      ? "正在调用本地 rustc -O 编译推演..."
                      : output?.exitCode === 0
                        ? `✓ rustc 编译成功 (Exit: ${output.exitCode})`
                        : output
                          ? `✕ rustc 借用检查拦截 (Exit: ${output.exitCode})`
                          : "等待编译"}
                  </span>
                </div>
                {output && !compiling && (
                  <span>耗时: {output.durationMs}ms</span>
                )}
              </div>

              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed select-text">
                {compiling && (
                  <span className="text-neutral-500">
                    正在进行借用检查与优化编译...
                  </span>
                )}
                {!compiling && output?.stdout && (
                  <span className="text-emerald-400">{output.stdout}</span>
                )}
                {!compiling && output?.stderr && (
                  <span className="text-rose-400">{output.stderr}</span>
                )}
                {!compiling && !output && (
                  <span className="text-neutral-500">暂无编译输出</span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </ExpandableDemo>
    </AutoMath>
  );
}
