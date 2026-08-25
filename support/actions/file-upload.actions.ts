/**
 * support/actions/file-upload.actions.ts
 * Reusable functions for file upload inputs.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function uploadFile(
  page: Page,
  target: FindOptions,
  filePath: string,
  logger?: Logger
): Promise<void> {
  const element = await findElement(page, target, logger);
  await element.setInputFiles(filePath);
  logger?.step(`Uploaded file "${filePath}" into "${target.description}"`);
}
