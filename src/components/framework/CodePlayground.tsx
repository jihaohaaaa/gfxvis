import { useState, useEffect, useMemo, useCallback } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { tags as t } from "@lezer/highlight";
import { githubLightInit, githubDarkInit } from "@uiw/codemirror-theme-github";
import { actions } from "astro:actions";

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

const customEditorStyle = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "1.65",
  },
  ".cm-content": {
    padding: "10px 0",
  },
  ".cm-line": {
    padding: "0 12px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--gfx-border, #e2e8f0)",
    color: "var(--gfx-muted, #94a3b8)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--gfx-ink, #0f172a)",
    fontWeight: "600",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

const customGithubLight = githubLightInit({
  styles: [
    { tag: t.processingInstruction, color: "#d73a49" }, // #include, #define 等预处理指令在浅色模式下为标志性 GitHub 绯红
  ],
});

const customGithubDark = githubDarkInit({
  styles: [
    { tag: t.processingInstruction, color: "#ff7b72" }, // 暗色模式下为标志性 GitHub 珊瑚红
  ],
});

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

  const isDark = useIsDarkMode();
  const cfg = LANG_CONFIG[lang];
  const isDirty = currentCode !== defaultSnippet;

  const extensions = useMemo(() => {
    const list = [customEditorStyle];
    switch (lang) {
      case "cpp":
        list.push(cpp());
        break;
      case "rust":
        list.push(rust());
        break;
      case "ts":
        list.push(javascript({ typescript: true, jsx: true }));
        break;
      case "node":
      case "js":
      default:
        list.push(javascript({ typescript: false, jsx: false }));
        break;
    }
    return list;
  }, [lang]);

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

  const hasOutput = output !== null;
  const isSuccess = output?.exitCode === 0;

  return (
    <div
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
            title="在服务器即时编译执行"
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

      {/* CodeMirror 6 代码编辑/展示区 */}
      <div className="relative">
        <CodeMirror
          value={currentCode}
          onChange={(val) => setCurrentCode(val)}
          theme={isDark ? customGithubDark : customGithubLight}
          extensions={extensions}
          editable={isEditing}
          readOnly={!isEditing}
          maxHeight={maxHeight !== "none" ? maxHeight : undefined}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: isEditing,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: isEditing,
            allowMultipleSelections: false,
            indentOnInput: isEditing,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: isEditing,
            autocompletion: isEditing,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLine: isEditing,
            highlightSelectionMatches: true,
            closeBracketsKeymap: isEditing,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: isEditing,
            lintKeymap: false,
          }}
          className="text-xs"
        />
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
