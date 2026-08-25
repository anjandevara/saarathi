/**
 * support/actions/modal.actions.ts
 * Reusable functions for modal / dialog boxes.
 *
 * Modals are a special case: a closed modal is often still in the page's
 * HTML, just hidden. Normal role lookups skip hidden elements on purpose
 * (that's usually what you want), so here we deliberately include hidden
 * elements, then wait for the visible/hidden state to actually change.
 */
import { Page } from '@playwright/test';
import { Logger } from '../logger';

export interface ModalTarget {
  role: string;
  name?: string | RegExp;
  description: string;
}

export async function waitForModalVisible(
  page: Page,
  target: ModalTarget,
  logger?: Logger
): Promise<void> {
  const modal = page.getByRole(target.role as any, {
    name: target.name,
    includeHidden: true,
  });
  await modal.waitFor({ state: 'visible' });
  logger?.step(`Modal "${target.description}" is now visible`);
}

export async function waitForModalClosed(
  page: Page,
  target: ModalTarget,
  logger?: Logger
): Promise<void> {
  const modal = page.getByRole(target.role as any, {
    name: target.name,
    includeHidden: true,
  });
  await modal.waitFor({ state: 'hidden' });
  logger?.step(`Modal "${target.description}" is now closed`);
}
