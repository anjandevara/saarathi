/**
 * playwright.config.ts
 *
 * This is the single place that controls how tests run: which app they
 * point at, how many retries, what gets captured on failure, and which
 * reports get produced. Nothing else in the framework should hard-code
 * these settings.
 */
import { defineConfig, devices } from '@playwright/test';
import { env } from './support/env';

export default defineConfig({
  testDir: './tests',

  // Fail the CI build if someone accidentally left a test.only() in the code.
  forbidOnly: !!process.env.CI,

  // Locally: no retries, so a flaky test shows up immediately.
  // In CI: retry twice, because shared CI machines are more prone to
  // one-off network hiccups that are not the test's fault.
  retries: process.env.CI ? 2 : 0,

  // Fixed cap of 3 workers everywhere, local and CI. Independent tests
  // run in parallel across these workers. Tests tagged @chained use
  // test.describe.configure({ mode: 'serial' }) in their own spec file,
  // so they still run in order on one worker, inside this same cap.
  workers: 3,
  fullyParallel: true,

  // Every report a human or a CI system might want to look at, all at once.
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }],
  ],

  use: {
    baseURL: env.baseUrl,

    // Capture evidence only when something actually goes wrong, so normal
    // passing runs stay small and fast.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    actionTimeout: 10_000,
    navigationTimeout: 30_000,

    // Normally leave this alone — Playwright uses the browser it downloaded
    // for you. This only matters if you need to point at a specific Chrome
    // install (e.g. a locked-down machine that can't download browsers).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers here later the same way, e.g.:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
