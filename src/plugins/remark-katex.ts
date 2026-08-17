import katex from "katex";
import type { KatexOptions } from "katex";

/**
 * Options accepted by the plugin; passed through to `katex.renderToString`.
 * `errorColor` is a native KaTeX option (`#cc0000` by default).
 */
export type RemarkKatexOptions = Partial<KatexOptions>;

/** A minimal structural view of the mdast nodes this plugin rewrites. */
interface MathNode {
  type: string;
  value?: string;
  data?: Record<string, unknown>;
  lang?: string | null;
  meta?: string | null;
  [key: string]: unknown;
}

function isMathNode(node: unknown): node is MathNode {
  if (typeof node !== "object" || node === null) return false;
  const type = (node as { type?: unknown }).type;
  return type === "inlineMath" || type === "math";
}

/**
 * Depth-first walk over a mdast tree without pulling in a traversal
 * dependency (`unist-util-visit`).
 */
function walk(tree: unknown, visit: (node: MathNode) => void): void {
  if (typeof tree !== "object" || tree === null) return;
  const node = tree as Record<string, unknown>;
  if (isMathNode(node)) {
    visit(node);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === "position") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object") walk(child, visit);
      }
    } else if (
      value &&
      typeof value === "object" &&
      typeof (value as { type?: unknown }).type === "string"
    ) {
      walk(value, visit);
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nodeToHtml(node: unknown, settings: RemarkKatexOptions): string {
  if (!node || typeof node !== "object") return "";
  const n = node as {
    type?: string;
    value?: string;
    children?: unknown[];
  };
  if (n.type === "text") {
    return escapeHtml(n.value ?? "");
  }
  if (n.type === "inlineMath" || n.type === "math") {
    try {
      return katex.renderToString(n.value ?? "", {
        ...settings,
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return escapeHtml(n.value ?? "");
    }
  }
  if (n.type === "html") {
    return n.value ?? "";
  }
  if (n.type === "inlineCode") {
    return `<code>${escapeHtml(n.value ?? "")}</code>`;
  }
  if (n.type === "strong") {
    const inner = (n.children ?? [])
      .map((c) => nodeToHtml(c, settings))
      .join("");
    return `<strong>${inner}</strong>`;
  }
  if (n.type === "emphasis") {
    const inner = (n.children ?? [])
      .map((c) => nodeToHtml(c, settings))
      .join("");
    return `<em>${inner}</em>`;
  }
  if (n.type === "link") {
    return (n.children ?? []).map((c) => nodeToHtml(c, settings)).join("");
  }
  if (Array.isArray(n.children)) {
    return n.children.map((c) => nodeToHtml(c, settings)).join("");
  }
  return escapeHtml(n.value ?? "");
}

function collectHeadings(
  tree: unknown,
  settings: RemarkKatexOptions,
): string[] {
  const headings: string[] = [];
  function scan(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; children?: unknown[] };
    if (n.type === "heading") {
      const html = (n.children ?? [])
        .map((c) => nodeToHtml(c, settings))
        .join("");
      headings.push(html);
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        scan(child);
      }
    }
  }
  scan(tree);
  return headings;
}

/**
 * Build-time KaTeX renderer for `remark-math` output.
 *
 * Replaces `rehype-katex` while keeping every package on the project's own
 * `katex` version (0.18.x). `remark-math` parses `$...$` / `$$...$$` into
 * `inlineMath` / `math` mdast nodes; this plugin rewrites those nodes into
 * `html` nodes containing KaTeX's rendered markup.
 */
export default function remarkKatex(
  options: RemarkKatexOptions = {},
): (tree: unknown, file: unknown) => void {
  const settings = options;

  return (tree, file) => {
    // 1. Collect rich HTML representations of all headings (with KaTeX formulas pre-rendered)
    const headingHtmls = collectHeadings(tree, settings);
    const fileData = file as {
      data?: {
        astro?: {
          frontmatter?: Record<string, unknown>;
        };
      };
      message?: (msg: string) => void;
    };
    if (fileData?.data) {
      if (!fileData.data.astro) fileData.data.astro = {};
      if (!fileData.data.astro.frontmatter)
        fileData.data.astro.frontmatter = {};
      fileData.data.astro.frontmatter.headingHtmls = headingHtmls;
    }

    // 2. Render all math nodes across the AST
    walk(tree, (node) => {
      const displayMode = node.type === "math";
      const value = node.value ?? "";
      let html: string;

      try {
        html = katex.renderToString(value, {
          ...settings,
          displayMode,
          throwOnError: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fileData?.message?.(`Could not render math with KaTeX: ${message}`);
        try {
          html = katex.renderToString(value, {
            ...settings,
            displayMode,
            strict: "ignore",
            throwOnError: false,
          });
        } catch {
          html = `<span class="katex-error" style="color:${settings.errorColor ?? "#cc0000"}" title="${escapeHtml(message)}">${escapeHtml(value)}</span>`;
        }
      }

      node.type = "html";
      node.value = html;
      // Drop remark-math hints (`hName` / `hProperties` / `hChildren`) so the
      // mdast→hast bridge treats this as a plain raw-HTML node.
      delete node.data;
      delete node.lang;
      delete node.meta;
    });
  };
}
