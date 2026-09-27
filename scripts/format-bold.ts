import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const isCheck = process.argv.includes("--check");
const targetDir = "src/content/posts";

async function walk(dir: string): Promise<string[]> {
  const results: string[] = [];
  const list = await readdir(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const fileStat = await stat(fullPath);
    if (fileStat.isDirectory()) {
      results.push(...(await walk(fullPath)));
    } else if (fullPath.endsWith(".md") || fullPath.endsWith(".mdx")) {
      results.push(fullPath);
    }
  }
  return results;
}

export interface ReplaceResult {
  newContent: string;
  violations: Array<{ line: number; match: string; inner: string }>;
}

export function processBoldContent(content: string): ReplaceResult {
  const lines = content.split("\n");
  const violations: Array<{ line: number; match: string; inner: string }> = [];

  let inFrontmatter = false;
  let inCodeFence = false;
  let inDisplayMath = false;

  const newLines = lines.map((line, idx) => {
    const trimmed = line.trim();

    if (idx === 0 && trimmed === "---") {
      inFrontmatter = true;
      return line;
    }
    if (inFrontmatter) {
      if (trimmed === "---") inFrontmatter = false;
      return line;
    }

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      return line;
    }
    if (inCodeFence) return line;

    if (trimmed.startsWith("$$")) {
      if (trimmed.length > 2 && trimmed.endsWith("$$")) {
        return line;
      }
      inDisplayMath = !inDisplayMath;
      return line;
    }
    if (inDisplayMath) return line;

    if (!line.includes("**")) return line;

    // Mask out inline code: `...`
    const codeTokens: string[] = [];
    let masked = line.replace(/`[^`\r\n]+`/g, (m) => {
      const token = `__INLINE_CODE_${codeTokens.length}__`;
      codeTokens.push(m);
      return token;
    });

    // Mask out inline math: $...$
    const mathTokens: string[] = [];
    masked = masked.replace(/(?<!\\)\$[^$\r\n]+(?<!\\)\$/g, (m) => {
      const token = `__INLINE_MATH_${mathTokens.length}__`;
      mathTokens.push(m);
      return token;
    });

    const restoreTokens = (str: string) => {
      return str
        .replace(/__INLINE_MATH_(\d+)__/g, (_m, id) => mathTokens[Number(id)])
        .replace(/__INLINE_CODE_(\d+)__/g, (_m, id) => codeTokens[Number(id)]);
    };

    // Replace **...**
    const boldRegex = /\*\*([^*\r\n]+?)\*\*/g;
    masked = masked.replace(boldRegex, (match, inner) => {
      violations.push({
        line: idx + 1,
        match: restoreTokens(match),
        inner: restoreTokens(inner),
      });
      return `<strong>${inner.trim()}</strong>`;
    });

    // Restore inline math
    masked = masked.replace(/__INLINE_MATH_(\d+)__/g, (_m, id) => {
      return mathTokens[Number(id)];
    });

    // Restore inline code
    masked = masked.replace(/__INLINE_CODE_(\d+)__/g, (_m, id) => {
      return codeTokens[Number(id)];
    });

    return masked;
  });

  return { newContent: newLines.join("\n"), violations };
}

async function main(): Promise<void> {
  const files = await walk(targetDir);
  let totalViolations = 0;
  let totalFilesUpdated = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const { newContent, violations } = processBoldContent(content);

    if (violations.length > 0) {
      totalViolations += violations.length;
      for (const v of violations) {
        console.log(
          `[${basename(file)}:L${v.line}] ${
            isCheck ? "Forbidden bold found" : "Migrated"
          }: "${v.match}" -> "<strong>${v.inner.trim()}</strong>"`,
        );
      }

      if (!isCheck) {
        await writeFile(file, newContent, "utf-8");
        totalFilesUpdated++;
      }
    }
  }

  if (isCheck) {
    if (totalViolations > 0) {
      console.error(
        `\n[format:bold:check] ❌ Found ${totalViolations} raw Markdown bold '**' occurrences. Per project rule, all bolding must use <strong>...</strong> instead.`,
      );
      process.exit(1);
    } else {
      console.log(
        "\n[format:bold:check] ✅ All Markdown files use <strong> tags (0 '**' bold found).",
      );
    }
  } else {
    console.log(
      `\n[format:bold] Done. Migrated ${totalViolations} bold pairs to <strong> across ${totalFilesUpdated} files.`,
    );
  }
}

await main();
