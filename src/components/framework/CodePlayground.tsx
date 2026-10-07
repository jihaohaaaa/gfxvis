import { useState, useEffect, useCallback, useRef, useId } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { actions } from "astro:actions";
import {
  initMonaco,
  mapLanguageToMonaco,
  computeEditorHeight,
} from "../../lib/editor/monaco";
import { resolveMonacoTheme } from "../../lib/editor/themes";
import { useGfxSettings } from "../../lib/settings/settings-store";

export interface CodePlaygroundProps {
  lang: "node" | "ts" | "js" | "rust" | "cpp";
  initialCode?: string;
  code?: string;
  title?: string;
  description?: string;
  editable?: boolean;
  maxHeight?: string;
  className?: string;
}

const LANG_CONFIG: Record<
  CodePlaygroundProps["lang"],
  { label: string; fileSuffix: string; hint: string }
> = {
  node: {
    label: "Node.js (Native API)",
    fileSuffix: "main.mjs",
    hint: "支持 node:fs, node:os, node:path 等原生服务端模块",
  },
  ts: {
    label: "TypeScript (TSX)",
    fileSuffix: "main.ts",
    hint: "经由 tsx 引擎原生执行现代 TypeScript / ES2024",
  },
  js: {
    label: "JavaScript",
    fileSuffix: "main.mjs",
    hint: "服务端原生 Node.js ES 模块环境",
  },
  rust: {
    label: "Rust",
    fileSuffix: "main.rs",
    hint: "调用本地 rustc -O 优化编译并执行",
  },
  cpp: {
    label: "C++",
    fileSuffix: "main.cpp",
    hint: "调用本地 clang++ / g++ -std=c++23 -O2 编译并执行",
  },
};

/**
 * 监听全站 dark / light 模式切换钩子
 */
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

function parseMaxHeight(maxHeightStr?: string): number {
  if (!maxHeightStr || maxHeightStr === "none") return 520;
  if (maxHeightStr.endsWith("rem")) {
    const rem = parseFloat(maxHeightStr);
    return Math.round(rem * 16);
  }
  if (maxHeightStr.endsWith("px")) {
    return parseInt(maxHeightStr, 10);
  }
  return 520;
}

