/**
 * Client-side heading anchor and deep-link copying module.
 * Injects anchor links into article headings, copies full URLs, triggers smooth scrolling,
 * and displays toast notifications.
 */

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message?: string): void {
  const toast = document.getElementById("heading-copy-toast");
  const toastText = document.getElementById("heading-copy-toast-text");
  if (!toast || !toastText) return;

  toastText.textContent = message || "已复制小节链接到剪贴板";
  toast.classList.remove("opacity-0", "translate-y-3", "pointer-events-none");
  toast.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove(
      "opacity-100",
      "translate-y-0",
      "pointer-events-auto",
    );
    toast.classList.add("opacity-0", "translate-y-3", "pointer-events-none");
  }, 2200);
}

export function setupHeadingAnchors(): void {
  const headings = document.querySelectorAll<HTMLElement>(
    ".prose h1, .prose h2, .prose h3, .prose h4",
  );

  headings.forEach((heading) => {
    if (!heading.id) {
      const text = heading.textContent ? heading.textContent.trim() : "";
      if (text) {
        heading.id = encodeURIComponent(
          text.toLowerCase().replace(/\s+/g, "-"),
        );
      }
    }

    if (!heading.id) return;
    if (heading.querySelector(".heading-anchor")) return;

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${heading.id}`;
    anchor.title = "复制本小节链接并定位";
    anchor.setAttribute("aria-label", "复制本小节链接");
    anchor.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

    anchor.addEventListener("click", async (e: MouseEvent) => {
      e.preventDefault();

      const url = new URL(window.location.href);
      url.hash = heading.id;
      const fullUrl = url.toString();

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullUrl);
        }
      } catch {
        /* ignore clipboard write errors */
      }

      if (window.history.pushState) {
        window.history.pushState(null, "", `#${heading.id}`);
      } else {
        window.location.hash = heading.id;
      }

      heading.scrollIntoView({ behavior: "smooth", block: "start" });

      heading.classList.remove("heading-pulse");
      void heading.offsetWidth; // trigger reflow
      heading.classList.add("heading-pulse");

      const cleanHeadingText = heading.textContent
        ? heading.textContent.trim()
        : "";
      showToast(`已复制链接：${cleanHeadingText}`);
    });

    heading.appendChild(anchor);
  });
}

export function handleInitialHash(): void {
  if (!window.location.hash) return;
  try {
    const rawHash = window.location.hash.slice(1);
    const decodedHash = decodeURIComponent(rawHash);
    const target =
      document.getElementById(rawHash) || document.getElementById(decodedHash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("heading-pulse");
        void target.offsetWidth;
        target.classList.add("heading-pulse");
      }, 150);
    }
  } catch {
    /* ignore decode errors */
  }
}

// Initialize on execution
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupHeadingAnchors();
    handleInitialHash();
  });
} else {
  setupHeadingAnchors();
  handleInitialHash();
}

window.addEventListener("hashchange", handleInitialHash);
