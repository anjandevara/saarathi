// Integration tests for the spec parser. parseSpec is pure, so most of this
// runs against a fixture whose exact contents are known. The last tests run
// against the real tests/ folder of this repo.
// Run: npm run test:integration
import { test } from "node:test";
import assert from "node:assert";
import { parseSpec, scanSpecs } from "../src/lib/specs";

const FRAMEWORK = process.env.SAARATHI_PROJECT_PATH || "/root/playwright-framework";

// Deliberately written in every shape the real specs use: a single-line test,
// a test whose title sits on its own line, a skipped test, a describe wrapper,
// a step inside beforeEach that belongs to no test, and an Allure description
// that mentions a fixtures path in prose without using it.
const FIXTURE = `
import { test, expect } from '../../support/base-test';
import { epic } from 'allure-js-commons';
import { CheckoutPage } from '../../pages/03-checkout.page';
import { readFixture } from '../../support/data-reader';
import * as path from 'path';

test.describe('Checkout: payment flows', () => {
  let data: unknown;

  test.beforeAll(async () => {
    data = readFixture('cards.json');
  });

  test.beforeEach(async ({ page }) => {
    await test.step('This step belongs to no test', async () => {});
  });

  test('pays with a saved card @smoke @crud @req(PAY-1)', async ({ page, logger }) => {
    await epic('Checkout');
    await description('HOW: read values from fixtures/not-really-used.json.');
    const checkout = new CheckoutPage(page, logger);
    await test.step('Given I am on the checkout page', async () => {});
    await test.step('When I pay with the saved card', async () => {});
    await test.step('Then the order is confirmed', async () => {});
  });

  test(
    'rejects an expired card @regression @crud',
    async ({ page, logger }) => {
      const checkout = new CheckoutPage(page, logger);
      const receipt = path.resolve(__dirname, '../../fixtures/files/receipt.pdf');
      await test.step('When I pay with an expired card', async () => {});
      await test.step('Then I am told the card expired', async () => {});
    }
  );

  test.skip('not ready yet @regression', async ({ page }) => {
    await test.step('When the feature exists', async () => {});
  });
});
`;

const parsed = parseSpec(FIXTURE, "tests/checkout/checkout.spec.ts");

test("reads every test in the file, in both of the shapes the framework writes", () => {
  assert.equal(parsed.tests.length, 3, "the single-line, the title-on-its-own-line, and the skipped one");
  assert.deepEqual(
    parsed.tests.map((t) => t.title),
    ["pays with a saved card", "rejects an expired card", "not ready yet"],
    "titles are reported with their tags stripped off"
  );
  assert.equal(parsed.suite, "Checkout: payment flows");
  assert.equal(parsed.parsed, true);
  assert.equal(parsed.note, null);
});

test("reads tags exactly as written and never invents one", () => {
  assert.deepEqual(parsed.tests[0].tags, ["@smoke", "@crud"], "@req is not a tag");
  assert.deepEqual(parsed.tests[1].tags, ["@regression", "@crud"]);
  assert.deepEqual(parsed.tests[2].tags, ["@regression"]);
});

test("captures a @req annotation and reports null when a test has none", () => {
  assert.equal(parsed.tests[0].requirement, "PAY-1");
  assert.equal(parsed.tests[1].requirement, null, "no annotation means null, not an empty string");
});

test("reads the Given/When/Then steps of each test, and none belonging to another", () => {
  assert.deepEqual(parsed.tests[0].steps, [
    "Given I am on the checkout page",
    "When I pay with the saved card",
    "Then the order is confirmed",
  ]);
  assert.equal(parsed.tests[1].steps.length, 2, "steps stop at the next test, they do not run on");
  assert.ok(
    !parsed.tests[0].steps.includes("This step belongs to no test"),
    "a step in beforeEach is not credited to the first test"
  );
});

