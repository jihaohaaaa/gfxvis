/**
 * Client-side back-to-top button controller with Apple-style damped smooth scrolling.
 * - Distance-adaptive duration (600ms~950ms) for natural glide physics across any scroll distance.
 * - Ultra-soft easeOutQuart decelerating curve for seamless, buttery landings.
 * - User-interruption safe: immediately yields control on mousewheel, touchmove, or keydown.
 * - Records reading progress on scroll-to-top and smoothly glides back on browser "Back" navigation.
 */

interface ScrollHistoryState {
  scrollY?: number;
  fromBackToTop?: boolean;
}

let activeScrollAnimationId: number | null = null;

/**
 * Cancel any ongoing programmatic smooth scroll animation
 */
function cancelOngoingScroll(): void {
  if (activeScrollAnimationId !== null) {
    window.cancelAnimationFrame(activeScrollAnimationId);
    activeScrollAnimationId = null;
  }
}

// Yield animation when user manually interacts
if (typeof window !== "undefined") {
  const cancelEvents = [
    "wheel",
    "touchmove",
    "pointerdown",
    "keydown",
  ] as const;
  cancelEvents.forEach((evt) => {
    window.addEventListener(evt, cancelOngoingScroll, { passive: true });
  });
}

/**
 * Apple-style damped smooth scrolling with distance-adaptive duration and easeOutQuart curve
 */
export function smoothScrollTo(targetY: number, customDuration?: number): void {
  cancelOngoingScroll();

  const startY = window.scrollY;
  const diff = targetY - startY;
  const distance = Math.abs(diff);

  if (distance < 5) {
    window.scrollTo(0, targetY);
    return;
  }

  // Distance-adaptive duration: 550ms for short, ~750ms for medium, up to 950ms for long distances
  const duration =
    customDuration ??
    Math.min(950, Math.max(550, Math.round(500 + Math.sqrt(distance) * 6.5)));

  const startTime = performance.now();

  // Apple-style quartic ease-out curve: immediate responsive start + long, silky deceleration
  const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutQuart(progress);

    window.scrollTo(0, startY + diff * ease);

    if (progress < 1) {
      activeScrollAnimationId = window.requestAnimationFrame(step);
    } else {
      activeScrollAnimationId = null;
    }
  }

  activeScrollAnimationId = window.requestAnimationFrame(step);
}

export function setupScrollTop(): void {
  const btn = document.getElementById("back-to-top");
  const container = document.getElementById("floating-actions");
  if (!btn) return;

  let isScrolled = false;
  let isHovered = false;

  const syncState = () => {
    if (isScrolled && isHovered) {
      btn.classList.remove(
        "invisible",
        "pointer-events-none",
        "h-0",
        "opacity-0",
        "translate-y-2",
        "scale-90",
      );
      btn.classList.add(
        "visible",
        "pointer-events-auto",
        "h-9",
        "opacity-100",
        "translate-y-0",
        "scale-100",
      );
    } else {
      btn.classList.remove(
        "visible",
        "pointer-events-auto",
        "h-9",
        "opacity-100",
        "translate-y-0",
        "scale-100",
      );
      btn.classList.add(
        "invisible",
        "pointer-events-none",
        "h-0",
        "opacity-0",
        "translate-y-2",
        "scale-90",
      );
    }
  };

  let ticking = false;
  const updateVisibility = () => {
    isScrolled = window.scrollY > 350;
    syncState();
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    },
    { passive: true },
  );

  if (container) {
    container.addEventListener("mouseenter", () => {
      isHovered = true;
      syncState();
    });
    container.addEventListener("mouseleave", () => {
      isHovered = false;
      syncState();
    });
    container.addEventListener("focusin", () => {
      isHovered = true;
      syncState();
    });
    container.addEventListener("focusout", () => {
      isHovered = false;
      syncState();
    });
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const currentY = window.scrollY;

    if (currentY > 100 && window.history) {
      // 1. 记录当前阅读位置到当前历史状态
      const currentState = (window.history.state as ScrollHistoryState) || {};
      window.history.replaceState({ ...currentState, scrollY: currentY }, "");

      // 2. 将顶部状态作为新条目入栈，使得浏览器后退按键可以返回原阅读位置
      window.history.pushState({ scrollY: 0, fromBackToTop: true }, "");
    }

    smoothScrollTo(0);
  });

  // 监听浏览器后退/前进事件 (popstate)，平滑过渡滚动回历史阅读位置
  window.addEventListener("popstate", (e: PopStateEvent) => {
    const state = e.state as ScrollHistoryState | null;
    if (state && typeof state.scrollY === "number") {
      smoothScrollTo(state.scrollY);
    }
  });

  // Initial check on load
  updateVisibility();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupScrollTop);
} else {
  setupScrollTop();
}
