// Integration tests for the data and fixtures inverter and the folder scan.
// buildDataAndFixtures is pure, so most of this runs on hand-built input whose
// answer is known. The last tests run against this repo's real fixtures folder.
// Run: npm run test:integration
import { test } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDataAndFixtures, scanDataFolders } from "../src/lib/fixtures";
import type { ScannedFolder } from "../src/lib/fixtures";
import { parseSpec } from "../src/lib/specs";
import type { SpecFile } from "../src/lib/types";

const FRAMEWORK = process.env.SAARATHI_PROJECT_PATH || "/root/playwright-framework";

function spec(over: Partial<SpecFile>): SpecFile {
  return {
    file: "tests/a.spec.ts",
    suite: null,
    imports: [],
    tests: [],
    setupData: [],
    parsed: true,
    note: null,
    ...over,
  };
}

const FOLDER: ScannedFolder = {
  path: "fixtures",
  files: [
    { rel: "cards.json", bytes: 10 },
    { rel: "files/receipt.pdf", bytes: 20 },
    { rel: "nobody-names-me.json", bytes: 30 },
  ],
  emptySubfolders: ["saved-state"],
};

const SPECS = [
  spec({
    file: "tests/checkout.spec.ts",
    setupData: ["cards.json"],
    tests: [
      { title: "pays", tags: [], requirement: null, steps: [], pages: [], data: ["files/receipt.pdf"], line: 10 },
      { title: "refunds", tags: [], requirement: null, steps: [], pages: [], data: [], line: 20 },
    ],
  }),
];

test("inverts usage: each file lists the tests that name it", () => {
  const out = buildDataAndFixtures(SPECS, [FOLDER]);
  const byRef = Object.fromEntries(out.folders[0].files.map((f) => [f.ref, f]));

  assert.deepEqual(byRef["files/receipt.pdf"].usedBy, [{ spec: "tests/checkout.spec.ts", test: "pays" }]);
  assert.equal(byRef["files/receipt.pdf"].path, "fixtures/files/receipt.pdf", "the path is folder-qualified");
  assert.equal(byRef["files/receipt.pdf"].bytes, 20);
});

test("data read in a spec's setup is credited to the file, not to every test", () => {
  const out = buildDataAndFixtures(SPECS, [FOLDER]);
  const cards = out.folders[0].files.find((f) => f.ref === "cards.json")!;
  assert.deepEqual(cards.usedBy, [{ spec: "tests/checkout.spec.ts", test: null }], "null test means setup");
  assert.ok(
    !cards.usedBy.some((u) => u.test === "refunds"),
    "the refunds test never names cards.json, so it is not credited with it"
  );
});

test("a file no spec names by a literal path has no recorded use", () => {
  const out = buildDataAndFixtures(SPECS, [FOLDER]);
  const orphan = out.folders[0].files.find((f) => f.ref === "nobody-names-me.json")!;
  assert.deepEqual(orphan.usedBy, [], "empty usedBy is the whole claim, nothing stronger");
});

test("matching is exact, never on file name alone", () => {
  // A spec naming a bare "receipt.pdf" must not be credited to files/receipt.pdf,
  // because two folders can hold the same name and a near-miss would invent a use.
  const out = buildDataAndFixtures(
    [spec({ tests: [{ title: "t", tags: [], requirement: null, steps: [], pages: [], data: ["receipt.pdf"], line: 1 }] })],
    [FOLDER]
  );
  assert.deepEqual(out.folders[0].files.find((f) => f.ref === "files/receipt.pdf")!.usedBy, []);
  assert.deepEqual(out.missing, ["receipt.pdf"], "instead it is reported as named but not found");
});

test("a folder-qualified reference matches the same file", () => {
  const out = buildDataAndFixtures(
    [spec({ setupData: ["fixtures/cards.json"] })],
    [FOLDER]
  );
  assert.equal(out.folders[0].files.find((f) => f.ref === "cards.json")!.usedBy.length, 1);
  assert.deepEqual(out.missing, [], "it is not also reported as missing");
});

test("a file a spec names but which is not on disk is reported as missing", () => {
  const out = buildDataAndFixtures([spec({ setupData: ["gone.json"] })], [FOLDER]);
  assert.deepEqual(out.missing, ["gone.json"]);
});

test("fixture modules are the code a spec imports its test object from", () => {
  const out = buildDataAndFixtures(
    [
      spec({ file: "tests/a.spec.ts", imports: [{ names: ["test"], from: "../support/base-test", kind: "fixture" }] }),
      spec({ file: "tests/b.spec.ts", imports: [{ names: ["test"], from: "../support/base-test", kind: "fixture" }] }),
      spec({ file: "tests/c.spec.ts", imports: [{ names: ["path"], from: "path", kind: "other" }] }),
    ],
    []
  );
  assert.deepEqual(out.fixtureModules, [
    { from: "../support/base-test", specs: ["tests/a.spec.ts", "tests/b.spec.ts"] },
  ]);
});

test("the folder scan reports only folders that exist, and skips dotfile placeholders", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-fixtures-"));
  await fs.mkdir(path.join(dir, "fixtures", "saved-state"), { recursive: true });
  await fs.writeFile(path.join(dir, "fixtures", "one.json"), "{}");
  await fs.writeFile(path.join(dir, "fixtures", "saved-state", ".gitkeep"), "placeholder");

  const folders = await scanDataFolders(dir);
  assert.deepEqual(folders.map((f) => f.path), ["fixtures"], "no data/ section is invented for a folder that is absent");
  assert.deepEqual(folders[0].files.map((f) => f.rel), ["one.json"], ".gitkeep is a placeholder, not test data");
  assert.deepEqual(folders[0].emptySubfolders, ["saved-state"], "a real folder holding no data is still reported");
});

test("a project with no data folder at all yields nothing rather than an empty section", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saarathi-nodata-"));
  assert.deepEqual(await scanDataFolders(dir), []);
});

test("reads this repo's real fixtures folder and matches what is actually in it", async () => {
  const folders = await scanDataFolders(FRAMEWORK);
  assert.deepEqual(folders.map((f) => f.path), ["fixtures"], "this repo keeps its data in fixtures/, and has no data/");

  const demo = parseSpec(
    await fs.readFile(path.join(FRAMEWORK, "tests/demo/demo.spec.ts"), "utf8"),
    "tests/demo/demo.spec.ts"
  );
  const out = buildDataAndFixtures([demo], folders);
  const byRef = Object.fromEntries(out.folders[0].files.map((f) => [f.ref, f]));

  assert.ok(byRef["test-data.json"], "fixtures/test-data.json exists");
  assert.deepEqual(
    byRef["test-data.json"].usedBy,
    [{ spec: "tests/demo/demo.spec.ts", test: null }],
    "it is read in beforeAll, so it belongs to the file, not to any one test"
  );
  assert.deepEqual(
    byRef["files/sample-resume.txt"].usedBy.map((u) => u.test),
    ["uploads a resume file wrapped in a label"],
    "exactly one test names the resume file"
  );
  assert.deepEqual(
    byRef["users.json"].usedBy,
    [],
    "fixtures/users.json is named by no literal path in the demo spec"
  );
  assert.deepEqual(out.missing, [], "the demo spec names no file that is absent from disk");
  assert.deepEqual(out.folders[0].emptySubfolders, ["saved-state"]);
});
