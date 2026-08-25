/**
 * support/base-test.ts
 *
 * Every spec file should import { test, expect } from here, NOT directly
 * from "@playwright/test". That's the one rule that makes the automatic
 * logging below apply to every single test with zero extra code per file.
 *
 * What this adds on top of plain Playwright:
 *   - A "logger" that every test can use, already tagged with the test's name.
 *   - Automatic start/finish/failure logging for every test (autouse fixture,
 *     works like a built-in beforeEach/afterEach that you never have to
 *     repeat in each spec file).
 *   - On failure, the real error message is written clearly to the log,
 *     so nobody has to dig through a stack trace to find out what broke.
 */
import { test as base, expect, TestInfo } from '@playwright/test';
import { createLogger, Logger } from './logger';

type Fixtures = {
  logger: Logger;
};

export const test = base.extend<Fixtures>({
  logger: async ({}, use, testInfo: TestInfo) => {
    const logger = createLogger(testInfo.title);
    logger.info(`Starting test: "${testInfo.title}"`);

    await use(logger);

    if (testInfo.status === 'passed') {
      logger.info(`Test passed: "${testInfo.title}"`);
    } else if (testInfo.status === 'skipped') {
      logger.warn(`Test skipped: "${testInfo.title}"`);
    } else {
      // failed, timedOut, or interrupted
      const reason = testInfo.error?.message ?? 'No error message was captured.';
      logger.error(`Test FAILED: "${testInfo.title}"`);
      logger.error(`Reason: ${reason}`);
    }
  },
});

export { expect };
