import { existsSync } from "node:fs";
import { getProjectConfig, getProjectConfigs } from "./config";
import { scanProject } from "./scan";
import { ensureProject, recordRunIfNew, getRunHistory, dbAvailable } from "./db";
import snapshot from "../data/snapshot.json";
import type { Overview, ProjectMeta } from "./types";

// High-level data API used by the pages. Prefers live data scanned from the
// configured Playwright project; falls back to a bundled snapshot so the app
// always renders something real. Persistence to SQLite is best-effort.

export async function getProjects(): Promise<ProjectMeta[]> {
  const configs = getProjectConfigs();
  for (const c of configs) ensureProject(c);
  return configs;
}

export async function getOverview(id?: string): Promise<Overview> {
  const cfg = getProjectConfig(id);

  let overview: Overview;
  if (cfg.path && existsSync(cfg.path)) {
    overview = await scanProject(cfg);
  } else {
    overview = { ...(snapshot as Overview), project: cfg };
  }

  ensureProject(cfg);
  if (overview.run) recordRunIfNew(cfg.id, overview.run);

  return overview;
}

export function getHistory(id?: string) {
  const cfg = getProjectConfig(id);
  return getRunHistory(cfg.id);
}

export function isDbLive(): boolean {
  return dbAvailable();
}
