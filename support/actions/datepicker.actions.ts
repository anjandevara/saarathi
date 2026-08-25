/**
 * support/actions/datepicker.actions.ts
 * Reusable functions for native <input type="date"> pickers.
 *
 * Note: always pass the date as "YYYY-MM-DD". That is the one format
 * native date inputs accept from automation, no matter how the date is
 * displayed to a real user on screen.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function setDate(
  page: Page,
  target: FindOptions,
  isoDate: string,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.fill(isoDate);
  logger?.step(`Set date "${target.description}" to ${isoDate}`);
}

export async function readDate(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<string> {
  const element = await findElement(page, target, logger);
  const value = await element.inputValue();
  logger?.info(`Date "${target.description}" currently set to ${value}`);
  return value;
}
