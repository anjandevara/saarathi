import type { RunRow } from "./db";
import type { Overview, ProjectMeta, Signal, SignalKind } from "./types";

// Report builders. Every function here is pure: it reads the mirror data the
// app already holds, the recorded run history and the current scan, and does
// no I/O of its own. Callers gather the data, these functions shape it.
//
// The honesty rule that shapes this whole file: run history is written only
// when a suite runs and Saarathi reads the result, not continuously. So most
// days will have no row. A period with no recorded run carries a null run and
// reads "no run" everywhere it is shown. Nothing here interpolates, carries a
// number forward, or fills a gap. The scheduled scan that would close those
// gaps arrives in a later phase.

export type ReportView = "daily" | "weekly" | "pending" | "projects";

export const VIEWS: { view: ReportView; label: string }[] = [
  { view: "daily", label: "Daily" },
  { view: "weekly", label: "Weekly" },
  { view: "pending", label: "Pending" },
  { view: "projects", label: "Projects" },
];

export function isReportView(value: string | undefined): value is ReportView {
  return VIEWS.some((v) => v.view === value);
}

export interface Period {
  label: string;
  runs: number;
  latest: RunRow | null; // null means no run recorded, never zero
}

export interface Pending {
  bugs: Signal[];
  doubts: Signal[];
  recommendations: Signal[];
}

export interface ProjectLine {
  project: ProjectMeta;
  live: boolean; // false when the configured path is not on this machine
  latest: RunRow | null;
  // null when the project was not read. A project whose folder is missing
  // falls back to the bundled snapshot, whose counts belong to the demo and
  // not to that project, so they must never be printed as its own.
  open: { bugs: number; doubts: number; recommendations: number } | null;
}

export interface Report {
  view: ReportView;
  project: ProjectMeta;
  generatedAt: Date;
  summary: string;
  periods: Period[]; // daily and weekly only
  pending: Pending | null; // pending only
  projects: ProjectLine[]; // projects only
}

/* Dates are handled in local time, because a report about "today" means the
   reader's today, not UTC's. */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The Monday of the week d falls in. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
}

function time(row: RunRow): number {
  return new Date(row.at).getTime();
}

function periodFor(rows: RunRow[], start: Date, end: Date, label: string): Period {
  // A row whose timestamp will not parse cannot honestly be placed on a day,
  // so it is left out of every bucket rather than guessed into one.
  const inPeriod = rows.filter((r) => {
    const t = time(r);
    return !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
  });
  // The period's latest run represents it. Adding several runs together would
  // count the same tests more than once, which would be an invented number.
  const latest = inPeriod.reduce<RunRow | null>((best, r) => (!best || time(r) >= time(best) ? r : best), null);
  return { label, runs: inPeriod.length, latest };
}

/** Newest day first. Always returns exactly `days` entries, gaps included. */
export function buildDaily(rows: RunRow[], now: Date, days = 14): Period[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const start = addDays(today, -i);
    return periodFor(rows, start, addDays(start, 1), dayKey(start));
  });
}

/** Newest week first. Always returns exactly `weeks` entries, gaps included. */
export function buildWeekly(rows: RunRow[], now: Date, weeks = 8): Period[] {
  const thisWeek = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * i);
    return periodFor(rows, start, addDays(start, 7), `Week of ${dayKey(start)}`);
  });
}

export function buildPending(overview: Overview): Pending {
  const open = (kind: SignalKind) => overview.signals.filter((s) => s.kind === kind && s.status === "open");
  return { bugs: open("bug"), doubts: open("doubt"), recommendations: open("recommendation") };
}

