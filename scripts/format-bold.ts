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

async function main(): Promise<void> {
  const files = await walk(targetDir);
  let totalProblems = 0;
  let totalFilesFixed = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    let fileChanged = false;

    const lines = content.split("\n");
    const newLines = lines.map((line, lineIdx) => {
      return line.replace(/\*\*([^*\r\n]+?)\*\*/g, (match, inner) => {
        if (
          inner.startsWith(" ") ||
          inner.endsWith(" ") ||
          inner.startsWith("\t") ||
          inner.endsWith("\t")
        ) {
          totalProblems++;
          const trimmed = inner.trim();
          console.log(
            `[${basename(file)}:L${lineIdx + 1}] ${isCheck ? "Found" : "Fixed"}: "${match}" -> "**${trimmed}**"`,
          );
          if (!isCheck && trimmed.length > 0) {
            fileChanged = true;
            return `**${trimmed}**`;
          }
        }
        return match;
      });
    });

    if (!isCheck && fileChanged) {
      await writeFile(file, newLines.join("\n"), "utf-8");
      totalFilesFixed++;
    }
  }

  if (isCheck) {
    if (totalProblems > 0) {
      console.error(
        `\n[format:bold:check] Found ${totalProblems} unformatted bold markdown pairs.`,
      );
      process.exit(1);
    } else {
      console.log(
        "\n[format:bold:check] All bold markdown pairs are compliant.",
      );
    }
  } else {
    console.log(
      `\n[format:bold] Done. Fixed ${totalProblems} bold pairs across ${totalFilesFixed} files.`,
    );
  }
}

await main();
