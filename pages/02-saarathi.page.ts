/**
 * pages/02-saarathi.page.ts
 *
 * Page Object for the Saarathi command center app (the Next.js application
 * this framework's data feeds). Every element is found through findElement(),
 * the same resilient locator strategy used everywhere else, so this test
 * follows the framework's own rules rather than reaching for raw locators.
 */
import { Page, Locator } from '@playwright/test';
import { Logger } from '../support/logger';
import { findElement } from '../support/locator-resolver';

export class SaarathiPage {
  constructor(private page: Page, private logger: Logger) {}

  async openHome(): Promise<void> {
    await this.page.goto('/');
    this.logger.step('Opened the Saarathi command screen');
  }

  async goToAgents(): Promise<void> {
    const link = await findElement(
      this.page,
      { role: 'link', name: 'Agents', description: 'Agents navigation link' },
      this.logger
    );
    await link.click();
  }

  async goToSignals(): Promise<void> {
    const link = await findElement(
      this.page,
      { role: 'link', name: 'Signals', description: 'Signals navigation link' },
      this.logger
    );
    await link.click();
  }

  // The 3D command core canvas. Its element is in the DOM as soon as the
  // component mounts, whether or not WebGL succeeds, so its presence proves
  // the core mounted.
  getCommandCore(): Promise<Locator> {
    return findElement(this.page, { css: '#gl', description: 'Command core WebGL canvas' }, this.logger);
  }

  getWordmark(): Promise<Locator> {
    return findElement(this.page, { text: 'SAARATHI', description: 'Saarathi wordmark' }, this.logger);
  }

  getNominalBanner(): Promise<Locator> {
    return findElement(this.page, { text: 'All systems nominal', description: 'All systems nominal banner' }, this.logger);
  }

  getSuiteHealthLabel(): Promise<Locator> {
    // The words "Suite health" also appear in the activity ticker once a run
    // exists, so text alone matches two elements and findElement rightly
    // refuses to guess. The test id names the one under the core.
    return findElement(
      this.page,
      { testId: 'suite-health', text: 'Suite health', description: 'Suite health label under the core' },
      this.logger
    );
  }

  // Finds any visible element carrying the given text, used to confirm a
  // specific agent, persona, lesson, or empty-state message is on screen.
  // Accepts a RegExp as well as a string, the same as FindOptions.text does,
  // so a caller can match "Lessons (6)" without pinning the number.
  getByVisibleText(text: string | RegExp, description: string): Promise<Locator> {
    return findElement(this.page, { text, description }, this.logger);
  }

  // The "Recs" count tile in the home dock. Its presence is the regression
  // guard for bug 10 (Recommendations count was missing from the home summary).
  getRecsTile(): Promise<Locator> {
    return findElement(this.page, { text: 'Recs', description: 'Recommendations count tile in the home dock' }, this.logger);
  }

  // The per-project rail, found as an accessibility landmark rather than by a
  // css class, so the guard survives any restyling and fails only if the rail
  // stops being a labelled navigation region.
  getRail(): Promise<Locator> {
    return findElement(
      this.page,
      { role: 'navigation', name: 'Project sections', description: 'Per-project section rail' },
      this.logger
    );
  }

  // Every section link in the rail. Scoped inside the rail so a link of the
  // same name anywhere else on the page cannot be mistaken for one of these.
  async getRailSections(): Promise<Locator> {
    return (await this.getRail()).getByRole('link');
  }

  // Whatever the rail marks as the open section. Matches nothing when no
  // section is open, which is the case on a global view like Reports.
  async getActiveRailSection(): Promise<Locator> {
    return (await this.getRail()).locator('[aria-current="page"]');
  }

  async goToRailSection(name: string): Promise<void> {
    const link = await findElement(
      this.page,
      { role: 'link', name, description: `${name} section link in the rail` },
      this.logger
    );
    await link.click();
  }

  async goToReports(): Promise<void> {
    const link = await findElement(
      this.page,
      { role: 'link', name: 'Reports', description: 'Reports link in the top bar' },
      this.logger
    );
    await link.click();
  }

  // True when the document is wider than its viewport, which is the symptom a
  // reader feels as the page sliding sideways.
  async scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
  }
}
