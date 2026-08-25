import fs from "node:fs";
import path from "node:path";
import type { ProjectMeta, RunStats } from "./types";

// A real local database using Node's built-in SQLite (node:sqlite), which needs
// no install and no native compiler. Everything here is best-effort: if SQLite
// is unavailable on this Node version, every function degrades to a safe no-op
// and the app keeps working from the live scan, so the database can never break
// the product. This stores the project registry and the run history.

/* eslint-disable @typescript-eslint/no-explicit-any */
let dbInstance: any = null;
let tried = false;
let available = false;

function getDb(): any {
  if (tried) return dbInstance;
  tried = true;
  try {
    // process.getBuiltinModule reaches node:sqlite at runtime without handing
    // the bundler a module specifier to resolve. createRequire(import.meta.url)
    // used to do this, but Turbopack cannot externalize a commonjs reference
    // made from a URL, so the production server always failed to open the
    // database and silently degraded to no-ops.
    const sqlite = process.getBuiltinModule("node:sqlite") as { DatabaseSync: any } | undefined;
    if (!sqlite) throw new Error("node:sqlite is not available on this Node version");
    const { DatabaseSync } = sqlite;
    const dir = path.join(process.cwd(), ".saarathi");
    fs.mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "saarathi.db"));
    db.exec(
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT, path TEXT, env TEXT, updatedAt TEXT
      );`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, projectId TEXT,
        total INTEGER, passed INTEGER, failed INTEGER, flaky INTEGER, health INTEGER, at TEXT
      );`
    );
    dbInstance = db;
    available = true;
  } catch (err) {
    // Say why. This failure is invisible on screen apart from one small note,
    // and a silent catch here is what let the production server run without a
    // database for a long time without anyone noticing.
    console.warn("Saarathi: local database unavailable, running without run history.", err);
    available = false;
    dbInstance = null;
  }
  return dbInstance;
}

export function dbAvailable(): boolean {
  getDb();
  return available;
}

export function ensureProject(meta: ProjectMeta): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      `INSERT INTO projects (id, name, path, env, updatedAt) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path,
       env = excluded.env, updatedAt = excluded.updatedAt`
    ).run(meta.id, meta.name, meta.path, meta.env, new Date().toISOString());
  } catch {
    /* no-op */
  }
}

export function recordRunIfNew(projectId: string, run: RunStats): void {
  const db = getDb();
  if (!db) return;
  try {
    const last: any = db
      .prepare(`SELECT total, passed, failed, flaky FROM runs WHERE projectId = ? ORDER BY id DESC LIMIT 1`)
      .get(projectId);
    if (last && last.total === run.total && last.passed === run.passed && last.failed === run.failed && last.flaky === run.flaky) {
      return; // identical to the last recorded run, nothing new
    }
    db.prepare(
      `INSERT INTO runs (projectId, total, passed, failed, flaky, health, at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(projectId, run.total, run.passed, run.failed, run.flaky, run.health, run.at || new Date().toISOString());
  } catch {
    /* no-op */
  }
}

export interface RunRow {
  id: number; projectId: string; total: number; passed: number;
  failed: number; flaky: number; health: number; at: string;
}

export function getRunHistory(projectId: string): RunRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(`SELECT * FROM runs WHERE projectId = ? ORDER BY id DESC LIMIT 30`).all(projectId) as RunRow[];
  } catch {
    return [];
  }
}
