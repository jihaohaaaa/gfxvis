import type { InArticleMatch } from "./types";

const MARK_CLASS = "gfx-search-mark";
const ACTIVE_MARK_CLASS = "gfx-search-mark-active";
const PULSE_ANIM_CLASS = "gfx-search-pulse";

interface RawMatchItem {
  id: number;
  headingSlug: string;
  headingText: string;
  snippet: string;
  node: Text;
  index: number;
  length: number;
}

let activeMarks: HTMLElement[] = [];
let currentActiveIndex = -1;

/**
 * Check if the current page contains an article prose container
 */
export function isArticlePage(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("article .prose"));
}

/**
 * Get all H2/H3 headings currently rendered in the article
 */
function getArticleHeadings(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("h2, h3"));
}

/**
 * Find the nearest preceding H2/H3 heading for a given DOM node
 */
function findPrecedingHeading(
  node: Node,
  headings: HTMLElement[],
): { slug: string; text: string } {
  if (headings.length === 0) {
    const mainTitle = document.querySelector("article h1")?.textContent?.trim();
    return { slug: "", text: mainTitle || "正文开头" };
  }

  // Iterate backwards through headings to find the one that precedes this node
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i];
    if (
      heading &&
      heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      const slug = heading.id || heading.getAttribute("id") || "";
      const text = heading.textContent?.replace(/^#\s*/, "").trim() || "";
      return { slug, text };
    }
  }

  // If node precedes the first heading
  const firstHeading = headings[0];
  return {
    slug: firstHeading?.id || "",
    text: document.querySelector("article h1")?.textContent?.trim() || "引言",
  };
}

const DIACRITIC_MAP: Record<string, string> = {
  a: "[aàáâãäå]",
  e: "[eèéêë]",
  i: "[iìíîï]",
  o: "[oòóôõö]",
  u: "[uùúûü]",
  c: "[cç]",
  n: "[nñ]",
};

export function buildDiacriticRegex(query: string): RegExp | null {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;

  const patterns = terms.map((t) =>
    t
      .toLowerCase()
      .split("")
      .map(
        (ch) =>
          DIACRITIC_MAP[ch] || (/[.*+?^${}()|[\]\\]/.test(ch) ? "\\" + ch : ch),
      )
      .join(""),
  );

  return new RegExp(`(${patterns.join("|")})`, "gi");
}

/**
 * Search the current article DOM for the given query without mutating the DOM yet.
 * Returns a list of structured match records.
 */
export function findInArticleMatches(query: string): InArticleMatch[] {
  if (typeof document === "undefined" || !query || query.trim().length === 0) {
    return [];
  }

  const container = document.querySelector<HTMLElement>("article .prose");
  if (!container) return [];

  const regex = buildDiacriticRegex(query);
  if (!regex) return [];

  const headings = getArticleHeadings(container);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      // Skip non-prose elements, code blocks, math formulas, and interactive canvas/demos
      const tagName = parent.tagName.toLowerCase();
      if (
        tagName === "script" ||
        tagName === "style" ||
        tagName === "svg" ||
        tagName === "pre" ||
        tagName === "code" ||
        parent.closest("pre") ||
        parent.closest(".katex") ||
        parent.closest(".katex-display") ||
        parent.closest("[data-island]") ||
        parent.closest("canvas")
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const matches: InArticleMatch[] = [];
  let idCounter = 0;

  let currentNode = walker.nextNode();
  while (currentNode) {
    const text = currentNode.textContent || "";
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchIdx = match.index;
      const matchedWord = match[0];
      const matchLen = matchedWord.length;

      const heading = findPrecedingHeading(currentNode, headings);

      // Extract excerpt window: 28 chars before, 35 chars after
      const start = Math.max(0, matchIdx - 28);
      const end = Math.min(text.length, matchIdx + matchLen + 35);
      const snippetPrefix = start > 0 ? "..." : "";
      const snippetSuffix = end < text.length ? "..." : "";
      const snippet =
        snippetPrefix + text.slice(start, end).trim() + snippetSuffix;

      const targetEl = currentNode.parentElement ?? container;

      matches.push({
        id: idCounter++,
        headingSlug: heading.slug,
        headingText: heading.text,
        snippet,
        targetElement: targetEl,
      });

      if (regex.lastIndex === matchIdx) {
        regex.lastIndex++;
      }
    }

    currentNode = walker.nextNode();
  }

  return matches;
}

/**
 * Remove all existing search mark spans from the DOM and restore original text
 */
export function clearInArticleHighlights(): void {
  if (typeof document === "undefined") return;

  const marks = Array.from(
    document.querySelectorAll<HTMLElement>(`.${MARK_CLASS}`),
  );
  const parentsToNormalize = new Set<Node>();

  for (const mark of marks) {
    const parent = mark.parentNode;
    if (parent) {
      const textNode = document.createTextNode(mark.textContent || "");
      parent.replaceChild(textNode, mark);
      parentsToNormalize.add(parent);
    }
  }

  for (const parent of parentsToNormalize) {
    parent.normalize();
  }

  activeMarks = [];
  currentActiveIndex = -1;
}

