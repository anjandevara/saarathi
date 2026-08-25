/**
 * support/actions/textbox.actions.ts
 * Reusable functions for any single-line or multi-line text input.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function fillTextbox(
  page: Page,
  target: FindOptions,
  value: string,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.fill(value);
  logger?.step(`Filled "${target.description}" with "${value}"`);
}

export async function readTextboxValue(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<string> {
  const element = await findElement(page, target, logger);
  const value = await element.inputValue();
  logger?.info(`Read "${target.description}" value: "${value}"`);
  return value;
}

export async function clearTextbox(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.fill('');
  logger?.step(`Cleared "${target.description}"`);
}
