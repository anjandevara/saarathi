/**
 * support/actions/table.actions.ts
 * Reusable functions for reading data out of an HTML table.
 */
import { Page } from '@playwright/test';
import { findElement, FindOptions } from '../locator-resolver';
import { Logger } from '../logger';

export async function getTableCellText(
  page: Page,
  target: FindOptions,
  rowIndex: number,
  columnIndex: number,
  logger?: Logger
): Promise<string> {
  const table = await findElement(page, target, logger);
  const cell = table.locator('tbody tr').nth(rowIndex).locator('td').nth(columnIndex);
  const text = (await cell.textContent())?.trim() ?? '';
  logger?.info(
    `Table "${target.description}" row ${rowIndex}, column ${columnIndex} = "${text}"`
  );
  return text;
}

export async function getTableRowCount(
  page: Page,
  target: FindOptions,
  logger?: Logger
): Promise<number> {
  const table = await findElement(page, target, logger);
  const count = await table.locator('tbody tr').count();
  logger?.info(`Table "${target.description}" has ${count} rows`);
  return count;
}
