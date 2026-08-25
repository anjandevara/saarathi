/**
 * support/locator-resolver.ts
 *
 * The problem this file solves:
 *   A lot of real web apps do not have clean IDs or test-ids. If we only
 *   knew how to find elements by ID, the framework would break on those apps.
 *
 * The fix:
 *   Try several ways to find the element, in order, from "most reliable"
 *   to "last resort". Stop at the first one that actually finds something.
 *   Log which way worked, so a human debugging a failure can see it.
 *
 * The wait:
 *   Each strategy gets a real, bounded wait using Playwright's own
 *   waitFor(), not a single instant check. An element that renders half a
 *   second late is not the same as an element that will never exist, and
 *   this framework must not confuse the two. There are no hard-coded
 *   sleeps anywhere in this file: STRATEGY_TIMEOUT_MS bounds how long
 *   waitFor is allowed to poll for, it never blindly pauses execution.
 *
 * The circuit breaker:
 *   If every strategy times out, that is the circuit breaker tripping.
 *   The function stops trying, takes an accessibility snapshot of the
 *   page for debugging, and throws one clear error. It never keeps
 *   guessing past that point.
 *
 * Honest limit:
 *   If a page truly has no test-id, no label, no role, no visible text, and
 *   no unique CSS to tell two elements apart, no tool can reliably find the
 *   right one. In that case this function throws a clear error instead of
 *   guessing and clicking the wrong thing.
 */
import { Page, Locator } from '@playwright/test';
import { Logger } from './logger';

/** How long, in milliseconds, a single strategy is allowed to wait for its element to appear. */
const STRATEGY_TIMEOUT_MS = 3000;

export interface FindOptions {
  /** data-testid value, e.g. "email-input". Tried first, it's the most reliable. */
  testId?: string;
  /** ARIA role, e.g. "button", "textbox", "checkbox". */
  role?: string;
  /** Accessible name that goes with the role, e.g. "Submit". */
  name?: string | RegExp;
  /** Visible <label> text tied to a form field. */
  label?: string | RegExp;
  /** Placeholder text inside an input. */
  placeholder?: string | RegExp;
  /** Visible text on the element itself (buttons, links, plain text). */
  text?: string | RegExp;
  /** Last resort: a plain CSS selector. Use only when nothing else works. */
  css?: string;
  /** A short human description used in log messages, e.g. "Login button". */
  description: string;
  /** Optional override for how long each strategy waits. Defaults to STRATEGY_TIMEOUT_MS. */
  strategyTimeoutMs?: number;
}

/**
 * Waits, for real, for a candidate locator to appear, bounded by timeoutMs.
 * Returns how many elements matched once something appeared (0 if nothing
 * appeared in time). This is the one place that decides "does this exist
 * yet", so every strategy above waits the same real way.
 */
async function waitAndCount(candidate: Locator, timeoutMs: number): Promise<number> {
  try {
    await candidate.first().waitFor({ state: 'attached', timeout: timeoutMs });
  } catch {
    // Nothing showed up within the bounded wait. Not an error by itself,
    // just this strategy's answer: 0 matches. The caller decides what to
    // do next (try the next strategy, or give up).
    return 0;
  }
  return candidate.count();
}

/**
 * Tries each strategy in FindOptions, in a fixed, most-reliable-first order.
 * Returns the first Locator that actually matches something on the page.
 */
export async function findElement(
  page: Page,
  options: FindOptions,
  logger?: Logger
): Promise<Locator> {
  const attempts: Array<{ strategyName: string; build: () => Locator }> = [];

  if (options.testId) {
    attempts.push({
      strategyName: `testId="${options.testId}"`,
      build: () => page.getByTestId(options.testId as string),
    });
  }
  if (options.role) {
    attempts.push({
      strategyName: `role="${options.role}"${options.name ? ` name="${options.name}"` : ''}`,
      build: () =>
        page.getByRole(options.role as any, options.name ? { name: options.name } : undefined),
    });
  }
  if (options.label) {
    attempts.push({
      strategyName: `label="${options.label}"`,
      build: () => page.getByLabel(options.label as string),
    });
  }
  if (options.placeholder) {
    attempts.push({
      strategyName: `placeholder="${options.placeholder}"`,
      build: () => page.getByPlaceholder(options.placeholder as string),
    });
  }
  if (options.text) {
    attempts.push({
      strategyName: `text="${options.text}"`,
      build: () => page.getByText(options.text as string, { exact: false }),
    });
  }
  if (options.css) {
    attempts.push({
      strategyName: `css="${options.css}"`,
      build: () => page.locator(options.css as string),
    });
  }

  if (attempts.length === 0) {
    throw new Error(
      `findElement("${options.description}") was given no way to find the element. ` +
        `Pass at least one of: testId, role, label, placeholder, text, css.`
    );
  }

  const triedStrategies: string[] = [];
  const timeoutMs = options.strategyTimeoutMs ?? STRATEGY_TIMEOUT_MS;

  for (const attempt of attempts) {
    const candidate = attempt.build();
    const matchCount = await waitAndCount(candidate, timeoutMs);
    triedStrategies.push(`${attempt.strategyName} -> ${matchCount} match(es)`);

    if (matchCount === 1) {
      logger?.info(
        `Found "${options.description}" using ${attempt.strategyName}`
      );
      return candidate;
    }
    if (matchCount > 1) {
      logger?.warn(
        `"${options.description}": ${attempt.strategyName} matched ${matchCount} elements, ` +
          `not exactly 1. Trying the next strategy instead of guessing which one.`
      );
    }
  }

  // Circuit breaker: every strategy waited its full bounded timeout and
  // still found nothing usable. Capture an accessibility snapshot before
  // giving up, so a human (or the self-healer agent) has real evidence to
  // look at instead of just an error message.
  let accessibilitySnapshot = '(snapshot unavailable)';
  try {
    accessibilitySnapshot = await page.locator('body').ariaSnapshot();
  } catch {
    // Snapshot is a bonus for debugging, not a requirement. If it fails,
    // the error below still carries the important information.
  }

  logger?.error(
    `Circuit breaker tripped for "${options.description}": all ${attempts.length} ` +
      `strategies timed out after ${timeoutMs}ms each.`
  );

  throw new Error(
    `Could not find "${options.description}" on this page. Tried, in order:\n` +
      triedStrategies.map((line) => `  - ${line}`).join('\n') +
      `\nThis usually means the page has no role, label, test-id, or text that ` +
      `uniquely identifies this element. Add a css selector as a last resort, ` +
      `or ask the dev team to add a data-testid.\n\n` +
      `Accessibility snapshot at time of failure:\n${accessibilitySnapshot}`
  );
}
