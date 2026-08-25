import { promises as fs } from "node:fs";
import path from "node:path";
import { personaFor } from "./personas";
import type { Agent, Overview, ProjectMeta, RunStats, Signal, SignalKind } from "./types";

// Reads the real state of a Playwright framework project from disk.
// Every number here comes from the project's own files, never invented.

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readText(p: string): Promise<string | null> {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

/** Parse the agent files under .claude/agents into named, persona-tagged agents. */
async function scanAgents(dir: string): Promise<Agent[]> {
  const agentsDir = path.join(dir, ".claude", "agents");
  if (!(await exists(agentsDir))) return [];
  const entries = await fs.readdir(agentsDir);
  const files = entries.filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const agents: Agent[] = [];
  for (const file of files.sort()) {
    const key = file.replace(/\.md$/, "");
    const text = (await readText(path.join(agentsDir, file))) ?? "";
    const descMatch = text.match(/^description:\s*(.+)$/m);
    const description = descMatch ? descMatch[1].trim() : "";
    const { name, persona } = personaFor(key);
    // Nothing is running in a static scan, so every agent reads idle.
    agents.push({ key, name, persona, description, state: "idle", statusLabel: "idle" });
  }
  return agents;
}

/** Parse the JUnit results file into a run summary. */
async function scanRun(dir: string): Promise<RunStats | null> {
  const junitPath = path.join(dir, "reports", "junit-results.xml");
  const junit = await readText(junitPath);
  if (!junit) return null;
  const num = (attr: string): number => {
    const m = junit.match(new RegExp(`${attr}="(\\d+)"`));
    return m ? parseInt(m[1], 10) : 0;
  };
  const total = num("tests");
  if (total === 0) return null;
  const failed = num("failures") + num("errors");
  const skipped = num("skipped");
  const flaky = 0; // JUnit does not encode flakiness directly
  const passed = Math.max(0, total - failed - skipped);
  const health = Math.round((passed / total) * 100);
  // The real run time is the JUnit file's last-modified time, not "now",
  // so the run history shows when the suite actually ran. Bug 4 fix.
  let at: string;
  try {
    at = (await fs.stat(junitPath)).mtime.toISOString();
  } catch {
    at = new Date().toISOString();
  }
  return { number: 1, total, passed, failed, flaky, health, at };
}

/** Count entries in a documents/*.md file, skipping the seeded EXAMPLE row. */
function parseDocEntries(text: string | null, kind: SignalKind): Signal[] {
  if (!text) return [];
  const sections = text.split(/^## /m).slice(1);
  const out: Signal[] = [];
  for (const s of sections) {
    const title = s.split("\n")[0].trim();
    if (/^EXAMPLE/i.test(title)) continue;
    // A bug is resolved only when its own Status line says so. The regex allows
    // the framework's bold markdown form ("**Status:** FIXED 2026-01-01") as well
    // as a plain "Status: fixed". It must NOT match the bare word FIXED anywhere
    // in the body, or an open bug whose comment mentions another fixed bug would
    // be silently hidden from the count. Bug 11 fix.
    const isFixed = /status:\s*\**\s*fixed/i.test(s);
    out.push({ kind, title, status: isFixed ? "resolved" : "open" });
  }
  return out;
}

/** Parse LESSONS.md headings as real, captured engineering lessons. */
async function scanLessons(dir: string): Promise<Signal[]> {
  const text = await readText(path.join(dir, "LESSONS.md"));
  if (!text) return [];
  const sections = text.split(/^## /m).slice(1);
  return sections
    .map((s) => s.split("\n")[0].trim())
    .filter((t) => t && !/^honest limits/i.test(t))
    .map((title) => ({ kind: "lesson" as SignalKind, title, status: "captured" }));
}

export async function scanProject(meta: ProjectMeta): Promise<Overview> {
  const dir = meta.path;
  const live = await exists(dir);

  const [agents, run, bugsText, doubtsText, recsText, lessons] = await Promise.all([
    scanAgents(dir),
    scanRun(dir),
    readText(path.join(dir, "documents", "bugs.md")),
    readText(path.join(dir, "documents", "doubts.md")),
    readText(path.join(dir, "documents", "recommendations.md")),
    scanLessons(dir),
  ]);

  const bugs = parseDocEntries(bugsText, "bug").filter((s) => s.status === "open");
  const doubts = parseDocEntries(doubtsText, "doubt").filter((s) => s.status === "open");
  const recs = parseDocEntries(recsText, "recommendation");

  const signals = [...bugs, ...doubts, ...recs, ...lessons];

  const activity: string[] = [];
  if (run) activity.push(`Suite health ${run.health} percent, ${run.passed} of ${run.total} passing`);
  for (const l of lessons.slice(0, 3)) activity.push(`Lesson captured: ${l.title}`);
  if (activity.length === 0) activity.push("No activity recorded yet for this project");

  return {
    project: meta,
    run,
    agents,
    signals,
    counts: { bugs: bugs.length, doubts: doubts.length, recommendations: recs.length, lessons: lessons.length },
    activity,
    live,
  };
}
