// Integration tests for the report builders. These are pure functions over the
// mirror data, so they run for real with no server and no database.
// The rule under test throughout: a period with no recorded run says "no run".
// Run: npm run test:integration
import { test } from "node:test";
import assert from "node:assert";
import { buildDaily, buildPending, buildReport, buildWeekly, reportToMarkdown, resultText } from "../src/lib/report";
import type { RunRow } from "../src/lib/db";
import type { Overview, ProjectMeta, Signal } from "../src/lib/types";

const PROJECT: ProjectMeta = { id: "pf", name: "Playwright Framework", path: "/abs/pf", env: "local" };

// A fixed local noon, so a test never depends on the hour it runs at and never
// slips across a day boundary.
const NOW = new Date(2026, 7, 25, 12, 0, 0); // 2026-08-25 is a Tuesday

function row(over: Partial<RunRow> & { at: string }): RunRow {
  return { id: 1, projectId: "pf", total: 26, passed: 24, failed: 2, flaky: 0, health: 92, ...over };
}

function overview(signals: Signal[]): Overview {
  return {
    project: PROJECT,
    run: null,
    agents: [],
    signals,
    counts: { bugs: 0, doubts: 0, recommendations: 0, lessons: 0 },
    activity: [],
    live: true,
  };
}

const report = (view: "daily" | "weekly" | "pending" | "projects", rows: RunRow[], signals: Signal[] = []) =>
  buildReport({ view, project: PROJECT, now: NOW, rows, overview: overview(signals), projects: [] });

test("an empty history produces every day as no run, and never a zero", () => {
  const days = buildDaily([], NOW);
  assert.equal(days.length, 14, "the window is always complete, gaps included");
  assert.ok(days.every((d) => d.latest === null), "every day has no run");
  assert.ok(days.every((d) => d.runs === 0));
  assert.equal(resultText(days[0].latest), "no run");
});

test("a run lands on its own local day and leaves the neighbouring days empty", () => {
  const days = buildDaily([row({ at: new Date(2026, 7, 24, 9, 30).toISOString() })], NOW);
  assert.equal(days[0].label, "2026-08-25", "newest day first");
  assert.equal(days[0].latest, null, "today still has no run");
  assert.equal(days[1].label, "2026-08-24");
  assert.equal(days[1].runs, 1);
  assert.equal(resultText(days[1].latest), "26 tests, 24 passed, 2 failed, 92 percent");
  assert.equal(days[2].latest, null, "the day before is untouched, not carried forward");
});

test("two runs in one day report the latest, never the sum", () => {
  const days = buildDaily(
    [
      row({ id: 1, at: new Date(2026, 7, 25, 8, 0).toISOString(), total: 26, passed: 20, failed: 6, health: 77 }),
      row({ id: 2, at: new Date(2026, 7, 25, 17, 0).toISOString(), total: 26, passed: 26, failed: 0, health: 100 }),
    ],
    NOW
  );
  assert.equal(days[0].runs, 2, "both runs are counted");
  assert.equal(days[0].latest!.health, 100, "the later run represents the day");
  assert.equal(days[0].latest!.total, 26, "totals are not added together");
});

test("weeks start on Monday and a run falls in the right week", () => {
  // 2026-08-25 is a Tuesday, so its week starts Monday 2026-08-24.
  const weeks = buildWeekly([row({ at: new Date(2026, 7, 24, 9, 0).toISOString() })], NOW);
  assert.equal(weeks[0].label, "Week of 2026-08-24");
  assert.equal(weeks[0].runs, 1, "Monday belongs to this week");
  assert.equal(weeks[1].label, "Week of 2026-08-17");
  assert.equal(weeks[1].latest, null, "last week has no run");
});

test("a run just before midnight Sunday belongs to the previous week, not this one", () => {
  const weeks = buildWeekly([row({ at: new Date(2026, 7, 23, 23, 59).toISOString() })], NOW);
  assert.equal(weeks[0].runs, 0, "Sunday is not part of the Monday week that follows");
  assert.equal(weeks[1].runs, 1);
});

test("a row with an unparsable timestamp is left out rather than guessed into a day", () => {
  const days = buildDaily([row({ at: "not a date" })], NOW);
  assert.ok(days.every((d) => d.runs === 0), "it is placed in no bucket at all");
});

test("pending counts only what is still open", () => {
  const pending = buildPending(
    overview([
      { kind: "bug", title: "Checkout total is wrong", status: "open" },
      { kind: "recommendation", title: "Already done", status: "resolved" },
      { kind: "recommendation", title: "Still to do", status: "open" },
      { kind: "lesson", title: "Not pending work", status: "captured" },
    ])
  );
  assert.equal(pending.bugs.length, 1);
  assert.equal(pending.doubts.length, 0);
  assert.deepEqual(pending.recommendations.map((r) => r.title), ["Still to do"], "a resolved recommendation is not pending");
});

test("the summary states the gap plainly and invents no number", () => {
  assert.equal(report("daily", []).summary, "No run recorded in the last 14 days.");
  assert.equal(
    report("daily", [row({ at: new Date(2026, 7, 25, 8, 0).toISOString() })]).summary,
    "1 of the last 14 days has a recorded run. Latest: 26 tests, 24 passed, 2 failed, 92 percent."
  );
  assert.equal(report("pending", []).summary, "Nothing pending.");
  assert.equal(
    report("pending", [], [{ kind: "bug", title: "One", status: "open" }]).summary,
    "1 item pending: 1 bug, 0 doubts, 0 recommendations."
  );
});

test("the markdown export says no run for every gap and uses no long dashes", () => {
  const md = reportToMarkdown(report("daily", [row({ at: new Date(2026, 7, 25, 8, 0).toISOString() })]));
  assert.ok(md.startsWith("# Saarathi daily report"), "has a title");
  assert.ok(md.includes("Project: Playwright Framework (local)"));
  assert.ok(md.includes("| 2026-08-25 | 1 | 26 tests, 24 passed, 2 failed, 92 percent |"), "the real run is reported");
  assert.equal((md.match(/\| no run \|/g) ?? []).length, 13, "the other 13 days each say no run");
  assert.ok(!/\d+%/.test(md), "health is written in words, matching house style");
  assert.ok(!/[—–]/.test(md), "no em-dashes or en-dashes anywhere");
});

test("the pending markdown says None rather than leaving a section blank", () => {
  const md = reportToMarkdown(report("pending", [], [{ kind: "doubt", title: "Is this flaky", status: "open" }]));
  assert.ok(md.includes("## Bugs (0)"));
  assert.ok(md.includes("None."), "an empty section is stated, not omitted");
  assert.ok(md.includes("- Is this flaky"));
});

test("a project whose folder is missing reports that, and never the snapshot's numbers", () => {
  const missing = { id: "gone", name: "Gone", path: "/not/here", env: "local" };
  const built = buildReport({
    view: "projects",
    project: PROJECT,
    now: NOW,
    rows: [],
    overview: overview([]),
    projects: [{ project: missing, live: false, latest: null, open: null }],
  });
  const md = reportToMarkdown(built);
  assert.ok(md.includes("path not found on this machine"), "the reason is stated");
  assert.ok(md.includes("| not read |"), "counts are withheld, not printed as zero");
  assert.ok(!md.includes("| 0 |"), "a zero would be a claim about a project we did not read");
});
