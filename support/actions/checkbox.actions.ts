/**
 * support/actions/checkbox.actions.ts
 * Reusable functions for checkboxes.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function setCheckbox(
  page: Page,
  target: FindOptions,
  checked: boolean,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  if (checked) {
    await element.check();
  } else {
    await element.uncheck();
  }
  logger?.step(`Set "${target.description}" checkbox to ${checked ? 'checked' : 'unchecked'}`);
}

export async function isCheckboxChecked(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<boolean> {
  const element = await findElement(page, target, logger);
  const checked = await element.isChecked();
  logger?.info(`"${target.description}" checkbox is currently ${checked ? 'checked' : 'unchecked'}`);
  return checked;
}
