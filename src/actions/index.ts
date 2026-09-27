import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, join, resolve as pathResolve } from "node:path";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);

/** Check if a CLI command is available on PATH */
function checkCommandAvailable(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const lookupCommand = process.platform === "win32" ? "where.exe" : "which";
    const probe = spawn(lookupCommand, [cmd], { windowsHide: true });
    probe.on("close", (code) => {
      resolve(code === 0);
    });
    probe.on("error", () => {
      resolve(false);
    });
  });
}

function getExecutionEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const pathKey =
    Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const localBin = pathResolve(process.cwd(), "node_modules/.bin");

  env[pathKey] = [localBin, env[pathKey]]
    .filter((entry): entry is string => Boolean(entry))
    .join(delimiter);
  delete env.FORCE_COLOR;
  env.NO_COLOR ??= "1";
  env.CI = "true";
  env.PAGER = "cat";

  return env;
}

function getMissingCompilerMessage(lang: "rust" | "cpp"): string {
  const platform =
    process.platform === "win32"
      ? "Windows"
      : process.platform === "darwin"
        ? "macOS"
        : "Linux";

  if (lang === "rust") {
    const compiler = process.platform === "win32" ? "rustc.exe" : "rustc";
    return `[环境缺失]: ${platform} 宿主机的 PATH 中未检测到 ${compiler}。\n安装 Rust 工具链（rustup），并确认编译器已加入 PATH 后重启服务。`;
  }

  const compiler =
    process.platform === "win32" ? "clang++.exe 或 g++.exe" : "clang++ 或 g++";
  const installHint =
    process.platform === "win32"
      ? "安装 Visual Studio C++ Build Tools、LLVM 或 MinGW-w64 中的一种，并确认编译器已加入 PATH。"
      : process.platform === "darwin"
        ? "安装 Xcode Command Line Tools 或 LLVM，并确认编译器已加入 PATH。"
        : "使用发行版的包管理器安装 clang++ 或 g++，并确认编译器已加入 PATH。";

  return `[环境缺失]: ${platform} 宿主机的 PATH 中未检测到 ${compiler}。\n${installHint}`;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  language: string;
}

function executeProcess(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 8000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(cmd, args, {
      cwd,
      timeout: timeoutMs,
      env: getExecutionEnvironment(),
      windowsHide: true,
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      stderr += `\n[系统执行错误]: ${err.message}`;
      resolve({ stdout, stderr, exitCode: 1 });
    });

    proc.on("close", (code, signal) => {
      if (signal === "SIGTERM") {
        stderr += `\n[超时拦截]: 代码执行超过 ${timeoutMs / 1000} 秒，已被终止以防止阻塞。`;
      }
      resolve({ stdout, stderr, exitCode: code ?? (signal ? 1 : 0) });
    });
  });
}

export const server = {
  executeCode: defineAction({
    input: z.object({
      lang: z.enum(["js", "ts", "node", "rust", "cpp"]),
      code: z.string(),
    }),
    handler: async ({ lang, code }): Promise<RunResult> => {
      const startTime = performance.now();
      const runId = randomUUID();
      const workDir = join(tmpdir(), "gfxvis-runners", runId);

      await mkdir(workDir, { recursive: true });

      try {
        let stdout = "";
        let stderr = "";
        let exitCode = 0;

        switch (lang) {
          case "js":
          case "node": {
            const filePath = join(workDir, "main.mjs");
            await writeFile(filePath, code, "utf-8");
            const res = await executeProcess(
              process.execPath,
              [filePath],
              workDir,
            );
            stdout = res.stdout;
            stderr = res.stderr;
            exitCode = res.exitCode;
            break;
          }

          case "ts": {
            const filePath = join(workDir, "main.ts");
            await writeFile(filePath, code, "utf-8");
            const tsxCli = require.resolve("tsx/cli");
            const res = await executeProcess(
              process.execPath,
              [tsxCli, filePath],
              workDir,
            );
            stdout = res.stdout;
            stderr = res.stderr;
            exitCode = res.exitCode;
            break;
          }

          case "rust": {
            const hasRustc = await checkCommandAvailable("rustc");
            if (!hasRustc) {
              return {
                stdout: "",
                stderr: getMissingCompilerMessage("rust"),
                exitCode: 127,
                durationMs: Math.round(performance.now() - startTime),
                language: "rust",
              };
            }

            const srcFile = join(workDir, "main.rs");
            const binFile = join(
              workDir,
              process.platform === "win32" ? "main_bin.exe" : "main_bin",
            );
            await writeFile(srcFile, code, "utf-8");

            // 1. Compile with rustc
            const compileRes = await executeProcess(
              "rustc",
              ["--edition=2024", "-O", srcFile, "-o", binFile],
              workDir,
            );

            if (compileRes.exitCode !== 0) {
              stdout = compileRes.stdout;
              stderr = compileRes.stderr;
              exitCode = compileRes.exitCode;
            } else {
              // 2. Execute compiled binary
              const runRes = await executeProcess(binFile, [], workDir);
              stdout = runRes.stdout;
              stderr = runRes.stderr;
              exitCode = runRes.exitCode;
            }
            break;
          }

          case "cpp": {
            const hasClang = await checkCommandAvailable("clang++");
            const hasGpp = hasClang ? true : await checkCommandAvailable("g++");

            if (!hasClang && !hasGpp) {
              return {
                stdout: "",
                stderr: getMissingCompilerMessage("cpp"),
                exitCode: 127,
                durationMs: Math.round(performance.now() - startTime),
                language: "cpp",
              };
            }

            const compiler = hasClang ? "clang++" : "g++";
            const srcFile = join(workDir, "main.cpp");
            const binFile = join(
              workDir,
              process.platform === "win32" ? "main_bin.exe" : "main_bin",
            );
            await writeFile(srcFile, code, "utf-8");

            // 1. Compile with C++23 standard
            const compileRes = await executeProcess(
              compiler,
              ["-std=c++23", "-O2", srcFile, "-o", binFile],
              workDir,
            );

            if (compileRes.exitCode !== 0) {
              stdout = compileRes.stdout;
              stderr = compileRes.stderr;
              exitCode = compileRes.exitCode;
            } else {
              // 2. Execute compiled binary
              const runRes = await executeProcess(binFile, [], workDir);
              stdout = runRes.stdout;
              stderr = runRes.stderr;
              exitCode = runRes.exitCode;
            }
            break;
          }
        }

        const durationMs = Math.round(performance.now() - startTime);

        return {
          stdout,
          stderr,
          exitCode,
          durationMs,
          language: lang,
        };
      } finally {
        // Clean up temporary workspace directory
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    },
  }),
};