/**
 * Apply permanent/temporary marks to the article DOM for the given query,
 * and navigate to the specified match index.
 */
export function applyInArticleHighlights(
  query: string,
  targetMatchId: number,
): { total: number; current: number } {
  clearInArticleHighlights();

  if (typeof document === "undefined" || !query || query.trim().length === 0) {
    return { total: 0, current: 0 };
  }

  const container = document.querySelector<HTMLElement>("article .prose");
  if (!container) return { total: 0, current: 0 };

  const regex = buildDiacriticRegex(query);
  if (!regex) return { total: 0, current: 0 };

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      const tagName = parent.tagName.toLowerCase();
      if (
        tagName === "script" ||
        tagName === "style" ||
        tagName === "svg" ||
        tagName === "pre" ||
        tagName === "code" ||
        parent.closest("pre") ||
        parent.closest(".katex") ||
        parent.closest(".katex-display") ||
        parent.closest("[data-island]") ||
        parent.closest("canvas")
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const rawMatches: RawMatchItem[] = [];
  let id = 0;

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode instanceof Text) {
      const text = currentNode.textContent || "";
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        rawMatches.push({
          id: id++,
          headingSlug: "",
          headingText: "",
          snippet: "",
          node: currentNode,
          index: match.index,
          length: match[0].length,
        });

        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    }
    currentNode = walker.nextNode();
  }

  // To prevent splitting offsets from corrupting subsequent matches in the same TextNode,
  // group matches by TextNode and process from right-to-left (descending index)
  const nodeMap = new Map<Text, RawMatchItem[]>();
  for (const m of rawMatches) {
    const list = nodeMap.get(m.node) || [];
    list.push(m);
    nodeMap.set(m.node, list);
  }

  const createdMarks: HTMLElement[] = [];

  for (const [, items] of nodeMap) {
    // Sort descending by index
    items.sort((a, b) => b.index - a.index);

    for (const item of items) {
      const parent = item.node.parentNode;
      if (!parent) continue;

      const fullText = item.node.textContent || "";
      const beforeText = fullText.slice(0, item.index);
      const matchText = fullText.slice(item.index, item.index + item.length);
      const afterText = fullText.slice(item.index + item.length);

      const mark = document.createElement("mark");
      mark.className = MARK_CLASS;
      mark.dataset.markId = String(item.id);
      mark.textContent = matchText;

      const afterNode = document.createTextNode(afterText);
      item.node.textContent = beforeText;

      parent.insertBefore(afterNode, item.node.nextSibling);
      parent.insertBefore(mark, afterNode);

      createdMarks.push(mark);
    }
  }

  // Sort created marks in document order
  createdMarks.sort((a, b) => {
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });

  activeMarks = createdMarks;

  if (activeMarks.length === 0) {
    return { total: 0, current: 0 };
  }

  // Locate the target mark
  const foundIndex = activeMarks.findIndex(
    (m) => m.dataset.markId === String(targetMatchId),
  );
  const activeIdx = foundIndex >= 0 ? foundIndex : 0;
  navigateToMarkIndex(activeIdx);

  return { total: activeMarks.length, current: activeIdx + 1 };
}

/**
 * Jump to a specific highlight mark index
 */
export function navigateToMarkIndex(index: number): {
  total: number;
  current: number;
} {
  if (activeMarks.length === 0) {
    return { total: 0, current: 0 };
  }

  const boundedIndex = (index + activeMarks.length) % activeMarks.length;
  currentActiveIndex = boundedIndex;

  for (let i = 0; i < activeMarks.length; i++) {
    const mark = activeMarks[i];
    if (!mark) continue;
    if (i === boundedIndex) {
      mark.classList.add(ACTIVE_MARK_CLASS);
      mark.classList.add(PULSE_ANIM_CLASS);

      mark.scrollIntoView({ behavior: "smooth", block: "center" });

      // Remove pulse animation class after it completes so it can re-trigger on next focus
      setTimeout(() => {
        mark.classList.remove(PULSE_ANIM_CLASS);
      }, 1400);
    } else {
      mark.classList.remove(ACTIVE_MARK_CLASS);
      mark.classList.remove(PULSE_ANIM_CLASS);
    }
  }

  return { total: activeMarks.length, current: boundedIndex + 1 };
}

/**
 * Step to next highlight mark
 */
export function nextInArticleMatch(): { total: number; current: number } {
  return navigateToMarkIndex(currentActiveIndex + 1);
}

/**
 * Step to previous highlight mark
 */
export function prevInArticleMatch(): { total: number; current: number } {
  return navigateToMarkIndex(currentActiveIndex - 1);
}
