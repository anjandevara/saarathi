/**
 * support/actions/slider.actions.ts
 * Reusable functions for range sliders (<input type="range">).
 *
 * Note: Playwright's normal .fill() does not work on sliders. We set the
 * value directly and fire the same events a real drag would fire, so the
 * page's own JavaScript reacts exactly like it would for a real user.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function setSliderValue(
  page: Page,
  target: FindOptions,
  value: number,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.evaluate((input: HTMLInputElement, newValue: number) => {
    input.value = String(newValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  logger?.step(`Set slider "${target.description}" to ${value}`);
}

export async function readSliderValue(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<number> {
  const element = await findElement(page, target, logger);
  const value = await element.inputValue();
  logger?.info(`Slider "${target.description}" currently at ${value}`);
  return Number(value);
}
