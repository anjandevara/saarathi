# Coding Rules and Style

This document captures every rule that was actually followed while building
this project: where it came from, why it exists, and how it shows up in the
code. Two sources feed these rules: the person's own stated engineering
preferences (carried into every session), and rules worked out specifically
for this framework as it was built.

## The person's own standing preferences (source: personal working style)

These apply to all work, not just this project, and shaped almost every
decision below:

- Keep code simple and easy to read. Match the style of the code around it.
- Prefer rules that are checked by tools (hooks, CI checks) over rules that
  are just text.
- For agents and skills: small, focused, self-contained, one clear job each.
  A pipeline of small agents beats one big agent.
- For tests: independent tests, no shared state. Use Page Objects, but keep
  methods simple, no complex typed return objects. One numbered file per
  page.
- Plan before building. Show the steps and get agreement before writing
  code.
- Ground claims in the real source first. Never guess a name, a locator, or
  a behavior, confirm it from the source.
- Be honest. If something is blocked, say so. Never claim something is done
  or a test is passing when it is not. "Ask a human" is a valid answer.
- One issue equals one item. Never bundle multiple problems into a single
  bug or note.
- Do not create extra summary or report files. Put status in the real
  project docs, give status updates in chat.
- Never use em dashes or long dashes. Use commas, colons, or short
  sentences.

## Strict Page Object Model

A `.spec.ts` test file contains only test cases: `test()` blocks,
`test.step()` calls, and assertions. It never contains a raw
`page.locator(...)`, `page.getByRole(...)`, or any similar call directly.
All of that lives in a Page Object.

Why: when a locator breaks, there is exactly one place to fix it. When a
test file mixes locators and test logic, the same broken locator can be
scattered across dozens of tests, each needing its own fix.

This rule also applies inside Page Objects themselves: a Page Object method
should never call a raw Playwright locator directly either, it should always
go through `findElement()` (see `01-framework-architecture.md`). This second
half of the rule was not obvious from the start, it was found as a real bug
partway through the project (the terms modal's open and close buttons were
calling `page.getByRole()` directly, bypassing the resilient locator system
entirely). See `06-bugs-found-and-lessons.md` for the full story.

## One numbered file per page

Page Object files are named in the order a user would actually move through
the app: `01-login.page.ts`, `02-dashboard.page.ts`, `03-checkout.page.ts`.
When a new page is added, look at the highest existing number and add one
more.

Why: the numbering itself becomes a map of the user's journey through the
app. A new team member can list the `pages/` folder and understand the
app's flow before reading a single line of code.

## Keep Page Object methods simple

A Page Object method does one clear thing and returns something a test can
assert on directly: a string, a number, a boolean, or a plain object with a
few named fields. It never returns a large custom typed "result" object
that wraps other objects, and it never returns `this` for method chaining.

```ts
// Good: returns a plain string the test can assert on directly.
async getOrderStatus(): Promise<string> {
  return this.orderStatusLabel.innerText();
}

// Avoid: a custom wrapper type adds a layer of indirection with no
// real benefit, and makes the test harder to read at a glance.
async getOrderDetails(): Promise<OrderDetailsResult> { ... }
```

Why: the test file is where the story of "what should happen" gets told. If
reading a test also requires jumping into a custom type definition to
understand what a method gives back, that story gets harder to follow, not
easier.

## Prefer UI testing over calling APIs directly

Interact with the application the way a real user would, through the UI.
Only call an API directly when there truly is no other way to set up or
verify something through the UI. Two honest examples: seeding a large volume
of background data that would take minutes to create by clicking through the
UI, or reaching a state the UI has no way to produce, like an expired
session. When an API call is used, add a one-line comment explaining why the
UI could not do it.

Why: a test that clicks through the real UI catches real UI bugs. A test
that skips the UI and only calls an API can pass while the actual screen a
user sees is broken.

## Simple object-oriented design

Interfaces are fine, and often useful, for describing the shape of data:
form fields, fixture records, a config object. Skip abstract classes,
dependency-injection frameworks, or a generic base-class hierarchy, unless
there is a proven, immediate need for more than one concrete implementation
right now. Do not build the flexible version "in case it is needed later."

Why: extra structure that is not earning its keep is a maintenance cost paid
by everyone who reads the code afterward, for a benefit nobody is using yet.

