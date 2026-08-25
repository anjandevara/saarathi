/**
 * support/actions/tabs.actions.ts
 * Reusable functions for ARIA-style tab widgets (role="tab" / "tabpanel").
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function selectTab(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<void> {
  const tab = await findElement(page, target, logger);
  await tab.click();
  logger?.step(`Selected tab "${target.description}"`);
}

export async function isTabSelected(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<boolean> {
  const tab = await findElement(page, target, logger);
  const selected = await tab.getAttribute('aria-selected');
  return selected === 'true';
}
