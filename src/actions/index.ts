import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as pathResolve } from "node:path";
import { performance } from "node:perf_hooks";

/** Check if a CLI command is available on PATH */
function checkCommandAvailable(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn("which", [cmd]);
    probe.on("close", (code) => {
      resolve(code === 0);
    });
    probe.on("error", () => {
      resolve(false);
    });
  });
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
      env: {
        ...process.env,
        PATH: `${pathResolve(process.cwd(), "node_modules/.bin")}:${process.env.PATH || ""}`,
        // Ensure non-interactive mode
        CI: "true",
        PAGER: "cat",
      },
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
            const res = await executeProcess("node", [filePath], workDir);
            stdout = res.stdout;
            stderr = res.stderr;
            exitCode = res.exitCode;
            break;
          }

          case "ts": {
            const filePath = join(workDir, "main.ts");
            await writeFile(filePath, code, "utf-8");
            const localTsx = pathResolve(
              process.cwd(),
              "node_modules/.bin/tsx",
            );
            const tsxCmd = existsSync(localTsx) ? localTsx : "tsx";
            const res = await executeProcess(tsxCmd, [filePath], workDir);
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
                stderr:
                  "[环境缺失]: 本地未检测到 rustc 编译器。\n安装指南: 在终端运行 `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` 安装 Rust 工具链。",
                exitCode: 127,
                durationMs: Math.round(performance.now() - startTime),
                language: "rust",
              };
            }

            const srcFile = join(workDir, "main.rs");
            const binFile = join(workDir, "main_bin");
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
                stderr:
                  "[环境缺失]: 本地未检测到 clang++ 或 g++ 编译器。\n安装指南: macOS 用户请在终端运行 `xcode-select --install` 或 `brew install llvm`。",
                exitCode: 127,
                durationMs: Math.round(performance.now() - startTime),
                language: "cpp",
              };
            }

            const compiler = hasClang ? "clang++" : "g++";
            const srcFile = join(workDir, "main.cpp");
            const binFile = join(workDir, "main_bin");
            await writeFile(srcFile, code, "utf-8");

            // 1. Compile with C++20 standard
            const compileRes = await executeProcess(
              compiler,
              ["-std=c++20", "-O2", srcFile, "-o", binFile],
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