## No hard-coded wait times

Never use `page.waitForTimeout(...)` or any other fixed sleep. Use
Playwright's own waiting: `locator.waitFor({ state, timeout })`, or the
auto-retrying `expect(locator)...` assertions. A fixed sleep either wastes
time when the page is fast, or still fails when the page is slow. A real
wait does neither. This is the same principle behind `findElement()`'s own
internal waiting logic, see `01-framework-architecture.md`.

## One reusable function per element type

Component interactions (filling a textbox, checking a checkbox, selecting a
dropdown option, opening a modal, and so on) live in one shared function per
element type, reused everywhere that element type appears. Never write a
one-off inline locator-and-click sequence directly inside a test when a
shared function for that element type already exists.

## Test structure and readability

- Use `test.step()` to write each test as Given, When, Then, so the report
  shows the story of the test, not just pass or fail.
- Use object destructuring for structured test data, for example
  `const { username, password } = testData;` instead of repeating
  `testData.username` throughout the test.
- Use full names, not abbreviations, the first time a term appears, for
  example "UAT (user acceptance testing)".
- Add one short comment, one to two lines, per test case, per function, and
  per variable whose purpose is not obvious from its name.
- Never use em dashes, long dashes, or other "AI sounding" phrasing, in
  code, comments, or test titles. Use plain, simple words, commas, or short
  sentences instead.
- Tag every test with at least a lifecycle tag (`@smoke` or `@regression`)
  and, where relevant, a category tag (`@crud`, `@readOnly`, or `@chained`).

## Independent tests

Each test runs on its own, in any order, without depending on state left
behind by another test. If one test genuinely needs data another test
created, a "chained" scenario, that data passes through an explicit shared
store (a database, an S3 bucket, a fixture file written by the earlier
test), never through in-memory state or an assumption about execution order.

## File size limits

Keep a single spec file under 1000 lines. Keep a single skill or
agent-definition file under 500 lines. When either would go over, split by
feature area for spec files, or push the excess detail into a `references/`
folder the file points to, for skill and agent files, rather than letting
one file keep growing.

## One issue per report

When documenting a bug, a design recommendation, or anything unclear found
while testing, write one entry per problem, even if several problems were
found in the same test run. Do not fold three separate symptoms into a
single bug report. A reader, human or another agent, should be able to act
on, close, or dismiss one finding without it being tangled up with an
unrelated one.

Example, the wrong way (three problems bundled into one bug):

> Bug: Checkout page has several problems. The terms checkbox does not stay
> checked after reload, the order total shows the wrong currency symbol
> sometimes, and the page is slow to load on mobile.

The right way, the same three problems as three separate entries:

> Bug 1: Terms checkbox does not stay checked after page reload.
>
> Bug 2: Order total sometimes shows the wrong currency symbol.
>
> Recommendation: Checkout page loads slowly on mobile, worth investigating
> even though nothing is functionally broken.

## Rules that are checked by a tool, not just written down

A rule that only a person, or an agent, has to remember to check gets
skipped under time pressure. This turned out to be true in this project's
own history: rules like "no hard-coded waits" and "no em dashes" were
written down clearly, and were still violated in the framework's own code
early on. This is why `scripts/check-guardrails.js` exists: it turns the
machine-checkable subset of these rules into a real, runnable script that
exits with a non-zero code on any violation, so it can be gated in CI, not
just read and hopefully remembered. See `05-skills.md` for the packaged
skill version of this script, and `06-bugs-found-and-lessons.md` for the
real violations it found.

As of this project, the script checks eight things:

1. No hard-coded wait times (`.waitForTimeout(`).
2. No em dashes or en dashes anywhere in code, comments, or documentation.
3. Spec files stay under 1000 lines.
4. Agent and skill files stay under 500 lines.
5. Every test has at least one tag.
6. No raw Playwright locators directly inside spec files.
7. No raw Playwright locators directly inside Page Objects.
8. `.gitignore` actually excludes `.env`.

It also prints, every time it runs, an explicit list of what it deliberately
does not check (simple object-oriented design, preferring UI over API calls,
object destructuring, whether a comment actually explains the thing next to
it, one issue per report), so a clean run is never mistaken for a complete
review. Those remaining rules are the job of the `playwright-test-standards`
skill and human or agent code review.
