# Playwright Automation Framework

This is a starter Playwright framework, written in TypeScript, for testers who are
new to automation coding. It comes with a working demo already inside it, so you
can run real tests today without needing a real application yet.

## 1. What makes this framework different

Most real apps do not have clean IDs on every field. This framework's core idea is
one function, `findElement()`, that tries several ways to find an element, in order
from most reliable to last resort, and logs which one worked:

1. `data-testid`
2. ARIA role + accessible name (e.g. a button named "Submit")
3. `<label>`
4. placeholder text
5. visible text
6. plain CSS (last resort)

If none of those find exactly one element, the test fails with a clear message
saying what was tried, instead of guessing and clicking the wrong thing.

**Honest limit:** if a real page has no test-id, no label, no role, no text, and
no unique CSS to tell two elements apart, no tool (this one included) can reliably
find the right one. That is not a bug to fix later, it is a real limit of automation.

## 2. The three layers of this project

This folder is not just test code. It has three separate layers, and they behave
differently, so it helps to know which is which before you start.

1. **The framework itself.** Everything described in this README: the test code,
   the config, the reports. This is a normal folder of files. Copy it, clone it,
   move it anywhere, it keeps working the same way everywhere.
2. **The multi-agent system**, under `.claude/agents/`. Six small, single-job
   Claude Code subagents that write tests, review them, run them, and fix broken
   locators for you. They live inside this folder, but `.claude` starts with a dot,
   so on a Mac, Finder hides it by default (press `Cmd+Shift+.` to reveal it). They
   only come alive when Claude Code, or Cowork, is running with this folder as the
   working directory. See section 9.
3. **Two companion skills**, `playwright-test-standards` and
   `playwright-guardrail-check`. These are not part of this folder at all. They
   are installed once to a Claude account, and from then on they work in any
   Claude session, on any Playwright project, not just this one. See section 10.

If something about the agents or the skills feels invisible or missing, it is
almost always one of these two things: the hidden `.claude` folder, or a skill
that was sent to you but never actually installed/saved.

## 3. Install and run it

```bash
npm install
npx playwright install   # downloads real browsers onto this machine, one-time
npm test                 # runs everything against the demo page, local environment
npm run test:smoke       # only tests tagged @smoke
npm run test:headed      # same, but shows the browser window
npm run report:html:open           # opens the Playwright HTML report
npm run report:allure:generate     # builds the Allure report (needs Java installed)
npm run report:allure:open         # opens the Allure report
```

To point at a real environment instead of the demo page:

```bash
npm run test:dev
npm run test:qa
npm run test:prod
```

## 4. Configuration

Two kinds of settings, kept separate on purpose: the ones safe to check into git,
and the ones that must never be.

**Non-secret settings** live in `config/environments/<name>.env`, one file per
environment (`local`, `dev`, `qa`, `prod`). Right now the only value in these
files is `BASE_URL`, the address of the app under test. To point a real
environment at your app, open the matching file and fill it in:

```bash
# config/environments/dev.env
ENV_NAME=dev
BASE_URL=https://dev.your-real-app.example.com
```

`local` is a special case: its `BASE_URL` is left blank on purpose, because
`support/env.ts` builds a `file://` path to the demo page automatically. That is
what lets `npm test` work on a brand new machine with zero setup.

Which environment a run uses is controlled by the `TEST_ENV` variable, which the
npm scripts already set for you (`npm run test:dev` sets `TEST_ENV=dev`, and so
on). You do not need to set it by hand unless you are running
`npx playwright test` directly instead of through an npm script.

**Secrets** (Amazon Web Services keys, the S3 bucket name) never go in the files
above. They go in a root `.env` file, which `.gitignore` excludes from git on
purpose. Create it yourself, it does not exist yet:

```bash
# .env (create this file, never commit it)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
S3_BUCKET_NAME=your-bucket-name
```

These four are only needed if a test actually calls `support/s3-data.ts`
(uploading a file, or passing data between `@chained` test suites, see section
6). If nothing in your tests uses S3 yet, you can skip creating `.env` entirely,
`support/env.ts` only loads it if the file exists. In CI/CD, do not use a `.env`
file at all, set these same four names directly in the pipeline's own secret
settings instead (see section 8).

## 5. Folder structure

