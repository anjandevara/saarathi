/**
 * support/data-reader.ts
 * One job: read and write JSON files inside the fixtures/ folder.
 * This is the only place that should touch the filesystem for test data,
 * so if the storage format ever changes, there is only one place to fix.
 */
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

export function readFixture<T = any>(fileName: string): T {
  const filePath = path.join(FIXTURES_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: fixtures/${fileName}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Saves information captured from the app during a test run, so it can be
 * reused later (by a later test, or a later run). Always goes into
 * fixtures/saved-state, and is always JSON.
 */
export function saveState(fileName: string, data: unknown): void {
  const filePath = path.join(FIXTURES_DIR, 'saved-state', fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readSavedState<T = any>(fileName: string): T {
  const filePath = path.join(FIXTURES_DIR, 'saved-state', fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Saved state file not found: fixtures/saved-state/${fileName}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}
