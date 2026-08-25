# Framework Architecture

This document explains how the Playwright framework itself is built: the
core idea, the resilient locator strategy, the folder structure, and how
reporting works. This is the technical heart of the project.

## The core problem this framework solves

Most real web applications do not have clean, stable ids on every element.
A framework that only knows how to find elements by id breaks constantly on
real apps. The framework's answer is one function, `findElement()`, that
tries several ways to find an element, in a fixed order from most reliable
to last resort, and logs which one actually worked.

## The resilient locator fallback chain

In order, most reliable first:

1. `data-testid` (a dedicated test attribute, the most reliable when the app
   has it)
2. ARIA role plus accessible name (for example, a button whose role is
   "button" and whose accessible name is "Submit")
3. `<label>` (a real HTML label tied to a form field)
4. Placeholder text
5. Visible text on the element itself
6. Plain CSS selector (last resort, used only when nothing else is available)

If none of these strategies finds exactly one matching element, the function
does not guess. It fails loudly, with a clear message listing every strategy
it tried and how many matches each one found.

## The wait is real, not a single check

This is the single most important engineering detail in the whole framework,
and it was also the source of the project's most important bug (see
`06-bugs-found-and-lessons.md`).

Each strategy gets a real, bounded wait using Playwright's own
`locator.waitFor({ state: 'attached', timeout })`, not a single
point-in-time check. An element that renders slightly late (for example, 1.2
seconds after the page loads) is not the same as an element that will never
exist, and the framework must not treat those two situations the same way.
There are no hard-coded sleeps anywhere in this logic. A constant,
`STRATEGY_TIMEOUT_MS` (3000 milliseconds by default, overridable per call),
bounds how long each strategy is allowed to poll for. It never blindly
pauses execution regardless of whether the element already appeared.

## The circuit breaker

If every strategy in the chain times out, that is the circuit breaker
tripping. At that point the function:

1. Stops trying further strategies.
2. Takes an accessibility snapshot of the page (`page.locator('body').ariaSnapshot()`)
   for debugging, wrapped so a snapshot failure does not hide the real error.
3. Throws one clear error listing every strategy tried, how many matches
   each found, and the accessibility snapshot at the moment of failure.

It never keeps guessing past that point, and it never picks "the closest
looking element" as a fallback. That is a deliberate design choice, carried
through into the self-healer agent's own rules (see
`04-multi-agent-system.md`).

## Honest limit, stated directly in the code and the README

If a real page has no test-id, no label, no role, no visible text, and no
unique CSS selector to tell two elements apart, no tool, this one included,
can reliably find the right one. That is not treated as a bug to fix later.
It is a real, permanent limit of browser automation, and the framework fails
loudly instead of quietly guessing wrong.

## Page Object Model, strict

Every page's interactions live in a Page Object class (`pages/*.page.ts`),
one numbered file per page in the order a user would move through the app
(`01-demo.page.ts`, and so on as more pages are added). A test spec file
never calls a raw Playwright locator directly. See
`03-coding-rules-and-style.md` for the full reasoning and a worked example.

## Reusable action functions, one per component type

Instead of writing a one-off locator-and-interact sequence inline every time
a checkbox or dropdown needs to be used, one shared function per element type
lives in `support/actions/`, reused everywhere that element type appears.
This is the framework's answer to a feature Playwright does not have:
Cypress has "custom commands", Playwright does not, so plain reusable
functions do the same job, deliberately kept simpler than Playwright's own
"fixtures" feature, which is reserved for real setup and teardown lifecycle
needs, not for one-line component interactions.

Component types covered as of this project: textbox, checkbox, radio,
dropdown (native `<select>` only, not a custom div-based dropdown), slider,
toggle, date picker, table, modal, tabs, and file upload.

## Folder structure

```
.claude/agents/          The six subagents. See 04-multi-agent-system.md.
config/environments/     One settings file per environment: local, dev, qa, prod.
demo-app/                The practice HTML page, deliberately built with some
                          fields missing ids and labels, plus one element that
                          renders 1200ms late, to prove the resilient locator
                          logic actually works on a hard case, not just an
                          easy one.
documents/                Living project records: bugs.md, recommendations.md,
                          doubts.md, lessons-learned.md. Owned only by the
                          documentation-keeper agent.
fixtures/                 All test data, as JSON. Also holds captured state
                          for later runs (fixtures/saved-state/) and small
                          files tests upload (fixtures/files/).
support/
  actions/                One file per HTML component type.
  locator-resolver.ts     findElement(), described above.
  s3-data.ts               Reads and writes shared data and large files to
                          Amazon S3. See 02-configuration-and-setup.md.
  base-test.ts             Every spec file imports test/expect from here
                          (not directly from @playwright/test), which adds
                          automatic start, finish, and failure logging to
                          every test.
  logger.ts                Writes clear, timestamped log lines to the
                          console and to reports/logs/.
  env.ts                   Figures out which environment to run against.
  data-reader.ts            Reads and writes the JSON files in fixtures/.
pages/                   Page Object Model, one numbered file per page.
tests/                   The actual test spec files.
scripts/check-guardrails.js  The machine-checked subset of the house rules.
                          See 03-coding-rules-and-style.md and 05-skills.md.
ui-map/                  Hand-built map of every component in the demo page.
                          See 07-ui-component-map.md.
LESSONS.md               Engineering lessons: real bugs in the framework's
                          own code, and the guardrail that now locks each
                          one in place. See 06-bugs-found-and-lessons.md.
.github/workflows/       GitHub Actions pipeline.
ci/                      Jenkinsfile and bitbucket-pipelines.yml.
reports/                 Everything a test run produces. Not committed to git.
```

## Reporting

Four kinds of output, all produced by a real test run, not just described:

- **HTML report** (`reports/html-report`): best for a quick look at a single
  failure, with the exact step, a screenshot, and a video.
- **Allure report** (`reports/allure-report`): best for sharing with a team.
  Groups tests by epic, feature, and story, and shows the Given/When/Then
  steps as a readable narrative. Needs a real Java installation to generate.
- **JUnit XML** (`reports/junit-results.xml`): for CI systems that read this
  format.
- **Plain text logs** (`reports/logs/run-<timestamp>.log`): one line per
  action, in order, with the exact reason for any failure.

Failure evidence (screenshot, video, trace) is only captured for tests that
actually fail, to keep passing runs small. Allure is the one exception: by
default it attaches a screenshot and video for every test, pass or fail.
That is Allure's own built-in default behavior, not something this framework
deliberately turned on.

## Parallelism and worker cap

`playwright.config.ts` caps workers at a fixed 3, in every environment,
local and CI, satisfying the requirement of never using more than two to
three workers anywhere, not only in CI. Independent tests run in parallel
across those 3 workers. Tests tagged `@chained` (meaning they depend on
another test's data) run in strict order on one worker using
`test.describe.configure({ mode: 'serial' })` inside their own describe
block, still inside the same 3-worker cap rather than needing a separate CI
stage.

## Test tags, two independent dimensions

Every test carries two kinds of tags:

- **Lifecycle**: `@smoke` or `@regression`.
- **Category**: `@crud` (creates, updates, or deletes data), `@readOnly`
  (only reads or checks something), or `@chained` (depends on another test's
  data running first).

## Demo page components, current count

As of this project, the demo page has 14 distinct HTML components, each
proving one part of the resilient locator strategy or another framework
capability (file upload, tables, tabs, modals, a late-rendering element).
See `07-ui-component-map.md` for the full inventory and honest coverage
detail per component.
