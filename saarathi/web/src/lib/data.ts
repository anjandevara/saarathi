import { existsSync } from "node:fs";
import { cookies } from "next/headers";
import { getProjectConfig, getProjectConfigs } from "./config";
import { scanProject } from "./scan";
import { ensureProject, recordRunIfNew, getRunHistory, dbAvailable } from "./db";
import snapshot from "../data/snapshot.json";
import type { Overview, ProjectMeta } from "./types";

// High-level data API used by the pages. Prefers live data scanned from the
// configured Playwright project; falls back to a bundled snapshot so the app
// always renders something real. Persistence to SQLite is best-effort.

// Where the top bar records which project you are looking at. The switcher
// writes it, every server page reads it back.
export const PROJECT_COOKIE = "saarathi.project";

/** The project chosen in the top bar, checked against the real config. */
export async function getCurrentProjectId(): Promise<string> {
  const store = await cookies();
  // An id that is no longer configured falls back to the first project.
  return getProjectConfig(store.get(PROJECT_COOKIE)?.value).id;
}

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
