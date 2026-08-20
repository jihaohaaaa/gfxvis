import { isFocusModeActive } from "./focus-mode";

export function setupHeaderAutoHide(): void {
  const header = document.getElementById("site-header");
  if (!header) return;

  let isHovered = false;
  let isFocused = false;

  const showHeader = () => {
    if (isFocusModeActive()) return;
    header.classList.remove(
      "-translate-y-28",
      "-translate-y-24",
      "-translate-y-full",
    );
    header.classList.add("translate-y-0");
  };

  const hideHeader = (force = false) => {
    if (!force && (window.scrollY <= 80 || isHovered || isFocused)) return;

    header.classList.remove("translate-y-0");
    header.classList.add("-translate-y-28");
  };

  // Listen to focus mode change
  window.addEventListener("focus-mode-change", ((
    e: CustomEvent<{ isFocusMode: boolean }>,
  ) => {
    if (e.detail.isFocusMode) {
      hideHeader(true);
    } else if (window.scrollY <= 80) {
      showHeader();
    }
  }) as EventListener);

  // Scroll listener: only toggles visibility based on page top boundary
  window.addEventListener(
    "scroll",
    () => {
      if (isFocusModeActive()) return;
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
      if (isFocusModeActive()) return;
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
    if (isFocusModeActive()) return;
    isHovered = true;
    showHeader();
  });

  header.addEventListener("mouseleave", () => {
    isHovered = false;
    if (window.scrollY > 80 || isFocusModeActive()) {
      hideHeader(isFocusModeActive());
    }
  });

  // Focus lock for accessibility
  header.addEventListener("focusin", () => {
    if (isFocusModeActive()) return;
    isFocused = true;
    showHeader();
  });

  header.addEventListener("focusout", () => {
    isFocused = false;
    if (window.scrollY > 80 || isFocusModeActive()) {
      hideHeader(isFocusModeActive());
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupHeaderAutoHide);
} else {
  setupHeaderAutoHide();
}
