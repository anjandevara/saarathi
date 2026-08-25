/**
 * support/actions/radio.actions.ts
 * Reusable functions for radio buttons.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function selectRadio(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.check();
  logger?.step(`Selected radio option "${target.description}"`);
}

export async function isRadioSelected(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<boolean> {
  const element = await findElement(page, target, logger);
  return element.isChecked();
}
