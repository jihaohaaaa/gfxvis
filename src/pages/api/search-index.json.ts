import type { APIRoute } from "astro";
import { getCollection, render } from "astro:content";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SearchHeading, SearchIndexDoc } from "../../lib/search/types";

export const prerender = true;

const CATEGORY_MAP: Record<string, string> = {
  calculus: "微积分",
  "discrete-math": "离散数学",
  "linear-algebra": "线性代数",
  "type-systems": "类型系统",
  visualization: "可视化",
};

/**
 * Clean MDX source into plain natural language text:
 * Explicitly skips math formulas ($...$, $$...$$), fenced code blocks, and JSX components.
 * Preserves inline code identifiers and API names (`lerp` -> lerp, `det(A)` -> det(A)).
 */
function cleanMdxContent(rawContent: string): string {
  let text = rawContent;

  // 1. Remove MDX imports and exports
  text = text.replace(/^import\s+.*$/gm, "");
  text = text.replace(/^export\s+.*$/gm, "");

  // 2. Remove fenced code blocks (```...```)
  text = text.replace(/```[\s\S]*?```/g, " ");

  // 3. Remove display math ($$...$$) and inline math ($...$)
  text = text.replace(/\$\$[\s\S]*?\$\$/g, " ");
  text = text.replace(/\$(?:\\.|[^$\n])+\$/g, " ");

  // 4. Remove Markdown images and links formatting (keep link text)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // 5. Remove HTML and JSX components (<Component ... />, <tag>...</tag>)
  text = text.replace(/<[^>]+>/g, " ");

  // 6. Strip inline code backticks while preserving the code keywords/identifiers (`det(A)` -> det(A))
  text = text.replace(/`([^`\n]+)`/g, " $1 ");

  // 7. Remove Markdown headings (e.g. ##, ###, ####) anywhere at line start or after space
  text = text.replace(/^#{1,6}\s+/gm, " ");
  text = text.replace(/\s+#{1,6}\s+/g, " ");

  // 8. Remove Markdown table formatting and separator rows
  text = text.replace(/\|[-:\s|]+\|/g, " ");
  text = text.replace(/\|/g, " ");

  // 9. Remove Markdown structural bullets, blockquotes and emphasis tokens (>, -, *, _, ~)
  text = text.replace(/^[>\-*+]\s+/gm, " ");
  text = text.replace(/[*_~]+/g, " ");

  // 10. Collapse excessive whitespace and newlines
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  const docs: SearchIndexDoc[] = await Promise.all(
    posts.map(async (post) => {
      const categoryKey = post.id.split("/")[0] ?? "other";
      const categoryLabel = CATEGORY_MAP[categoryKey] ?? categoryKey;

      // Extract headings using Astro content renderer
      let headings: SearchHeading[];
      try {
        const { headings: rawHeadings } = await render(post);
        headings = (rawHeadings || [])
          .filter((h) => h.depth === 2 || h.depth === 3)
          .map((h) => ({
            slug: h.slug,
            text: h.text,
            depth: h.depth,
          }));
      } catch {
        headings = [];
      }

      // Read raw content either from post.body or from filesystem
      let rawContent = post.body || "";
      if (!rawContent) {
        const extensions = [".mdx", ".md"];
        for (const ext of extensions) {
          try {
            const filePath = join(
              process.cwd(),
              "src/content/posts",
              `${post.id}${ext}`,
            );
            rawContent = await readFile(filePath, "utf-8");
            break;
          } catch {
            // try next extension
          }
        }
      }

      const cleanText = cleanMdxContent(rawContent);
      const headingsText = headings.map((h) => h.text).join(" ");

      return {
        id: post.id,
        slug: post.id,
        title: post.data.title,
        description: post.data.description || "",
        category: categoryKey,
        categoryLabel,
        tags: post.data.tags || [],
        date: post.data.date.toISOString().split("T")[0],
        headings,
        headingsText,
        cleanText,
      };
    }),
  );

  return new Response(JSON.stringify(docs), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