```
.claude/agents/          The six subagents, see section 9. Hidden by default
                          on a Mac, this is a dot-folder.
config/environments/     One settings file per environment: local, dev, qa, prod.
demo-app/                A single practice HTML page, deliberately built with
                          some fields missing ids and labels, to prove the
                          resilient locator logic actually works.
documents/                Living project records, kept up to date as the
                          framework is used: bugs.md, recommendations.md,
                          doubts.md, lessons-learned.md.
fixtures/                 ALL test data lives here, as JSON. Also the place to
                          save information captured from the app for later
                          (fixtures/saved-state/), and small files tests
                          upload (fixtures/files/).
support/                 Shared code every test can reuse.
  actions/                One file per HTML component type (textbox, checkbox,
                          radio, dropdown, slider, toggle, date picker, table,
                          modal, tabs, file upload). This is this framework's
                          answer to Cypress's "custom commands": Playwright
                          does not have that exact feature, so plain reusable
                          functions do the same job, kept deliberately simple.
  locator-resolver.ts     The findElement() fallback logic described above.
  s3-data.ts               Reads and writes shared data and large files to
                          Amazon S3, see section 4 for its required settings.
  base-test.ts             Every spec file should import from here (not
                          directly from @playwright/test). Adds automatic
                          start/finish/failure logging to every test.
  logger.ts                Writes clear, timestamped log lines to the console
                          and to reports/logs/.
  env.ts                   Figures out which environment to run against.
  data-reader.ts            Reads and writes the JSON files in fixtures/.
pages/                   Page Object Model. One numbered file per page.
tests/                   The actual test files (specs).
scripts/check-guardrails.js  The same script the playwright-guardrail-check
                          skill ships, kept here too so `npm run
                          check:guardrails` works without installing the
                          skill. See section 10.
ui-map/                  An honest, hand-written map of every HTML component
                          in demo-app/index.html: how it is found, which
                          function drives it, and whether a real test
                          actually covers it.
ci/                      Jenkinsfile and bitbucket-pipelines.yml.
.github/workflows/       GitHub Actions pipeline.
reports/                 Everything a test run produces. Not committed to git.
LESSONS.md               One entry per real mistake this framework made and
                          fixed, what broke, why it mattered, and the test
                          that now guards against it happening again.
```

## 6. How to write a new test

Copy the pattern in `tests/demo/demo.spec.ts`. The short version:

```ts
import { test, expect } from '../../support/base-test';
import { epic, feature, story, description } from 'allure-js-commons';

test('short, clear description of what this test checks @smoke', async ({ page, logger }) => {
  await epic('Which big area of the app');
  await feature('Which screen or feature');
  await story('Which specific behavior');
  await description('WHAT this test checks, WHY it matters, HOW it does it.');

  await test.step('Given ...', async () => { /* setup */ });
  await test.step('When ...', async () => { /* the action */ });
  await test.step('Then ...', async () => { /* the check */ });
});
```

Always add at least one tag (`@smoke`, `@regression`, etc.) to every test. Run a
tagged subset with `npx playwright test --grep @smoke`.

### Test categories and workers

Every test also gets a second tag, its category:

- `@crud`: creates, updates, or deletes data.
- `@readOnly`: only reads or checks something, changes nothing.
- `@chained`: depends on another test's data running first.

`playwright.config.ts` caps workers at a fixed 3, in every environment,
local and CI. Independent tests (`@crud`, `@readOnly`) run in parallel
across those 3 workers. `@chained` tests must run in order on one
worker, using `test.describe.configure({ mode: 'serial' })` in their own
`describe` block:

```ts
test.describe('Order flow, tests depend on each other in order @chained', () => {
  test.describe.configure({ mode: 'serial' });

  test('creates a new order @regression @chained', async ({ page }) => {
    // This test's result (like an order ID) gets saved to S3 with
    // support/s3-data.ts, so the next test can read it back.
  });

  test('adds shipping details to the order created above @regression @chained', async ({ page }) => {
    // Reads the order ID back from S3 with support/s3-data.ts.
  });
});
```

## 7. Reports and logs: what to look at when something fails

- **HTML report** (`reports/html-report`): best for a quick look, click into a
  failed test to see the exact step, screenshot, and video.
- **Allure report** (`reports/allure-report`): best for sharing with a team,
  groups tests by epic/feature/story and shows the given/when/then steps.
- **JUnit XML** (`reports/junit-results.xml`): for CI systems that read this format.
- **Plain text logs** (`reports/logs/run-<timestamp>.log`): one line per action,
  in order, with the exact reason for any failure. Read this first if you don't
  have the HTML/Allure report handy.

Failure evidence (screenshot, video, trace) is only captured for tests that
actually fail, to keep passing runs small, except in the Allure report, which
by default attaches a screenshot and video for every test, pass or fail. That
is Allure's own default behavior, not something this framework turns on.

## 8. CI/CD

Three ready-to-use pipeline files, all doing the exact same 4 steps (install
dependencies, install the browser, run the tests, publish the reports), so the
framework itself does not care which one you use:

- `.github/workflows/playwright.yml`: GitHub Actions
- `ci/Jenkinsfile`: Jenkins (copy the contents into your job, or point a
  Pipeline job at this file)
