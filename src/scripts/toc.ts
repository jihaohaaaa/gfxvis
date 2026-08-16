/**
 * Client-side High-Dwell-Time Hover TOC Drawer controller.
 * - 350ms dwell confirmation via pointerenter/pointerleave: mouse must intentionally rest on the > button for > 350ms to open. Quick sweeps past are 100% cancelled and ignored.
 * - Moving out of drawer smoothly closes after 200ms buffer without ghost reopening.
 * - Instant toggle on explicit click.
 * - No background blur / overlay: reading content remains completely visible without scroll lock.
 * - Clicking a TOC link smoothly navigates to section and maintains drawer open until mouse moves away.
 * - Real-time ScrollSpy highlights active section.
 */

import { smoothScrollTo } from "./scroll-top";

export function setupTOC(): void {
  const toggleBtn = document.getElementById("toc-toggle-btn");
  const drawer = document.getElementById("toc-drawer");
  const closeBtn = document.getElementById("toc-close-btn");

  if (!drawer) return;

  let isOpen = false;
  let dwellTimer: number | null = null;
  let leaveTimer: number | null = null;
  let isFocused = false;

  const cancelDwellTimer = () => {
    if (dwellTimer !== null) {
      window.clearTimeout(dwellTimer);
      dwellTimer = null;
    }
  };

  const cancelLeaveTimer = () => {
    if (leaveTimer !== null) {
      window.clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  };

  const openDrawer = () => {
    cancelDwellTimer();
    cancelLeaveTimer();
    if (isOpen) return;
    isOpen = true;

    drawer.classList.remove(
      "-translate-x-full",
      "invisible",
      "pointer-events-none",
    );
    drawer.classList.add("translate-x-0", "visible", "pointer-events-auto");
  };

  const closeDrawer = () => {
    cancelDwellTimer();
    cancelLeaveTimer();
    if (!isOpen) return;
    isOpen = false;

    drawer.classList.remove("translate-x-0", "pointer-events-auto");
    drawer.classList.add("-translate-x-full", "pointer-events-none");
  };

  // Toggle button hover handling with 350ms dwell confirmation
  if (toggleBtn) {
    toggleBtn.addEventListener("pointerenter", () => {
      cancelLeaveTimer();
      if (!isOpen && dwellTimer === null) {
        dwellTimer = window.setTimeout(() => {
          openDrawer();
          dwellTimer = null;
        }, 350);
      }
    });

    toggleBtn.addEventListener("pointerleave", () => {
      // Instantly cancel dwell timer when cursor leaves the button bounds
      cancelDwellTimer();
      if (isOpen && leaveTimer === null) {
        leaveTimer = window.setTimeout(() => {
          if (!isFocused) {
            closeDrawer();
          }
          leaveTimer = null;
        }, 200);
      }
    });

    // Instant toggle on explicit click
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  // Drawer hover handling
  drawer.addEventListener("pointerenter", () => {
    cancelLeaveTimer();
    cancelDwellTimer();
  });

  drawer.addEventListener("pointerleave", () => {
    cancelDwellTimer();
    if (isOpen && leaveTimer === null) {
      leaveTimer = window.setTimeout(() => {
        if (!isFocused) {
          closeDrawer();
        }
        leaveTimer = null;
      }, 200);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDrawer();
    });
  }

  // Keyboard accessibility
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      isFocused = false;
      closeDrawer();
    }
  });

  drawer.addEventListener("focusin", () => {
    isFocused = true;
    openDrawer();
  });

  drawer.addEventListener("focusout", () => {
    isFocused = false;
    if (leaveTimer === null) {
      leaveTimer = window.setTimeout(() => {
        closeDrawer();
        leaveTimer = null;
      }, 200);
    }
  });

  // TOC links click handling
  const tocLinks = drawer.querySelectorAll<HTMLAnchorElement>(".toc-link");
  tocLinks.forEach((link) => {
    link.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      link.blur();
      isFocused = false;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const rawId = href.slice(1);
      const decodedId = decodeURIComponent(rawId);
      const target =
        document.getElementById(rawId) || document.getElementById(decodedId);

      if (target) {
        if (window.history.pushState) {
          window.history.pushState(null, "", `#${rawId}`);
        } else {
          window.location.hash = rawId;
        }

        const targetRect = target.getBoundingClientRect();
        const absoluteY = targetRect.top + window.scrollY - 88;

        smoothScrollTo(Math.max(0, absoluteY));

        target.classList.remove("heading-pulse");
        void target.offsetWidth;
        target.classList.add("heading-pulse");
      }
    });
  });

  // ScrollSpy: highlight active heading
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>(".prose h2, .prose h3"),
  ).filter((h) => !!h.id);

  if (headings.length > 0) {
    const updateScrollSpy = () => {
      const scrollPos = window.scrollY + 120;
      let currentActiveId = "";

      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        if (heading.offsetTop <= scrollPos) {
          currentActiveId = heading.id;
        } else {
          break;
        }
      }

      tocLinks.forEach((link) => {
        const href = link.getAttribute("href")?.slice(1);
        if (
          href &&
          (href === currentActiveId ||
            decodeURIComponent(href) === currentActiveId)
        ) {
          link.classList.add(
            "text-accent",
            "font-semibold",
            "bg-accent/10",
            "border-l-2",
            "border-accent",
          );
          link.classList.remove("text-muted", "border-transparent");
        } else {
          link.classList.remove(
            "text-accent",
            "font-semibold",
            "bg-accent/10",
            "border-l-2",
            "border-accent",
          );
          link.classList.add("text-muted", "border-transparent");
        }
      });
    };

    window.addEventListener("scroll", updateScrollSpy, { passive: true });
    updateScrollSpy();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupTOC);
} else {
  setupTOC();
}
