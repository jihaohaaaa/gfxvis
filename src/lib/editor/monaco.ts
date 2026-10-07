/**
 * Monaco Editor 本地离线化初始化配置与高度计算
 * 参考 global_scripts 纯离线实践：绝不请求外网 CDN，绑定 Vite ?worker
 */

import { loader } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { registerAllThemes } from "./themes";

let initialized = false;
let initPromise: Promise<typeof monaco | null> | null = null;

export async function initMonaco(): Promise<typeof monaco | null> {
  if (typeof window === "undefined") {
    return null;
  }
  if (initialized) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).monaco ?? null;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // 动态按需导入 monaco 核心、语言 Worker 与核心语言语法定义 (杜绝 Node SSR 环境下加载浏览器模块及 css)
    const [
      monacoModule,
      { default: editorWorker },
      { default: tsWorker },
      cppDef,
      rustDef,
    ] = await Promise.all([
      import("monaco-editor"),
      import("monaco-editor/editor/editor.worker?worker"),
      import("monaco-editor/language/typescript/ts.worker?worker"),
      import("monaco-editor/languages/definitions/cpp/cpp.js"),
      import("monaco-editor/languages/definitions/rust/rust.js"),
    ]);

    // 1. 配置 100% 纯本地离线 loader，绝不连外网 CDN
    loader.config({ monaco: monacoModule });

    // 2. 绑定 Vite 本地打包的 Web Worker (浏览器环境)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).monaco = monacoModule;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).MonacoEnvironment = {
      getWorker(_: unknown, label: string) {
        if (label === "typescript" || label === "javascript") {
          return new tsWorker();
        }
        return new editorWorker();
      },
    };

    // 3. 注册自定义扩展主题
    registerAllThemes(monacoModule);

    // 4. 显式直接注册 C++ 与 Rust 本地 Monarch 词法高亮和语法配置
    // 杜绝 Vite 依赖动态 import 懒加载时序竞态或离线/冷启动时加载失败导致的代码纯白/无高亮
    monacoModule.languages.setMonarchTokensProvider("cpp", cppDef.language);
    monacoModule.languages.setLanguageConfiguration("cpp", cppDef.conf);
    monacoModule.languages.setMonarchTokensProvider("c", cppDef.language);
    monacoModule.languages.setLanguageConfiguration("c", cppDef.conf);

    monacoModule.languages.setMonarchTokensProvider("rust", rustDef.language);
    monacoModule.languages.setLanguageConfiguration("rust", rustDef.conf);

    // 5. 深度配置 TypeScript / JavaScript LSP 语言服务
    const tsDefaults = monacoModule.typescript.typescriptDefaults;
    const jsDefaults = monacoModule.typescript.javascriptDefaults;

    const compilerOptions: Parameters<typeof tsDefaults.setCompilerOptions>[0] =
      {
        target: monacoModule.typescript.ScriptTarget.ESNext,
        module: monacoModule.typescript.ModuleKind.ESNext,
        moduleResolution: monacoModule.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        jsx: monacoModule.typescript.JsxEmit.ReactJSX,
        lib: ["esnext", "dom"],
      };

    const modeConfig: Parameters<typeof tsDefaults.setModeConfiguration>[0] = {
      completionItems: true,
      hovers: true,
      documentSymbols: true,
      definitions: true,
      references: true,
      documentHighlights: true,
      rename: true,
      diagnostics: true,
      documentRangeFormattingEdits: true,
      signatureHelp: true,
      onTypeFormattingEdits: true,
      codeActions: true,
      inlayHints: true,
    };

    const diagnosticsOptions: Parameters<
      typeof tsDefaults.setDiagnosticsOptions
    >[0] = {
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        1375, // 'await' expressions are only allowed at top level when module
        1378, // top-level await
        2300, // Duplicate identifier
        2403, // Subsequent variable declarations must have the same type
        2451, // Cannot redeclare block-scoped variable
        6133, // unused variable
        7044, // implicit any parameter
      ],
    };

    const nodeAmbientStubs = `
      declare var process: {
        env: Record<string, string | undefined>;
        platform: string;
        arch: string;
        version: string;
        cwd(): string;
        exit(code?: number): void;
      };

      declare var console: {
        log(...args: any[]): void;
        info(...args: any[]): void;
        warn(...args: any[]): void;
        error(...args: any[]): void;
        time(label?: string): void;
        timeEnd(label?: string): void;
        table(...args: any[]): void;
        clear(): void;
      };

      declare module "node:os" {
        export interface CpuInfo {
          model: string;
          speed: number;
          times: { user: number; nice: number; sys: number; idle: number; irq: number };
        }
        export function platform(): string;
        export function arch(): string;
        export function cpus(): CpuInfo[];
        export function totalmem(): number;
        export function freemem(): number;
        export function tmpdir(): string;
        export function homedir(): string;
        export function hostname(): string;
      }

      declare module "node:fs/promises" {
        export function readFile(path: string, encoding?: string): Promise<string>;
        export function writeFile(path: string, data: string | Uint8Array, encoding?: string): Promise<void>;
        export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
        export function readdir(path: string): Promise<string[]>;
        export function stat(path: string): Promise<{ size: number; isFile(): boolean; isDirectory(): boolean }>;
        export function unlink(path: string): Promise<void>;
      }

      declare module "node:path" {
        export function join(...paths: string[]): string;
        export function resolve(...paths: string[]): string;
        export function dirname(path: string): string;
        export function basename(path: string, ext?: string): string;
        export function extname(path: string): string;
      }

      declare module "node:crypto" {
        export interface Hash {
          update(data: string | Uint8Array): Hash;
          digest(encoding?: string): string;
        }
        export function createHash(algorithm: string): Hash;
        export function randomUUID(): string;
      }

      declare module "node:buffer" {
        export class Buffer extends Uint8Array {
          static from(data: any, encoding?: string): Buffer;
          toString(encoding?: string): string;
        }
      }
    `;

    tsDefaults.setEagerModelSync(true);
    tsDefaults.setModeConfiguration(modeConfig);
    tsDefaults.setCompilerOptions(compilerOptions);
    tsDefaults.setDiagnosticsOptions(diagnosticsOptions);
    tsDefaults.addExtraLib(nodeAmbientStubs, "file:///node_ambient_stubs.d.ts");

    jsDefaults.setEagerModelSync(true);
    jsDefaults.setModeConfiguration(modeConfig);
    jsDefaults.setCompilerOptions(compilerOptions);
    jsDefaults.setDiagnosticsOptions(diagnosticsOptions);
    jsDefaults.addExtraLib(nodeAmbientStubs, "file:///node_ambient_stubs.d.ts");

    initialized = true;
    return monacoModule;
  })();

  return initPromise;
}

