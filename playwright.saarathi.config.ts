/**
 * playwright.saarathi.config.ts
 *
 * Runs the on-self suite against the Saarathi app. Playwright itself starts
 * the Saarathi dev server, waits for it, runs the tests, then shuts it down,
 * so there is no server to manage by hand.
 *
 * Assumes the Saarathi app lives at ./saarathi/web relative to this framework
 * (that is where it was delivered). Run npm install in saarathi/web once first.
 *
 * Usage, from the framework folder:
 *   TEST_ENV=saarathi npx playwright test tests/saarathi --config=playwright.saarathi.config.ts
 */
import * as path from 'path';
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const frameworkDir = __dirname;
const saarathiWebDir = path.resolve(__dirname, 'saarathi', 'web');

export default defineConfig({
  ...base,
  // Bound the run so it can never hang: each test caps at 25s, the whole run at 120s.
  timeout: 25_000,
  globalTimeout: 120_000,
  retries: 0,
  webServer: {
    command: 'npm run dev',
    cwd: saarathiWebDir,
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: true,
    // Point Saarathi at this very framework so it shows live data while under test.
    env: {
      SAARATHI_PROJECT_PATH: frameworkDir,
    },
  },
});
