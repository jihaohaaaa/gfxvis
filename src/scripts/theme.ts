/**
 * Client-side theme controller for GFXVis:
 * - Initializes dark/light theme early to prevent FOUC.
 * - Handles theme toggle button interactions and persists preferences in localStorage.
 */

const THEME_KEY = "gfxvis-theme";

export function initTheme(): void {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  } catch {
    /* localStorage unavailable */
  }
}

export function bindThemeToggle(): void {
  const button = document.getElementById("theme-toggle");
  if (!button) return;

  button.addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {
      /* localStorage unavailable */
    }
  });
}

// Auto-run on module import
initTheme();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindThemeToggle);
} else {
  bindThemeToggle();
}
