import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for FreeCut.
 * Spins up a Vite dev server on port 5173 before running tests.
 */
const devPort = Number(process.env.PLAYWRIGHT_PORT || "5173");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${devPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60_000,

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${devPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