- `ci/bitbucket-pipelines.yml`: Bitbucket Pipelines (must be copied to the
  repository root as `bitbucket-pipelines.yml`, Bitbucket requires that exact
  location)

Set the four AWS variables from section 4 directly in the pipeline's own secret
settings (GitHub: repo Settings, Secrets and variables, Actions. Jenkins:
Credentials. Bitbucket: Repository settings, Repository variables), never as a
committed `.env` file.

All three were checked against real Playwright and Allure behavior while
building this framework, not just written from memory. Two things worth
knowing before you rely on them:

- The Bitbucket pipeline uses Microsoft's official Playwright Docker image.
  That image's version tag must exactly match the `@playwright/test` version
  in `package.json`, or tests won't be able to launch a browser. Microsoft has,
  in the past, been slow to publish the image for a brand-new patch version,
  if the exact tag in the file 404s, check
  `https://mcr.microsoft.com/en-us/product/playwright/tags` for the closest
  available one.
- Generating the Allure report needs a real Java install on the machine.
  GitHub's runners already have one. The Bitbucket pipeline installs one as
  part of the script, because the Playwright Docker image doesn't include it.
  Most Jenkins agents already have Java (Jenkins itself needs it to run).

## 9. The multi-agent system

Six small Claude Code subagents live in `.claude/agents/`, each with one job.
They only work when Claude Code, or Cowork, is open with this folder as the
working directory, so make sure that folder is not hidden from you (section 2).

1. **spec-writer**: turns a feature description or a bug report into a
   Given/When/Then test plan with tags.
2. **test-implementer**: turns that plan into real spec code and Page Object
   changes, following the patterns in this README.
3. **code-reviewer**: checks new code against the house style rules, fixes
   mechanical issues directly, flags anything that needs a human decision.
4. **triage**: reads a failed test's result and classifies it as a broken
   locator, a real bug, a recommendation, or something genuinely unclear.
5. **self-healer**: repairs a broken locator, but only by trying the existing
   fallback chain (testId, role, label, placeholder, text, css), never a
   guessed selector. A locator that keeps breaking gets escalated to a human
   instead of patched again silently.
6. **documentation-keeper**: the only agent that writes to `documents/`, keeps
   `bugs.md`, `recommendations.md`, `doubts.md`, and `lessons-learned.md`
   up to date.

`.claude/agents/_shared/guardrails.md` and `handoff-schemas.md` hold the rules
and JSON formats every agent follows, so each agent file stays short and does
not repeat itself.

To use them: open Claude Code (or Cowork) in this folder, then describe a task
in plain language, for example "write a test for the newsletter checkbox."
Claude picks the right agent for the job, or you can name one directly.

## 10. The two companion skills

`playwright-test-standards` and `playwright-guardrail-check` are separate from
this folder on purpose, they are installed to a Claude account, not copied
into a repo, so once installed they work on any Playwright project you build
later, not just this one.

- **playwright-test-standards** explains the full house style: strict Page
  Object Model, one file per page, simple return values, prefer UI over
  direct API calls, no hard-coded waits, Given/When/Then plus tags,
  independent tests, file size limits, one issue per bug report.
- **playwright-guardrail-check** is the part of those rules a machine can
  actually check. It runs `scripts/check-guardrails.js` (also present in
  this repo at that same path, so `npm run check:guardrails` works even if
  the skill is not installed) and prints the exact file and line for every
  violation it finds.

If you have the `.skill` files for these (sent to you separately), open each
one and choose to save it to install it. Once installed, ask a Claude session
to "check my tests against the guardrails" on any Playwright project and it
should trigger, no need to be in this folder.

## 11. Adding support for a new component type

1. Add a file to `support/actions/`, following the pattern of the existing ones.
2. Every function takes `(page, target: FindOptions, ...whatever it needs, logger?)`.
3. Use `findElement()` from `support/locator-resolver.ts` to find the element,
   never write a raw `page.locator(...)` call directly in a page object.

## 12. Known limitations (read before you rely on this in production)

- Custom-built dropdowns made of `<div>`s (not a real `<select>`) need their
  own handling: `dropdown.actions.ts` only covers native `<select>` elements.
- The resilient locator logic reduces fragility, it does not guarantee success.
  A page with zero distinguishing roles, labels, text, or CSS cannot be
  automated reliably by this or any tool.
- This framework was proven against a local demo page, not a real production
  application. Expect to adjust the component actions once you point this at
  your actual app: the shapes above are a strong starting point, not a
  guarantee every real app matches them exactly.
- The six subagents in section 9 have not yet been run end to end inside a
  real Claude Code session, this environment could not do that itself. The
  files are well formed and their handoffs are internally consistent, but
  that final check is still open.
