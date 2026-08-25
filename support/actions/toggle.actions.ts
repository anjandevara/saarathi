/**
 * support/actions/toggle.actions.ts
 * Reusable functions for on/off toggle switches.
 *
 * Most toggle switches in real apps are a checkbox input styled to look
 * like a switch (sometimes with role="switch" added). Because of that,
 * this works the same way as a checkbox under the hood.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function setToggle(
  page: Page,
  target: FindOptions,
  on: boolean,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  if (on) {
    await element.check();
  } else {
    await element.uncheck();
  }
  logger?.step(`Set toggle "${target.description}" to ${on ? 'ON' : 'OFF'}`);
}

export async function isToggleOn(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<boolean> {
  const element = await findElement(page, target, logger);
  return element.isChecked();
}
