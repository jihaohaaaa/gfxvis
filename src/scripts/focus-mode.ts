/**
 * Focus Mode Controller:
 * In Focus Mode, the floating header is permanently retracted and locked away.
 * Top-edge mouse hover sensing is disabled until the user exits focus mode.
 */

let focusModeState = false;

export function isFocusModeActive(): boolean {
  return focusModeState;
}

let toastMaxTimer: ReturnType<typeof setTimeout> | null = null;
let toastMinTimer: ReturnType<typeof setTimeout> | null = null;
let toastShowTimestamp = 0;
let isCursorOnControl = false;

const MIN_TOAST_DURATION = 800; // 最短展示保底时间 800ms
const MAX_TOAST_DURATION = 2200; // 悬停时的最长展示时间 2200ms

export function hideFocusToast(): void {
  const toast = document.getElementById("focus-toast");
  if (!toast) return;
  if (toastMaxTimer) {
    clearTimeout(toastMaxTimer);
    toastMaxTimer = null;
  }
  if (toastMinTimer) {
    clearTimeout(toastMinTimer);
    toastMinTimer = null;
  }
  toast.classList.remove("opacity-100", "translate-y-0");
  toast.classList.add("opacity-0", "translate-y-3", "pointer-events-none");
}

function showFocusToast(message: string): void {
  const toast = document.getElementById("focus-toast");
  const toastText = document.getElementById("focus-toast-text");
  if (!toast || !toastText) return;

  toastText.textContent = message;

  toast.classList.remove("opacity-0", "translate-y-3", "pointer-events-none");
  toast.classList.add("opacity-100", "translate-y-0");

  toastShowTimestamp = Date.now();
  if (toastMinTimer) {
    clearTimeout(toastMinTimer);
    toastMinTimer = null;
  }
  if (toastMaxTimer) {
    clearTimeout(toastMaxTimer);
    toastMaxTimer = null;
  }

  // 即使鼠标一直悬停，到达 MAX_TOAST_DURATION 后也会平滑自动收起
  toastMaxTimer = setTimeout(() => {
    hideFocusToast();
  }, MAX_TOAST_DURATION);
}

function handleCursorLeave(): void {
  isCursorOnControl = false;
  const elapsed = Date.now() - toastShowTimestamp;
  if (elapsed >= MIN_TOAST_DURATION) {
    hideFocusToast();
  } else {
    // 保证至少展示 MIN_TOAST_DURATION 供用户看清提示
    if (toastMinTimer) clearTimeout(toastMinTimer);
    toastMinTimer = setTimeout(() => {
      if (!isCursorOnControl) {
        hideFocusToast();
      }
    }, MIN_TOAST_DURATION - elapsed);
  }
}

function handleCursorEnter(): void {
  isCursorOnControl = true;
  if (toastMinTimer) {
    clearTimeout(toastMinTimer);
    toastMinTimer = null;
  }
}

export function setFocusMode(active: boolean): void {
  focusModeState = active;
  const btn = document.getElementById("focus-toggle");
  const enterIcon = btn?.querySelector<HTMLElement>(".icon-focus-enter");
  const exitIcon = btn?.querySelector<HTMLElement>(".icon-focus-exit");

  if (active) {
    document.body.classList.add("focus-mode-active");
    if (btn) {
      btn.classList.add(
        "border-accent",
        "text-accent",
        "bg-accent/15",
        "ring-2",
        "ring-accent/30",
      );
      btn.classList.remove("text-muted", "bg-surface/90");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("title", "退出专注模式 (恢复顶栏)");
    }
    if (enterIcon) enterIcon.classList.add("hidden");
    if (exitIcon) exitIcon.classList.remove("hidden");
    showFocusToast("已开启专注模式：顶栏已锁定隐藏");
  } else {
    document.body.classList.remove("focus-mode-active");
    if (btn) {
      btn.classList.remove(
        "border-accent",
        "text-accent",
        "bg-accent/15",
        "ring-2",
        "ring-accent/30",
      );
      btn.classList.add("text-muted", "bg-surface/90");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("title", "进入专注模式 (隐藏顶栏)");
    }
    if (enterIcon) enterIcon.classList.remove("hidden");
    if (exitIcon) exitIcon.classList.add("hidden");
    showFocusToast("已退出专注模式");
  }

  window.dispatchEvent(
    new CustomEvent("focus-mode-change", {
      detail: { isFocusMode: focusModeState },
    }),
  );
}

export function toggleFocusMode(): void {
  setFocusMode(!focusModeState);
}

export function setupFocusMode(): void {
  const btn = document.getElementById("focus-toggle");
  const toast = document.getElementById("focus-toast");
  if (!btn) return;

  btn.addEventListener("click", () => {
    isCursorOnControl = true;
    toggleFocusMode();
  });

  btn.addEventListener("mouseenter", handleCursorEnter);
  btn.addEventListener("mouseleave", handleCursorLeave);

  if (toast) {
    toast.addEventListener("mouseenter", handleCursorEnter);
    toast.addEventListener("mouseleave", handleCursorLeave);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupFocusMode);
} else {
  setupFocusMode();
}
