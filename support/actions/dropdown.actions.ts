/**
 * support/actions/dropdown.actions.ts
 * Reusable functions for native <select> dropdowns.
 * (Custom-built dropdowns made of divs need their own handling, see
 * README "Custom dropdowns" note, because they don't use selectOption.)
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function selectDropdownOptionByLabel(
  page: Page,
  target: FindOptions,
  optionLabel: string,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.selectOption({ label: optionLabel });
  logger?.step(`Selected "${optionLabel}" in dropdown "${target.description}"`);
}

export async function getSelectedDropdownLabel(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<string> {
  const element = await findElement(page, target, logger);
  const value = await element.evaluate((select: HTMLSelectElement) => {
    return select.options[select.selectedIndex]?.text ?? '';
  });
  logger?.info(`Dropdown "${target.description}" currently shows "${value}"`);
  return value;
}