/**
 * 语言标识符转换为 Monaco Editor 语言 ID
 */
export function mapLanguageToMonaco(
  lang: "node" | "ts" | "js" | "rust" | "cpp",
): string {
  switch (lang) {
    case "node":
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "rust":
      return "rust";
    case "cpp":
      return "cpp";
    default:
      return "typescript";
  }
}

/**
 * 根据 Monaco Editor 内容真实行高与总高度动态计算卡片高度
 * 杜绝大面积空白，并支持上限封顶滚动
 */
export function computeEditorHeight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorInstance: any,
  maxHeightPx = 480,
  minHeightPx = 64,
): number {
  if (!editorInstance) return minHeightPx;

  const contentHeight =
    typeof editorInstance.getContentHeight === "function"
      ? editorInstance.getContentHeight()
      : 0;

  let targetHeight: number;
  if (contentHeight > 0) {
    targetHeight = contentHeight + 10;
  } else {
    const lines = editorInstance.getModel()?.getLineCount() || 1;
    const lineHeight =
      typeof editorInstance.getOption === "function"
        ? editorInstance.getOption(66) || 18
        : 18;
    targetHeight = lines * lineHeight + 10;
  }

  const clamped = Math.max(minHeightPx, targetHeight);
  return maxHeightPx > 0 ? Math.min(maxHeightPx, clamped) : clamped;
}
