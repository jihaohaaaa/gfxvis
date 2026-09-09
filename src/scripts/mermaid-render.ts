/**
 * Client-side Mermaid diagram renderer for GFXVis:
 * - Scans rendered pre/code blocks with language-mermaid or code containing mermaid syntax.
 * - Dynamically loads mermaid.js to keep initial page bundle lightweight.
 * - Synchronizes with GFXVis light/dark theme seamlessly.
 */

async function renderMermaidDiagrams() {
  const mermaidBlocks: HTMLElement[] = [];

  // 1. Blocks tagged as language-mermaid by markdown
  document
    .querySelectorAll<HTMLElement>(
      "pre[data-language='mermaid'], pre.astro-code[data-language='mermaid'], pre > code.language-mermaid",
    )
    .forEach((el) => mermaidBlocks.push(el));

  // 2. Also check pre tags starting with mermaid syntax
  document.querySelectorAll<HTMLElement>("article pre").forEach((pre) => {
    if (mermaidBlocks.includes(pre)) return;
    const text = pre.textContent?.trim() || "";
    if (
      text.startsWith("graph ") ||
      text.startsWith("graph\n") ||
      text.startsWith("flowchart ") ||
      text.startsWith("flowchart\n") ||
      text.startsWith("sequenceDiagram") ||
      text.startsWith("classDiagram")
    ) {
      mermaidBlocks.push(pre);
    }
  });

  if (mermaidBlocks.length === 0) return;

  // Dynamically import Mermaid only on pages that actually contain diagrams
  const { default: mermaid } = await import("mermaid");

  const isDark = document.documentElement.classList.contains("dark");

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  for (let i = 0; i < mermaidBlocks.length; i++) {
    const el = mermaidBlocks[i];
    const rawCode = el.textContent?.trim() || "";
    if (!rawCode) continue;

    const container = document.createElement("div");
    container.className =
      "not-prose my-6 flex justify-center overflow-x-auto rounded-2xl border border-border/80 bg-surface/80 p-6 shadow-sm backdrop-blur-sm";

    const id = `mermaid-diagram-${i}-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(id, rawCode);
      container.innerHTML = svg;
      const targetReplace =
        el.tagName.toLowerCase() === "code" && el.parentElement
          ? el.parentElement
          : el;
      targetReplace.parentNode?.replaceChild(container, targetReplace);
    } catch (err) {
      console.error("[mermaid] Failed to render diagram:", err);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderMermaidDiagrams);
} else {
  renderMermaidDiagrams();
}
