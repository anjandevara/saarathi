import { existsSync } from "node:fs";
import { cookies } from "next/headers";
import { getProjectConfig, getProjectConfigs } from "./config";
import { scanProject } from "./scan";
import { ensureProject, recordRunIfNew, getRunHistory, dbAvailable } from "./db";
import { buildPending, buildReport } from "./report";
import { scanSpecs } from "./specs";
import snapshot from "../data/snapshot.json";
import type { Report, ProjectLine, ReportView } from "./report";
import type { Overview, ProjectMeta, SpecFile } from "./types";

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

/**
 * The project's spec files, read from the code. An empty list means the project
 * has no specs where its Playwright config says they live, which is a fact
 * worth showing rather than a reason to fall back to the snapshot.
 */
export async function getSpecs(id?: string): Promise<SpecFile[]> {
  const cfg = getProjectConfig(id);
  if (!cfg.path || !existsSync(cfg.path)) return [];
  return scanSpecs(cfg.path);
}

export function isDbLive(): boolean {
  return dbAvailable();
}

async function getProjectLines(): Promise<ProjectLine[]> {
  return Promise.all(
    getProjectConfigs().map(async (c) => {
      const o = await getOverview(c.id);
      return {
        project: c,
        live: o.live,
        latest: getRunHistory(c.id, 1)[0] ?? null,
        // A project whose folder is not on this machine falls back to the
        // bundled snapshot, whose counts describe the demo and not that
        // project. Report nothing rather than someone else's numbers.
        open: o.live
          ? {
              bugs: o.counts.bugs,
              doubts: o.counts.doubts,
              // counts.recommendations includes the implemented ones, and this
              // column is about what is still pending, so count the open ones.
              recommendations: buildPending(o).recommendations.length,
            }
          : null,
      };
    })
  );
}

/** Gathers the mirror data one report view needs, then shapes it in report.ts. */
export async function getReport(view: ReportView, projectId?: string, now = new Date()): Promise<Report> {
  const project = getProjectConfig(projectId);
  const overview = await getOverview(project.id);
  // ponytail: reads the recent rows and buckets them in memory, which is fine
  // for a local single-file database. Push the bucketing into SQL if a project
  // ever records more runs than this.
  const rows = view === "daily" || view === "weekly" ? getRunHistory(project.id, 500) : [];
  const projects = view === "projects" ? await getProjectLines() : [];
  return buildReport({ view, project, now, rows, overview, projects });
}
