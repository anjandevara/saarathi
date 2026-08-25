import type { ProjectMeta } from "./types";

// The projects Saarathi watches. For v0.1 this is a single project, read from
// an environment variable so it works on any machine without editing code.
// Point SAARATHI_PROJECT_PATH at your Playwright framework folder to go live.
// If it is unset or the folder is missing, Saarathi runs on a bundled snapshot.
export function getProjectConfigs(): ProjectMeta[] {
  const p = (process.env.SAARATHI_PROJECT_PATH ?? "").trim();
  const env = (process.env.SAARATHI_ENV ?? "local").trim();
  return [
    { id: "playwright-framework", name: "Playwright Framework", path: p, env },
  ];
}

export function getProjectConfig(id?: string): ProjectMeta {
  const all = getProjectConfigs();
  return all.find((c) => c.id === id) ?? all[0];
}
