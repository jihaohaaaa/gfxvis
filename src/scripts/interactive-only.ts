/** Keep only Astro islands in the current article. */

let interactiveOnlyState = false;

export function isInteractiveOnlyActive(): boolean {
  return interactiveOnlyState;
}

function markIslandAncestors(
  article: HTMLElement,
  active: boolean,
): HTMLElement[] {
  const prose = article.querySelector<HTMLElement>(":scope > .prose");
  if (!prose) return [];

  const islands = Array.from(
    prose.querySelectorAll<HTMLElement>("astro-island"),
  );
  const kept = new Set<HTMLElement>();
  for (const island of islands) {
    let current = island.parentElement;
    while (current && current !== prose) {
      if (current.parentElement === prose) kept.add(current);
      current = current.parentElement;
    }
  }

  for (const element of kept) {
    element.classList.toggle("interactive-only-keep", active);
  }
  return islands;
}

function updateButton(active: boolean): void {
  const button = document.getElementById("interactive-only-toggle");
  const enterIcon = button?.querySelector<HTMLElement>(
    ".icon-interactive-enter",
  );
  const exitIcon = button?.querySelector<HTMLElement>(".icon-interactive-exit");
  if (!button) return;

  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("title", active ? "显示完整文章" : "只保留可交互组件");
  button.setAttribute(
    "aria-label",
    active ? "显示完整文章" : "只保留可交互组件",
  );
  button.classList.toggle("border-accent", active);
  button.classList.toggle("text-accent", active);
  button.classList.toggle("bg-accent/15", active);
  button.classList.toggle("ring-2", active);
  button.classList.toggle("ring-accent/30", active);
  button.classList.toggle("text-muted", !active);
  button.classList.toggle("bg-surface/90", !active);
  enterIcon?.classList.toggle("hidden", active);
  exitIcon?.classList.toggle("hidden", !active);
}

export function setInteractiveOnly(active: boolean): void {
  interactiveOnlyState = active;
  const article = document.querySelector<HTMLElement>("article");
  const islands = article ? markIslandAncestors(article, active) : [];
  document.body.classList.toggle("interactive-only-active", active);

  const empty = document.getElementById("interactive-only-empty");
  empty?.setAttribute("data-has-interactive", String(islands.length > 0));
  updateButton(active);
  window.dispatchEvent(
    new CustomEvent("interactive-only-change", {
      detail: { isInteractiveOnly: active, interactiveCount: islands.length },
    }),
  );
}

export function toggleInteractiveOnly(): void {
  setInteractiveOnly(!interactiveOnlyState);
}

export function setupInteractiveOnly(): void {
  const button = document.getElementById("interactive-only-toggle");
  if (!button) return;
  button.addEventListener("click", () => {
    toggleInteractiveOnly();
    button.blur();
  });
  updateButton(false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupInteractiveOnly);
} else {
  setupInteractiveOnly();
}
