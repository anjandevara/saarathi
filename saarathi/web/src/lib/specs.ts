import { promises as fs } from "node:fs";
import path from "node:path";
import type { SpecFile, SpecImport, TestCase } from "./types";

// Reads a project's Playwright spec files and reports what is actually in
// them: the tests, their tags, their steps, and what they use. Every field
// comes from the file's own text. Nothing is inferred from a naming
// convention and nothing is filled in when the file does not say it.
//
// ponytail: this reads the source with regular expressions, in the same style
// as scan.ts, rather than parsing TypeScript properly. That is enough for the
// shapes this framework actually writes, and it keeps the app free of the
// TypeScript compiler API. The ceiling: a `test(` inside a comment or a string
// would be counted. The guard for that is honesty, not cleverness. A file that
// looks like a spec but yields no tests is reported unparsed with a note
// instead of rendering as an empty spec. If that guard ever trips on a real
// file, the upgrade path is to parse with the TypeScript compiler API.

// `test(` and `test.skip(` and friends, but never test.describe(, test.step(,
// or the beforeEach hooks. The \s* before the quote is what lets this match
// the long form where the title sits on its own line.
const TEST_CALL = /\btest(?:\.(?:skip|only|fixme|fail|slow))?\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const DESCRIBE_CALL = /\btest\.describe(?:\.\w+)?\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/;
const STEP_CALL = /\btest\.step\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const IMPORT_LINE = /^import\s+(?:(.+?)\s+from\s+)?(['"])(.+?)\2/;
// A tag is @name. @req(...) is a requirement, not a tag, so it is excluded
// here and read separately.
const TAG = /@(?!req\()([a-zA-Z][\w-]*)/g;
const REQ = /@req\(\s*([^)]+?)\s*\)/;
// How data reaches a test in this framework: named through readFixture(), or
// written as a path into the fixtures folder. The path form requires the whole
// string literal to be a path, with no spaces in it. Without that, the word
// "fixtures/test-data.json" inside an Allure description sentence would be
// reported as a data file the test uses, which it is not.
const READ_FIXTURE = /\breadFixture(?:<[^>]*>)?\s*\(\s*(['"`])(.+?)\1/g;
const FIXTURE_PATH = /(['"`])(?:[\w.\-/]*\/)?fixtures\/([\w.\-/]+)\1/g;

function classifyImport(from: string): SpecImport["kind"] {
  if (/(^|\/)pages\//.test(from)) return "page";
  if (/base-test|(^|\/)fixtures\//.test(from)) return "fixture";
  if (/data-reader|(^|\/)data\//.test(from)) return "data";
  return "other";
}

/** The bindings in an import clause, e.g. "{ test, expect }" or "* as path". */
function importedNames(clause: string | undefined): string[] {
  if (!clause) return []; // a side-effect import, e.g. import './setup'
  const braced = clause.match(/\{([^}]*)\}/);
  const names = braced
    ? braced[1].split(",").map((n) => n.split(/\s+as\s+/)[0].trim())
    : [clause.replace(/^\*\s+as\s+/, "").trim()];
  return names.filter(Boolean);
}

function parseImports(text: string): SpecImport[] {
  const out: SpecImport[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(IMPORT_LINE);
    if (!m) continue;
    out.push({ names: importedNames(m[1]), from: m[3], kind: classifyImport(m[3]) });
  }
  return out;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function matchAll(re: RegExp, text: string, group: number): string[] {
  // The globals are module-level, so reset before each use.
  re.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[group]);
  return out;
}

/** Reads a spec file's text. Pure: no filesystem, so tests can call it directly. */
export function parseSpec(text: string, file: string): SpecFile {
  const imports = parseImports(text);
  const describe = text.match(DESCRIBE_CALL);
  const suite = describe ? describe[2] : null;
  const pageClasses = imports.filter((i) => i.kind === "page").flatMap((i) => i.names);

  // Find every test call with its position, so each test's body can be cut at
  // the start of the next one. A step can then never be read into the wrong test.
  TEST_CALL.lastIndex = 0;
  const found: { title: string; at: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = TEST_CALL.exec(text)) !== null) {
    found.push({ title: m[2], at: m.index, end: TEST_CALL.lastIndex });
  }

  const tests: TestCase[] = found.map((f, i) => {
    const body = text.slice(f.end, i + 1 < found.length ? found[i + 1].at : text.length);
    const tags = matchAll(TAG, f.title, 0);
    const req = f.title.match(REQ) ?? body.match(REQ);
    return {
      title: f.title.replace(TAG, "").replace(REQ, "").replace(/\s+/g, " ").trim(),
      tags,
      requirement: req ? req[1] : null,
      steps: matchAll(STEP_CALL, body, 2),
      // A page object counts as used by this test only if its class name really
      // appears in this test's own body.
      pages: pageClasses.filter((c) => new RegExp(`\\b${c}\\b`).test(body)),
      data: unique([...matchAll(READ_FIXTURE, body, 2), ...matchAll(FIXTURE_PATH, body, 2)]),
      line: text.slice(0, f.at).split("\n").length,
    };
  });

  // Data read in the file's setup, before the first test. It is shared by every
  // test in the file, so it is reported here rather than credited to each test,
  // which would claim a test uses data it never touches.
  const setup = text.slice(0, found.length ? found[0].at : text.length);
  const setupData = unique([...matchAll(READ_FIXTURE, setup, 2), ...matchAll(FIXTURE_PATH, setup, 2)]);

  // A file that names test( but gave up nothing is reported, not hidden.
  const looksLikeSpec = /\btest\s*\(|\btest\.describe\s*\(/.test(text);
  return {
    file,
    suite,
    imports,
    tests,
    setupData,
    parsed: tests.length > 0 || !looksLikeSpec,
    note: tests.length === 0 && looksLikeSpec ? "This file looks like a spec but no test could be read from it." : null,
  };
}

/** The testDir from the project's Playwright config, or "tests" if unstated. */
async function findTestDir(dir: string): Promise<string> {
  try {
    const config = await fs.readFile(path.join(dir, "playwright.config.ts"), "utf8");
    const m = config.match(/testDir\s*:\s*(['"])(.+?)\1/);
    return m ? m[2].replace(/^\.\//, "") : "tests";
  } catch {
    return "tests";
  }
}

async function findSpecFiles(root: string, sub = ""): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, sub), { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = sub ? path.join(sub, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...(await findSpecFiles(root, rel)));
    } else if (/\.spec\.[tj]sx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

/** Every spec in the project's test folder, in path order. */
export async function scanSpecs(dir: string): Promise<SpecFile[]> {
  const testDir = await findTestDir(dir);
  const root = path.join(dir, testDir);
  const files = await findSpecFiles(root);
  return Promise.all(
    files.map(async (rel) => {
      const file = path.join(testDir, rel);
      try {
        return parseSpec(await fs.readFile(path.join(root, rel), "utf8"), file);
      } catch (err) {
        // Unreadable is a fact worth showing, not a file to drop silently.
        return {
          file,
          suite: null,
          imports: [],
          tests: [],
          setupData: [],
          parsed: false,
          note: `This file could not be read: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    })
  );
}
