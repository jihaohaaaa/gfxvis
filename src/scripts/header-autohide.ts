/**
 * Client-side pure top-edge hover sensing header controller.
 * - Zero scroll-triggered popups: Scrolling in any direction (up or down) never pops in the header while reading.
 * - Top-edge hover sensing: Moving the mouse to the top edge (clientY < 48px) instantly reveals the header.
 * - Remains naturally visible at the very top of the page (scrollY <= 80px).
 * - Leaves smoothly when cursor exits the top/header area.
 */

export function setupHeaderAutoHide(): void {
  const header = document.getElementById("site-header");
  if (!header) return;

  let isHovered = false;
  let isFocused = false;

  const showHeader = () => {
    header.classList.remove(
      "-translate-y-full",
      "pointer-events-none",
      "opacity-0",
    );
    header.classList.add("translate-y-0", "opacity-100");
  };

  const hideHeader = () => {
    if (window.scrollY <= 80 || isHovered || isFocused) return;

    header.classList.remove("translate-y-0", "opacity-100");
    header.classList.add(
      "-translate-y-full",
      "pointer-events-none",
      "opacity-0",
    );
  };

  // Scroll listener: only toggles visibility based on page top boundary
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY <= 80) {
        showHeader();
      } else if (!isHovered && !isFocused) {
        hideHeader();
      }
    },
    { passive: true },
  );

  // Mouse move listener: reveal when moving cursor to top edge, retract when leaving
  window.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      if (e.clientY < 48) {
        showHeader();
      } else if (
        e.clientY >= 64 &&
        window.scrollY > 80 &&
        !isHovered &&
        !isFocused
      ) {
        hideHeader();
      }
    },
    { passive: true },
  );

  // Hover lock
  header.addEventListener("mouseenter", () => {
    isHovered = true;
    showHeader();
  });

  header.addEventListener("mouseleave", () => {
    isHovered = false;
    if (window.scrollY > 80) {
      hideHeader();
    }
  });

  // Focus lock for accessibility
  header.addEventListener("focusin", () => {
    isFocused = true;
    showHeader();
  });

  header.addEventListener("focusout", () => {
    isFocused = false;
    if (window.scrollY > 80) {
      hideHeader();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupHeaderAutoHide);
} else {
  setupHeaderAutoHide();
}
