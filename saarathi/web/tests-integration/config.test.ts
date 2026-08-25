// Integration tests for the project list loader. These write a real
// saarathi.projects.json into a temp folder and read it back through the real
// code, so nothing here is mocked. Run: npm run test:integration
import { test, afterEach } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { getProjectConfig, getProjectConfigs } from "../src/lib/config";

const HOME = process.cwd();

// The loader reads the file relative to the working directory, so each test
// runs inside a throwaway folder and puts the process back afterwards.
async function inTempDir(contents: string | null): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-config-"));
  if (contents !== null) await fs.writeFile(path.join(dir, "saarathi.projects.json"), contents);
  process.chdir(dir);
}

afterEach(() => process.chdir(HOME));

test("with no file, falls back to the single SAARATHI_PROJECT_PATH project", async () => {
  await inTempDir(null);
  process.env.SAARATHI_PROJECT_PATH = "/some/framework";
  const all = getProjectConfigs();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, "playwright-framework", "the fallback id is the key already in the runs table");
  assert.equal(all[0].path, "/some/framework");
});

test("reads several projects and derives id, name, and env when they are omitted", async () => {
  await inTempDir(
    JSON.stringify([
      { id: "pf", name: "Playwright Framework", path: "/abs/one", env: "local" },
      { path: "/abs/My Shop" },
    ])
  );
  const all = getProjectConfigs();
  assert.equal(all.length, 2);
  assert.equal(all[0].id, "pf");
  assert.equal(all[1].id, "my-shop", "id derived from the folder name");
  assert.equal(all[1].name, "My Shop", "name defaults to the folder name");
  assert.equal(all[1].env, "local", "env defaults to local");
});

test("malformed JSON degrades to the fallback instead of crashing", async () => {
  await inTempDir("{ this is not json");
  process.env.SAARATHI_PROJECT_PATH = "/some/framework";
  const all = getProjectConfigs();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, "playwright-framework");
});

test("a JSON object instead of an array degrades to the fallback", async () => {
  await inTempDir('{"projects": []}');
  const all = getProjectConfigs();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, "playwright-framework");
});

test("skips entries with no path and duplicate ids, keeping the rest", async () => {
  await inTempDir(
    JSON.stringify([
      { id: "keep", path: "/abs/one" },
      { name: "no path here" },
      { id: "keep", path: "/abs/two" },
      { id: "also-keep", path: "/abs/three" },
    ])
  );
  const all = getProjectConfigs();
  assert.deepEqual(all.map((p) => p.id), ["keep", "also-keep"]);
  assert.equal(all[0].path, "/abs/one", "the first entry wins a duplicate id");
});

test("the committed example file parses, and pins this repo to the id its runs are stored under", async () => {
  // Reads the real example file, so this fails if someone edits it into
  // something that does not load, or drops the explicit id. Defaulting the id
  // from the folder name would give "playwright-ai-framework", a different key
  // from the "playwright-framework" the recorded runs already use.
  const example = await fs.readFile(path.join(HOME, "saarathi.projects.example.json"), "utf8");
  await inTempDir(example);
  const all = getProjectConfigs();
  assert.equal(all.length, 2, "both example entries load, so the _comment keys are ignored");
  assert.equal(all[0].id, "playwright-framework", "the example pins this repo's id to its run history");
  assert.equal(all[1].id, "another-project", "the second entry still derives its id from the folder");
});

test("an unknown project id falls back to the first project, never undefined", async () => {
  await inTempDir(JSON.stringify([{ id: "a", path: "/abs/a" }, { id: "b", path: "/abs/b" }]));
  assert.equal(getProjectConfig("b").id, "b", "a configured id is honoured");
  assert.equal(getProjectConfig("gone").id, "a", "a stale cookie value falls back");
  assert.equal(getProjectConfig(undefined).id, "a");
});
