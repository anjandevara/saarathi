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
    return findElement(this.page, { text: 'Suite health', description: 'Suite health label under the core' }, this.logger);
  }

  // Finds any visible element carrying the given text, used to confirm a
  // specific agent, persona, lesson, or empty-state message is on screen.
  getByVisibleText(text: string, description: string): Promise<Locator> {
    return findElement(this.page, { text, description }, this.logger);
  }

  // The "Recs" count tile in the home dock. Its presence is the regression
  // guard for bug 10 (Recommendations count was missing from the home summary).
  getRecsTile(): Promise<Locator> {
    return findElement(this.page, { text: 'Recs', description: 'Recommendations count tile in the home dock' }, this.logger);
  }
}