test("classifies imports by what they really are", () => {
  const byKind = (kind: string) => parsed.imports.filter((i) => i.kind === kind).map((i) => i.from);
  assert.deepEqual(byKind("page"), ["../../pages/03-checkout.page"]);
  assert.deepEqual(byKind("fixture"), ["../../support/base-test"]);
  assert.deepEqual(byKind("data"), ["../../support/data-reader"]);
  assert.deepEqual(byKind("other"), ["allure-js-commons", "path"], "unknown paths are other, not guessed");
  assert.deepEqual(
    parsed.imports.find((i) => i.kind === "page")!.names,
    ["CheckoutPage"],
    "the imported binding is captured, not the file name"
  );
});

test("credits a page object only to the tests that really use it", () => {
  assert.deepEqual(parsed.tests[0].pages, ["CheckoutPage"]);
  assert.deepEqual(parsed.tests[1].pages, ["CheckoutPage"]);
  assert.deepEqual(parsed.tests[2].pages, [], "the skipped test never names the page object");
});

test("reports data a test really uses, and not a fixtures path merely mentioned in prose", () => {
  assert.deepEqual(parsed.setupData, ["cards.json"], "what beforeAll reads is setup data, shared by the file");
  assert.deepEqual(parsed.tests[1].data, ["files/receipt.pdf"], "a real path literal is captured");
  assert.deepEqual(
    parsed.tests[0].data,
    [],
    "fixtures/not-really-used.json appears only inside an English sentence, so it is not data this test uses"
  );
});

test("a file that looks like a spec but yields no test is reported, not shown as empty", () => {
  const empty = parseSpec("test.describe('Nothing here', () => {});", "tests/empty.spec.ts");
  assert.equal(empty.tests.length, 0);
  assert.equal(empty.parsed, false, "it is flagged rather than rendered as a spec with no tests");
  assert.ok(empty.note && empty.note.length > 0, "and it says why");
});

test("a file with no tests and no spec shapes is simply empty, not an error", () => {
  const plain = parseSpec("export const helper = 1;\n", "tests/helper.ts");
  assert.equal(plain.parsed, true);
  assert.equal(plain.note, null);
  assert.equal(plain.tests.length, 0);
});

test("scans the real tests folder of this repo and matches what is actually in it", async () => {
  const specs = await scanSpecs(FRAMEWORK);
  assert.equal(specs.length, 2, "this repo has exactly two spec files");
  assert.ok(specs.every((s) => s.parsed), "both parse");

  const demo = specs.find((s) => s.file.includes("demo.spec.ts"))!;
  const saarathi = specs.find((s) => s.file.includes("saarathi.spec.ts"))!;
  assert.equal(demo.tests.length, 8, "the demo spec has eight tests");
  assert.equal(saarathi.tests.length, 4, "the saarathi spec has four tests");
  assert.equal(demo.suite, "Demo page: component actions");
  assert.equal(saarathi.suite, "Saarathi command center: on-self checks");

  // Every test in this framework is tagged, which is a rule in CLAUDE.md.
  for (const s of specs) {
    for (const t of s.tests) {
      assert.ok(t.tags.length > 0, `${s.file}: "${t.title}" has no tag`);
      assert.ok(t.title.length > 0, `${s.file}: a test has an empty title`);
    }
  }

  // Only the two tag dimensions CLAUDE.md allows are in use.
  const allowed = new Set(["@smoke", "@regression", "@crud", "@readOnly", "@chained"]);
  const used = new Set(specs.flatMap((s) => s.tests.flatMap((t) => t.tags)));
  for (const tag of used) assert.ok(allowed.has(tag), `unexpected tag in the real specs: ${tag}`);

  // There is no @req anywhere in this repo yet. Reporting that honestly is the
  // point: if one is added later, this assertion is the reminder to update it.
  assert.ok(
    specs.every((s) => s.tests.every((t) => t.requirement === null)),
    "no spec in this repo carries a @req annotation yet"
  );
});
