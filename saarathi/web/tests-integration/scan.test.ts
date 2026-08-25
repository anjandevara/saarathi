// Integration tests for the data scanner. These run in Node with no browser
// and no server, so they execute for real. Run: npm run test:integration
import { test } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanProject } from "../src/lib/scan";

const FRAMEWORK = process.env.SAARATHI_PROJECT_PATH || "/root/playwright-framework";

test("scans the real framework: agents, personas, lessons, and consistent run math", async () => {
  // Invariants only against the live folder (its JUnit numbers change over time).
  const o = await scanProject({ id: "pf", name: "Playwright Framework", path: FRAMEWORK, env: "local" });
  assert.equal(o.live, true, "should be live when the folder exists");
  assert.equal(o.agents.length, 6, "six agents");
  assert.ok(o.agents.some((a) => a.persona === "The Diagnostician"), "personas are mapped");
  assert.ok(o.counts.lessons >= 4, "at least 4 engineering lessons captured");
  if (o.run) {
    assert.ok(o.run.total > 0, "a real run has tests");
    assert.ok(o.run.passed >= 0 && o.run.passed <= o.run.total, "passed within bounds");
    assert.equal(o.run.health, Math.round((o.run.passed / o.run.total) * 100), "health equals passed/total");
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(o.run.at), "run.at is a real ISO timestamp (bug 4 fix)");
  }
});

test("parses JUnit numbers exactly and computes health (controlled fixture)", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-junit-"));
  await fs.mkdir(path.join(dir, "reports"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "reports", "junit-results.xml"),
    '<testsuites tests="26" failures="1" errors="0" skipped="1"></testsuites>'
  );
  const o = await scanProject({ id: "j", name: "J", path: dir, env: "local" });
  assert.ok(o.run, "run parsed");
  assert.equal(o.run!.total, 26);
  assert.equal(o.run!.failed, 1, "failures + errors");
  assert.equal(o.run!.passed, 24, "total minus failed minus skipped");
  assert.equal(o.run!.health, 92, "round(24/26*100)");
});

test("nonexistent project degrades safely (no crash, no run, no agents)", async () => {
  const o = await scanProject({ id: "x", name: "X", path: "/tmp/saarathi-does-not-exist-xyz", env: "local" });
  assert.equal(o.live, false);
  assert.equal(o.run, null);
  assert.equal(o.agents.length, 0);
  assert.equal(o.counts.bugs, 0);
  assert.ok(Array.isArray(o.activity) && o.activity.length >= 1, "always returns some activity text");
});

test("counts a real bug from a crafted fixture and ignores the EXAMPLE entry", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-fixture-"));
  await fs.mkdir(path.join(dir, "documents"), { recursive: true });
  await fs.writeFile(path.join(dir, "documents", "bugs.md"), "## EXAMPLE keep me out\n\n## Login button does nothing\nStatus: OPEN\n");
  await fs.writeFile(path.join(dir, "documents", "doubts.md"), "## EXAMPLE only\n");
  await fs.writeFile(path.join(dir, "documents", "recommendations.md"), "");
  const o = await scanProject({ id: "f", name: "F", path: dir, env: "local" });
  assert.equal(o.counts.bugs, 1, "one real open bug counted");
  assert.equal(o.counts.doubts, 0, "only-EXAMPLE doubts count as zero");
  assert.equal(o.counts.recommendations, 0);
});

test("a bug marked FIXED is not counted as an open bug", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-fixed-"));
  await fs.mkdir(path.join(dir, "documents"), { recursive: true });
  await fs.writeFile(path.join(dir, "documents", "bugs.md"), "## Old bug\nStatus: FIXED 2026-01-01\n");
  const o = await scanProject({ id: "g", name: "G", path: dir, env: "local" });
  assert.equal(o.counts.bugs, 0, "FIXED bugs are not open");
});

test("the framework's bold status form is recognized as fixed (bug 11 fix)", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-bold-"));
  await fs.mkdir(path.join(dir, "documents"), { recursive: true });
  await fs.writeFile(path.join(dir, "documents", "bugs.md"), "## Old bug\n**Status:** FIXED 2026-01-01\n");
  const o = await scanProject({ id: "gb", name: "GB", path: dir, env: "local" });
  assert.equal(o.counts.bugs, 0, "bold **Status:** FIXED is resolved, not open");
});

test("an OPEN bug is not hidden just because its body mentions FIXED (bug 11 fix)", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-mention-"));
  await fs.mkdir(path.join(dir, "documents"), { recursive: true });
  // A real open bug whose comment refers to a different, already-fixed bug.
  await fs.writeFile(
    path.join(dir, "documents", "bugs.md"),
    "## Header does not scroll\n**Status:** OPEN\nComment: same corner as bug 3, now FIXED, but this one still repros.\n"
  );
  const o = await scanProject({ id: "gm", name: "GM", path: dir, env: "local" });
  assert.equal(o.counts.bugs, 1, "the word FIXED in a comment must not resolve an OPEN bug");
});
