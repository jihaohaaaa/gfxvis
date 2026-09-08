import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";

interface Issue {
  file: string;
  line: number;
  type: "error" | "warn";
  code: string;
  message: string;
}

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

function normalizeHeadingSlug(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function checkFile(file: string, content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split("\n");

  let inFrontmatter = false;
  let frontmatterCount = 0;
  let inCodeBlock = false;
  let inMathBlock = false;
  let lastHeadingDepth = 0;
  const seenHeadingSlugs = new Map<string, number>();

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // 1. Frontmatter
    if (trimmed === "---") {
      if (frontmatterCount === 0) {
        inFrontmatter = true;
        frontmatterCount++;
        continue;
      } else if (frontmatterCount === 1) {
        inFrontmatter = false;
        frontmatterCount++;
        continue;
      }
    }
    if (inFrontmatter) continue;

    // 2. Code block fence
    if (/^```/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 3. Display Math block fence ($$)
    if (
      trimmed === "$$" ||
      (/^\$\$/.test(trimmed) && !trimmed.endsWith("$$"))
    ) {
      inMathBlock = !inMathBlock;
      continue;
    }
    if (inMathBlock) {
      if (trimmed.endsWith("$$")) {
        inMathBlock = false;
      }
      continue;
    }

    // 4. Missing space in ATX heading (#without-space)
    if (/^#{1,6}[^\s#]/.test(trimmed)) {
      issues.push({
        file,
        line: lineNum,
        type: "error",
        code: "missing-space",
        message: `ATX 标题 '#' 与文字之间必须保留空格: "${trimmed}"`,
      });
      continue;
    }

    // 5. Normal ATX Heading
    const atxMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (atxMatch) {
      const depth = atxMatch[1].length;
      const headingText = atxMatch[2].trim();

      // Rule: No H1 in body
      if (depth === 1) {
        issues.push({
          file,
          line: lineNum,
          type: "error",
          code: "no-body-h1",
          message: `正文禁止出现一级大标题 '# ${headingText}'（已在 PostLayout 自动渲染，正文必须从 '##' (H2) 开始）`,
        });
      }

      // Rule: Heading increment / no level skip
      if (lastHeadingDepth === 0) {
        if (depth > 2) {
          issues.push({
            file,
            line: lineNum,
            type: "error",
            code: "no-level-skip",
            message: `正文首个标题应为 '##' (H2)，但实际为 'H${depth}': "${trimmed}"`,
          });
        }
      } else if (depth > lastHeadingDepth + 1) {
        issues.push({
          file,
          line: lineNum,
          type: "error",
          code: "no-level-skip",
          message: `标题层级跳级：从 H${lastHeadingDepth} 直接跳至 H${depth}（缺少 H${lastHeadingDepth + 1}）: "${trimmed}"`,
        });
      }
      lastHeadingDepth = depth;

      // Rule: Trailing colon
      if (/[：:]\s*$/.test(headingText)) {
        issues.push({
          file,
          line: lineNum,
          type: "error",
          code: "trailing-colon",
          message: `标题末尾严禁携带冒号: "${trimmed}"`,
        });
      }

      // Rule: Duplicate heading collision
      const slug = normalizeHeadingSlug(headingText);
      if (slug.length > 0) {
        const prevLine = seenHeadingSlugs.get(slug);
        if (prevLine !== undefined) {
          issues.push({
            file,
            line: lineNum,
            type: "error",
            code: "duplicate-heading",
            message: `同一文章内出现重复标题 "${headingText}"（已存在于第 ${prevLine} 行），会导致锚点 ID 冲突`,
          });
        } else {
          seenHeadingSlugs.set(slug, lineNum);
        }
      }

      // Rule: Deep heading warning (H5/H6)
      if (depth >= 5) {
        issues.push({
          file,
          line: lineNum,
          type: "warn",
          code: "deep-heading",
          message: `标题层级过深 (H${depth})，页面侧边目录仅索引 H2~H3，建议提炼拆分为主章或子节: "${trimmed}"`,
        });
      }

      continue;
    }

    // 6. Heuristic check: Pseudo-heading (potential title missing #)
    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      !trimmed.startsWith(">") &&
      !trimmed.startsWith("|") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("<") &&
      !trimmed.endsWith("。") &&
      !trimmed.endsWith("；") &&
      !trimmed.endsWith("!") &&
      !trimmed.endsWith("！")
    ) {
      const prevLine = idx > 0 ? lines[idx - 1].trim() : "";
      const nextLine = idx < lines.length - 1 ? lines[idx + 1].trim() : "";

      const isIsolated =
        (prevLine === "" || prevLine === "---") &&
        (nextLine === "" ||
          nextLine.startsWith("$$") ||
          nextLine.startsWith("```"));

      if (isIsolated) {
        const isNumbered = /^\d+\.\d+(?:\.\d+)*\s+[^\s\d]/.test(trimmed);
        const isChineseSection =
          /^(?:[一二三四五六七八九十]+、|第[一二三四五六七八九十\d]+[章节部分]\s+)[^\s]/.test(
            trimmed,
          );
        const isBoldTitle =
          /^\*\*(?:\d+\.|\d+\.\d+|[一二三四五六七八九十]+、)[^*]+?\*\*$/.test(
            trimmed,
          );

        if (isNumbered || isChineseSection || isBoldTitle) {
          issues.push({
            file,
            line: lineNum,
            type: "warn",
            code: "pseudo-heading",
            message: `疑似漏写 '#' 的伪标题（如为小节请补充 '###' 或 '####'，如为正文列表请补充句号）: "${trimmed}"`,
          });
        }
      }
    }
  }

  return issues;
}

async function main(): Promise<void> {
  const files = await walk(targetDir);
  const allIssues: Issue[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const issues = checkFile(file, content);
    allIssues.push(...issues);
  }

  const errors = allIssues.filter((i) => i.type === "error");
  const warnings = allIssues.filter((i) => i.type === "warn");

  console.log(`[check:headings] Scanned ${files.length} markdown/mdx files.`);

  if (allIssues.length === 0) {
    console.log(
      `[check:headings] ✅ All headings comply with semantic hierarchy and syntax rules.`,
    );
    process.exit(0);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.log(
        `  - [${basename(w.file)}:L${w.line}] [${w.code}] ${w.message}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} fatal error(s):`);
    for (const e of errors) {
      console.error(
        `  - [${basename(e.file)}:L${e.line}] [${e.code}] ${e.message}`,
      );
    }
    console.error(
      `\n[check:headings] Process failed due to heading errors. Please fix them above.`,
    );
    process.exit(1);
  }

  console.log(
    `\n[check:headings] ✅ No fatal errors found (${warnings.length} warning(s) reported for review).`,
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("[check:headings] Unexpected error:", err);
  process.exit(1);
});
