import fs from "node:fs";
import path from "node:path";
import type { ProjectMeta } from "./types";

// The projects Saarathi watches. The list lives in saarathi.projects.json at
// the app root: easy to hand-edit, diffable, and the same seam the Phase 5
// Settings screen will read and write. The file holds machine-specific
// absolute paths, so it is gitignored; saarathi.projects.example.json shows
// the shape. If the file is missing or malformed, Saarathi logs it and falls
// back to the single project named by SAARATHI_PROJECT_PATH, so a bad file can
// never crash the app and the simplest one-project setup stays one line.

const CONFIG_FILE = "saarathi.projects.json";

function warn(message: string): void {
  console.warn(`Saarathi: ${CONFIG_FILE} ${message}`);
}

function defaultEnv(): string {
  return (process.env.SAARATHI_ENV ?? "").trim() || "local";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// The original single-project setup. Its id is the primary key of every row
// already in the projects and runs tables, so it must not change.
function envProject(): ProjectMeta[] {
  return [
    {
      id: "playwright-framework",
      name: "Playwright Framework",
      path: str(process.env.SAARATHI_PROJECT_PATH),
      env: defaultEnv(),
    },
  ];
}

// Returns null whenever the file cannot give us at least one usable project,
// which is the caller's signal to fall back.
function readConfigFile(): ProjectMeta[] | null {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), CONFIG_FILE), "utf8");
  } catch {
    return null; // no file at all is the normal single-project case, not an error
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warn("is not valid JSON, falling back to SAARATHI_PROJECT_PATH");
    return null;
  }
  if (!Array.isArray(parsed)) {
    warn("must contain a JSON array of projects, falling back to SAARATHI_PROJECT_PATH");
    return null;
  }

  const projects: ProjectMeta[] = [];
  const seen = new Set<string>();
  for (const entry of parsed as Record<string, unknown>[]) {
    const p = str(entry?.path);
    if (!p) {
      warn('has an entry with no "path", skipping it');
      continue;
    }
    const base = path.basename(p);
    const id = str(entry?.id) || slug(base);
    if (!id) {
      warn(`cannot derive an id for "${p}", give it an explicit "id", skipping it`);
      continue;
    }
    if (seen.has(id)) {
      warn(`lists id "${id}" more than once, skipping the duplicate`);
      continue;
    }
    seen.add(id);
    projects.push({ id, name: str(entry?.name) || base, path: p, env: str(entry?.env) || defaultEnv() });
  }

  if (projects.length === 0) {
    warn("has no usable projects, falling back to SAARATHI_PROJECT_PATH");
    return null;
  }
  return projects;
}

export function getProjectConfigs(): ProjectMeta[] {
  return readConfigFile() ?? envProject();
}

export function getProjectConfig(id?: string): ProjectMeta {
  const all = getProjectConfigs();
  return all.find((c) => c.id === id) ?? all[0];
}