/** One line per period, or the words "no run". Never a zero standing in for a gap. */
export function resultText(latest: RunRow | null): string {
  if (!latest) return "no run";
  return `${latest.total} tests, ${latest.passed} passed, ${latest.failed} failed, ${latest.health} percent`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// House style: plain words, main point first, no long dashes. Short on purpose.
function summarize(view: ReportView, periods: Period[], pending: Pending | null, projects: ProjectLine[]): string {
  if (view === "daily" || view === "weekly") {
    const unit = view === "daily" ? "day" : "week";
    const withRun = periods.filter((p) => p.latest);
    if (withRun.length === 0) return `No run recorded in the last ${plural(periods.length, unit)}.`;
    const verb = withRun.length === 1 ? "has" : "have";
    return `${withRun.length} of the last ${plural(periods.length, unit)} ${verb} a recorded run. Latest: ${resultText(withRun[0].latest)}.`;
  }
  if (view === "pending" && pending) {
    const total = pending.bugs.length + pending.doubts.length + pending.recommendations.length;
    if (total === 0) return "Nothing pending.";
    return `${plural(total, "item")} pending: ${plural(pending.bugs.length, "bug")}, ${plural(pending.doubts.length, "doubt")}, ${plural(pending.recommendations.length, "recommendation")}.`;
  }
  const withRun = projects.filter((p) => p.latest).length;
  return `${plural(projects.length, "project")} configured, ${withRun} with a recorded run.`;
}

export function buildReport(input: {
  view: ReportView;
  project: ProjectMeta;
  now: Date;
  rows: RunRow[];
  overview: Overview;
  projects: ProjectLine[];
}): Report {
  const { view, project, now, rows, overview, projects } = input;
  const periods = view === "daily" ? buildDaily(rows, now) : view === "weekly" ? buildWeekly(rows, now) : [];
  const pending = view === "pending" ? buildPending(overview) : null;
  const lines = view === "projects" ? projects : [];
  return {
    view,
    project,
    generatedAt: now,
    summary: summarize(view, periods, pending, lines),
    periods,
    pending,
    projects: lines,
  };
}

function stamp(d: Date): string {
  return `${dayKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function signalList(items: Signal[]): string[] {
  if (items.length === 0) return ["None."];
  return items.map((s) => `- ${s.title}`);
}

export function reportToMarkdown(report: Report): string {
  const title = VIEWS.find((v) => v.view === report.view)?.label ?? report.view;
  const lines = [
    `# Saarathi ${title.toLowerCase()} report`,
    "",
    `Project: ${report.project.name} (${report.project.env})`,
    `Generated: ${stamp(report.generatedAt)}`,
    "",
    report.summary,
    "",
  ];

  if (report.view === "daily" || report.view === "weekly") {
    lines.push(`| ${report.view === "daily" ? "Day" : "Week"} | Runs | Result |`, "| --- | ---: | --- |");
    for (const p of report.periods) lines.push(`| ${p.label} | ${p.runs} | ${resultText(p.latest)} |`);
    lines.push(
      "",
      "A period with no recorded run reads \"no run\". Run history is written only when a suite runs and Saarathi reads it, so gaps are real gaps, not missing data."
    );
  }

  if (report.view === "pending" && report.pending) {
    lines.push(`## Bugs (${report.pending.bugs.length})`, "", ...signalList(report.pending.bugs), "");
    lines.push(`## Doubts (${report.pending.doubts.length})`, "", ...signalList(report.pending.doubts), "");
    lines.push(
      `## Recommendations (${report.pending.recommendations.length})`,
      "",
      ...signalList(report.pending.recommendations),
      ""
    );
  }

  if (report.view === "projects") {
    lines.push("| Project | Env | Latest run | Bugs | Doubts | Recommendations |", "| --- | --- | --- | ---: | ---: | ---: |");
    for (const p of report.projects) {
      const run = p.live ? resultText(p.latest) : "path not found on this machine";
      const n = (pick: (o: NonNullable<ProjectLine["open"]>) => number) => (p.open ? String(pick(p.open)) : "not read");
      lines.push(
        `| ${p.project.name} | ${p.project.env} | ${run} | ${n((o) => o.bugs)} | ${n((o) => o.doubts)} | ${n((o) => o.recommendations)} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

/** A filename that says what the file is without being opened. */
export function reportFileName(report: Report): string {
  return `saarathi-${report.project.id}-${report.view}-${dayKey(report.generatedAt)}.md`;
}
