import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Locator, Page } from "@playwright/test";

export interface CaptureIslandOptions {
  /**
   * Target locator to screenshot.
   * If not provided, defaults to the active `[data-window-shell="kde"]` or `[data-testid="expandable-demo"]`.
   */
  locator?: Locator;
  /**
   * Subdirectory under the session timestamp folder (optional).
   */
  subDir?: string;
  /**
   * Whether to capture the full page instead of just the island container (default: false).
   */
  fullPage?: boolean;
  /**
   * Timeout in ms for stabilization checks (default: 5000).
   */
  timeout?: number;
  /**
   * Optional custom settle delay in ms before capturing (default: 120).
   */
  settleDelayMs?: number;
}

/**
 * Returns true if screenshot mode is enabled via environment variable.
 * Default is FALSE (zero overhead during normal/routine tests and CI).
 */
export function shouldCaptureScreenshot(): boolean {
  const env = process.env.SCREENSHOT;
  return env === "1" || env === "true";
}

/**
 * Formats a two-digit number.
 */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Generates or retrieves the timestamp session directory for this test run.
 * Format: YYYY-MM-DD_HH-mm-ss (e.g., 2026-10-03_23-05-00)
 */
export function getScreenshotSessionDir(): string {
  if (process.env.SCREENSHOT_SESSION_DIR) {
    return process.env.SCREENSHOT_SESSION_DIR;
  }
  const d = new Date();
  const sessionDir = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  process.env.SCREENSHOT_SESSION_DIR = sessionDir;
  return sessionDir;
}

/**
 * Capture an interactive Island screenshot with full rendering stabilization.
 *
 * Stabilization includes:
 * 1. `document.fonts.ready` check (ensures font metrics are loaded);
 * 2. KaTeX compilation visibility check;
 * 3. Double `requestAnimationFrame` wait (ensures Canvas 2D / WebGL 3D buffer has rendered);
 * 4. Micro settle delay for CSS transitions/KDE Breeze tabs.
 *
 * Output:
 * Saved under `.playwright-screenshots/<subDir>/<name>.png` and logged as `file:///...` URI.
 *
 * NOTE FOR AGENTS:
 * Screenshot capture is DEFAULT OFF. Only run with `SCREENSHOT=1` and inspect screenshots
 * when the user reports a rendering/layout bug or explicitly requests visual verification.
 */
export async function captureIsland(
  page: Page,
  name: string,
  options: CaptureIslandOptions = {},
): Promise<string | null> {
  if (!shouldCaptureScreenshot()) {
    return null;
  }

  const {
    locator,
    subDir = "",
    fullPage = false,
    timeout = 5000,
    settleDelayMs = 120,
  } = options;

  // 1. Wait for web fonts
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // 2. Wait for KaTeX math rendering if any math is present
  const katexLocator = page.locator(".katex").first();
  if ((await katexLocator.count()) > 0) {
    await katexLocator.waitFor({ state: "visible", timeout }).catch(() => {});
  }

  // 3. Wait for 2 requestAnimationFrame cycles for Canvas 2D / Three.js 3D buffer paint
  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }),
    )
    .catch(() => {});

  // 4. Settle delay for animations & state switches
  if (settleDelayMs > 0) {
    await page.waitForTimeout(settleDelayMs);
  }

  // 5. Determine target locator
  let targetLocator: Locator = page.locator("body");
  if (!fullPage) {
    if (locator) {
      targetLocator = locator;
    } else {
      const kdeShell = page.locator('[data-window-shell="kde"]').first();
      const expandableDemo = page
        .locator('[data-testid="expandable-demo"]')
        .first();
      if ((await kdeShell.count()) > 0) {
        targetLocator = kdeShell;
      } else if ((await expandableDemo.count()) > 0) {
        targetLocator = expandableDemo;
      }
    }
  }

  // 6. Ensure element is visible & centered (avoiding sticky header overlap)
  if (!fullPage) {
    await targetLocator
      .evaluate((el) => {
        el.scrollIntoView({ behavior: "instant", block: "center" });
      })
      .catch(() => {});
    await targetLocator.waitFor({ state: "visible", timeout }).catch(() => {});
  }

  // 7. Sanitize file name and construct path
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = sanitizedName.endsWith(".png")
    ? sanitizedName
    : `${sanitizedName}.png`;
  const sessionDir = getScreenshotSessionDir();
  const baseDir = resolve(
    process.cwd(),
    ".playwright-screenshots",
    sessionDir,
    subDir,
  );
  const fullPath = join(baseDir, fileName);

  await mkdir(dirname(fullPath), { recursive: true });

  // 8. Temporarily hide floating site header during component capture so it never obstructs the card
  if (!fullPage) {
    await page
      .evaluate(() => {
        const siteHeader = document.getElementById("site-header");
        if (siteHeader) siteHeader.style.visibility = "hidden";
      })
      .catch(() => {});
  }

  // 9. Capture screenshot
  try {
    if (fullPage) {
      await page.screenshot({
        path: fullPath,
        fullPage: true,
        animations: "disabled",
      });
    } else {
      await targetLocator.screenshot({
        path: fullPath,
        animations: "disabled",
      });
    }
  } finally {
    if (!fullPage) {
      await page
        .evaluate(() => {
          const siteHeader = document.getElementById("site-header");
          if (siteHeader) siteHeader.style.visibility = "";
        })
        .catch(() => {});
    }
  }

  console.log(`📸 [Island Screenshot]: file://${fullPath}`);
  return fullPath;
}