export default function CodePlayground({
  lang,
  initialCode,
  code,
  title,
  description,
  editable = true,
  maxHeight = "30rem",
  className = "",
}: CodePlaygroundProps) {
  const defaultSnippet = (initialCode ?? code ?? "").trim();
  const [currentCode, setCurrentCode] = useState<string>(defaultSnippet);
  const [isEditing, setIsEditing] = useState<boolean>(editable);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editorHeight, setEditorHeight] = useState(120);
  const [monacoLoaded, setMonacoLoaded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const isDark = useIsDarkMode();
  const { settings } = useGfxSettings();

  const uniqueId = useId().replace(/[:]/g, "_");
  const modelExt =
    lang === "ts"
      ? "ts"
      : lang === "node" || lang === "js"
        ? "mjs"
        : lang === "rust"
          ? "rs"
          : "cpp";
  const modelPath = `file:///playground_${uniqueId}.${modelExt}`;

  const cfg = LANG_CONFIG[lang];
  const isDirty = currentCode !== defaultSnippet;
  const maxHeightPx = parseMaxHeight(maxHeight);
  const monacoLang = mapLanguageToMonaco(lang);
  const activeTheme = resolveMonacoTheme(settings.editorTheme, isDark);

  // 确保本地 Monaco 离线配置在客户端首次渲染时已注册
  useEffect(() => {
    initMonaco().then(() => {
      setMonacoLoaded(true);
    });
  }, []);

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await actions.executeCode({
        lang,
        code: currentCode.trim(),
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
      setLoading(false);
    }
  }, [lang, currentCode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [currentCode]);

  const handleReset = useCallback(() => {
    setCurrentCode(defaultSnippet);
  }, [defaultSnippet]);

  const handleUnlockEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditorMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      // 确保当前模型的语言绑定到 monacoLang (针对 C++、Rust、TS、JS 强力激活语法高亮)
      const model = editor.getModel();
      if (model && monacoLang) {
        monacoInstance.editor.setModelLanguage(model, monacoLang);
      }

      // 动态高度自适应
      const updateHeight = () => {
        const computed = computeEditorHeight(editor, maxHeightPx, 64);
        setEditorHeight(computed);
        requestAnimationFrame(() => {
          editor.layout();
        });
      };

      editor.onDidChangeModelContent(updateHeight);
      if (typeof editor.onDidContentSizeChange === "function") {
        editor.onDidContentSizeChange(updateHeight);
      }
      updateHeight();

      // Ctrl / Cmd + Enter 快捷运行代码
      editor.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          handleRun();
        },
      );
    },
    [handleRun, maxHeightPx, monacoLang],
  );

  // 当外部配置改变时同步 Monaco 配置
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.updateOptions({
      fontSize: settings.editorFontSize,
      lineNumbers: settings.editorLineNumbers ? "on" : "off",
      minimap: { enabled: settings.editorMinimap },
      tabSize: settings.editorTabSize,
    });
  }, [settings]);

  const hasOutput = output !== null;
  const isSuccess = output?.exitCode === 0;

  return (
    <div
      data-component="code-playground"
      className={`my-6 overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all ${className}`}
    >
      {/* 头部控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-hover/60 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {cfg.label}
          </span>
          {!isEditing && (
            <span className="rounded-md border border-border/80 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
              只读
            </span>
          )}
          {title && <span className="font-semibold text-ink">{title}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          {!isEditing && (
            <button
              type="button"
              onClick={handleUnlockEdit}
              className="cursor-pointer rounded-md border border-border/70 bg-surface px-2.5 py-1 text-muted transition-colors hover:border-accent hover:text-ink active:scale-95"
              title="解锁并就地修改代码"
            >
              ✏️ 编辑代码
            </button>
          )}

          {isEditing && isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-md border border-border/70 bg-surface px-2.5 py-1 text-muted transition-colors hover:border-accent hover:text-ink active:scale-95"
              title="重置回初始预设代码"
            >
              ↺ 重置
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="cursor-pointer rounded-md border border-border/70 bg-surface px-2.5 py-1 text-muted transition-colors hover:border-accent hover:text-ink active:scale-95"
            title="复制代码"
          >
            {copied ? "✓ 已复制" : "复制"}
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1 font-semibold text-accent-foreground shadow-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            title="在服务器即时编译执行 (Ctrl/Cmd + Enter)"
          >
            {loading ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>编译运行中...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>运行代码</span>
              </>
            )}
          </button>
        </div>
      </div>

      {description && (
        <div className="border-b border-border/60 bg-surface/30 px-4 py-1.5 text-[11px] text-muted">
          {description}
        </div>
      )}

      {/* Monaco Editor 代码编辑/展示区 */}
      <div
        className="relative transition-all"
        style={{ height: `${editorHeight}px` }}
      >
        {monacoLoaded ? (
          <Editor
            path={modelPath}
            height="100%"
            language={monacoLang}
            value={currentCode}
            theme={activeTheme}
            onChange={(val) => setCurrentCode(val ?? "")}
            onMount={handleEditorMount}
            loading={
              <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span>载入 Monaco Editor...</span>
              </div>
            }
            options={{
              readOnly: !isEditing,
              minimap: { enabled: settings.editorMinimap },
              lineNumbers: settings.editorLineNumbers ? "on" : "off",
              lineNumbersMinChars: 2,
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 4,
              scrollBeyondLastLine: false,
              fontSize: settings.editorFontSize,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              automaticLayout: true,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
              stickyScroll: { enabled: false },
              tabSize: settings.editorTabSize,
              wordWrap: "on",
              contextmenu: true,
              renderLineHighlight: isEditing ? "all" : "none",
              fixedOverflowWidgets: true,
              quickSuggestions: {
                other: isEditing,
                comments: false,
                strings: isEditing,
              },
              suggestOnTriggerCharacters: isEditing,
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: "on",
              parameterHints: {
                enabled: true,
                cycle: true,
              },
              hover: {
                enabled: "on",
                delay: 150,
              },
            }}
          />
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span>载入 Monaco Editor...</span>
          </div>
        )}
      </div>

      {/* 控制台输出区 */}
      {hasOutput && (
        <div className="border-t border-border bg-neutral-950 p-4 text-xs text-neutral-200">
          <div className="mb-2 flex items-center justify-between border-b border-neutral-800 pb-2 text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              <span className="font-semibold">
                {isSuccess
                  ? `执行成功 (Exit: ${output.exitCode})`
                  : `执行中断 (Exit: ${output.exitCode})`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>耗时: {output.durationMs}ms</span>
              <button
                type="button"
                onClick={() => setOutput(null)}
                className="cursor-pointer text-neutral-400 hover:text-neutral-200"
                title="清空输出控制台"
              >
                ✕ 清空控制台
              </button>
            </div>
          </div>

          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed select-text">
            {output.stdout && (
              <span className="text-emerald-400">{output.stdout}</span>
            )}
            {output.stderr && (
              <span className="text-rose-400">{output.stderr}</span>
            )}
            {!output.stdout && !output.stderr && (
              <span className="text-neutral-500">
                (程序运行结束，未产生标准输出)
              </span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
