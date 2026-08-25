// Integration tests for the SQLite-backed registry and run history.
// Runs for real against node:sqlite. Run: npm run test:integration
import { test } from "node:test";
import assert from "node:assert";
import { ensureProject, recordRunIfNew, getRunHistory, dbAvailable } from "../src/lib/db";
import type { RunStats } from "../src/lib/types";

const run = (over: Partial<RunStats> = {}): RunStats => ({
  number: 1, total: 8, passed: 8, failed: 0, flaky: 0, health: 100,
  at: new Date().toISOString(), ...over,
});

test("SQLite is available on this Node runtime", () => {
  assert.equal(dbAvailable(), true, "node:sqlite should be usable on Node 22.16+/24");
});

test("records a run, reads it back, and de-duplicates identical runs", () => {
  const pid = "it-" + Date.now();
  ensureProject({ id: pid, name: "Test", path: "", env: "local" });

  recordRunIfNew(pid, run());
  let hist = getRunHistory(pid);
  assert.equal(hist.length, 1, "one run recorded");
  assert.equal(hist[0].total, 8);
  assert.equal(hist[0].health, 100);

  // Identical run: no new row.
  recordRunIfNew(pid, run());
  hist = getRunHistory(pid);
  assert.equal(hist.length, 1, "identical run is not duplicated");

  // A different result: a new row, newest first.
  recordRunIfNew(pid, run({ passed: 7, failed: 1, health: 88 }));
  hist = getRunHistory(pid);
  assert.equal(hist.length, 2, "a changed run adds a row");
  assert.equal(hist[0].passed, 7, "newest run is first");
  assert.equal(hist[0].failed, 1);
});

test("run history is isolated per project", () => {
  const a = "it-a-" + Date.now();
  const b = "it-b-" + Date.now();
  ensureProject({ id: a, name: "A", path: "", env: "local" });
  ensureProject({ id: b, name: "B", path: "", env: "local" });
  recordRunIfNew(a, run({ total: 10, passed: 10 }));
  assert.equal(getRunHistory(a).length, 1);
  assert.equal(getRunHistory(b).length, 0, "project B has no runs of project A");
});
