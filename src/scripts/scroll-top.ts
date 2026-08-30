/**
 * Client-side back-to-top button controller with Apple-style damped smooth scrolling
 * and two-stage proximity sensing (peek when near, expand on direct hover).
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
  if (!btn || !container) return;

  let isFocused = false;
  let isDirectHovered = false;

  const updateCardState = (state: "collapsed" | "peek" | "expanded") => {
    if (container.dataset.state !== state) {
      container.dataset.state = state;
    }
  };

  // Distance-based Proximity Sensing (~135px radius for peek, inside rect for expanded)
  const handlePointerMove = (e: PointerEvent) => {
    if (isFocused || isDirectHovered) {
      updateCardState("expanded");
      return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    // Direct proximity or inside bounds
    if (
      e.clientX >= rect.left - 8 &&
      e.clientX <= rect.right + 8 &&
      e.clientY >= rect.top - 8 &&
      e.clientY <= rect.bottom + 8
    ) {
      updateCardState("expanded");
    } else if (dist <= 135) {
      updateCardState("peek");
    } else {
      updateCardState("collapsed");
    }
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("mouseleave", () => {
    if (!isFocused) updateCardState("collapsed");
  });

  // Direct hover & focus state handling
  container.addEventListener("mouseenter", () => {
    isDirectHovered = true;
    updateCardState("expanded");
  });
  container.addEventListener("mouseleave", () => {
    isDirectHovered = false;
  });
  container.addEventListener("focusin", () => {
    isFocused = true;
    updateCardState("expanded");
  });
  container.addEventListener("focusout", () => {
    isFocused = false;
    updateCardState("collapsed");
  });

  // Scroll threshold styling
  let ticking = false;
  const updateScrollState = () => {
    const isScrolled = window.scrollY > 300;
    if (isScrolled) {
      btn.classList.add("text-accent", "opacity-100");
      btn.classList.remove("text-muted/70", "opacity-70");
    } else {
      btn.classList.remove("text-accent", "opacity-100");
      btn.classList.add("text-muted/70", "opacity-70");
    }
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    },
    { passive: true },
  );

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    btn.blur();
    isFocused = false;
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
  updateScrollState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupScrollTop);
} else {
  setupScrollTop();
}
