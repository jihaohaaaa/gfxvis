import { defineConfig, devices } from "@playwright/test";

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
