import { defineConfig, devices } from "@playwright/test";

// Initialize timestamped screenshot directory across all workers if screenshot mode is enabled
if (
  !process.env.SCREENSHOT_SESSION_DIR &&
  (process.env.SCREENSHOT === "1" || process.env.SCREENSHOT === "true")
) {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  process.env.SCREENSHOT_SESSION_DIR = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:51731",
    trace: "on-first-retry",
    channel: "chrome",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node scripts/preview-server.ts",
    url: "http://localhost:51731",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
