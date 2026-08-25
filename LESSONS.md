# Lessons Learned (Engineering)

This file records real bugs found in this framework's own code, and the
checked guardrail (a test or a script check, never just a comment) that
now locks each one in place. This is different from
`documents/lessons-learned.md`, which is the self-healer agent's log of
locator strategies changing on a live target app. This file is about
the framework's own source code and tooling.

Each entry follows the same shape: what broke, why it mattered, what
now guards it, and the test or check that locks it.

---

## findElement() checked once instead of really waiting

- **What broke:** `support/locator-resolver.ts` decided whether an
  element existed using a single point-in-time `candidate.count()`
  call. An element that rendered even slightly after the check ran was
  reported as "0 matches" and the resolver moved on to a worse fallback
  strategy, or failed outright, even though the element would have
  appeared a moment later.
- **Why it mattered:** this directly contradicted the framework's core
  promise, real waiting instead of hard-coded sleeps or instant guesses.
  A framework meant to handle real, sometimes slow-rendering apps was
  silently failing on exactly that case.
- **Guardrail:** `waitAndCount()` now uses Playwright's own
  `locator.waitFor({ state: 'attached', timeout })` before counting,
  bounded by `STRATEGY_TIMEOUT_MS`, not a blind sleep.
- **Test:** `tests/demo/demo.spec.ts`, the test titled "finds and
  clicks a button that only appears 1200ms after page load". This test
  is not vacuous: it was proven to fail (the resolver's `waitAndCount()`
  was temporarily reverted to the old `count()`-only behavior, the test
  went red with a real circuit breaker error, then the fix was restored
  and the same test went green again, in the same session this lesson
  was written).

## .gitignore said "never commit credentials" but did not actually exclude .env

- **What broke:** `.gitignore` had a comment explaining that real
  secrets belong in a root `.env` file and should never be committed,
  but the file itself did not list `.env` as an excluded pattern. The
  comment was a hope, not an enforced rule.
- **Why it mattered:** once `support/s3-data.ts` introduced real Amazon
  Web Services credentials read from a `.env` file, this gap became a
  real risk, a normal `git add .` could have committed real secrets.
- **Guardrail:** `.gitignore` now excludes `.env` and `.env.local`, and
  `scripts/check-guardrails.js` has a dedicated check,
  `.gitignore excludes .env`, that fails if this regresses.
- **Test:** proven by pointing the script at a copy of the project with
  `.env` removed from `.gitignore` and watching the check fail, then
  confirming it passes again against the real, correct `.gitignore`.

## Style rules existed only as prose, never as something a machine checked

- **What broke:** rules like "no hard-coded waits", "no em dashes", and
  "no raw locators in spec files" were written down in
  `.claude/agents/_shared/guardrails.md` and in agent instructions, but
  nothing ever actually scanned real files for them. The rules were
  violated in this framework's own code (two em dashes and five raw
  locator calls slipped into `tests/demo/demo.spec.ts`) despite being
  written down clearly.
- **Why it mattered:** a rule that only a person (or an agent) has to
  remember to check gets skipped under time pressure. This is a direct
  instance of the standing preference: prefer rules checked by tools
  over rules that are just text.
- **Guardrail:** `scripts/check-guardrails.js`, wired in as
  `npm run check:guardrails`, scans real files and exits non-zero on a
  violation, so it can be gated in CI, not just read.
- **Test:** run against this repo before and after the fix, the script
  went from 19 real violations to 0, and both the em-dash and
  raw-locator fixes were verified by re-running the script, not just
  assumed.

## The em dash check itself had a blind spot: README.md and demo-app/index.html

- **What broke:** `checkNoLongDashes()` only scanned `.ts` files under
  `tests/`, `pages/`, `support/`, plus `.md` files under `documents/`
  and `.claude/agents/`. It never looked at the project's own
  `README.md` or `demo-app/index.html`. 29 real em dashes sat in those
  two files the whole time the check reported a clean pass.
- **Why it mattered:** a guardrail with an unstated blind spot is worse
  than no guardrail, because a clean run reads as "no violations
  anywhere" when it actually means "no violations in the four places I
  happened to look."
- **Guardrail:** `checkNoLongDashes()` now also scans every `.html`
  file under `demo-app/` and every `.md` file at the project root
  (README.md included).
- **Test:** the widened check was run against this repo before touching
  either file and correctly reported all 29 real violations by exact
  file and line number, then both files were fixed and the check was
  run again to confirm zero remain.

## A full-viewport fixed canvas takes clicks unless you tell it not to

- **What broke:** Saarathi's 3D core is a `<canvas id="gl">` at
  `position: fixed; inset: 0`, covering the whole viewport. It kept the
  default `pointer-events: auto`. Above the app's 1100px breakpoint the
  top bar and panels are themselves positioned and paint above it, so
  nothing showed. Below the breakpoint they become `static`, the canvas
  painted over them, and it swallowed every click on the navigation.
- **Why it mattered:** the app had no working navigation at all on a
  phone, and had not for as long as the narrow breakpoint existed. The
  element causing it is decorative and `aria-hidden`, so nothing about
  the bug was visible: the links looked normal and simply did nothing.
- **Guardrail:** `#gl` now sets `pointer-events: none`. It listens for
  nothing but a window resize, so it never needed them. The general rule:
  a decorative full-viewport layer must not take pointer events, and
  `z-index` does not save you, because a static element cannot outrank a
  positioned one.
- **Test:** `tests/saarathi/saarathi.spec.ts`, the test titled "the
  layout never scrolls sideways at a narrow width", which reaches the
  rail and clicks through it at 390px. Proven to fail: removing
  `pointer-events: none` turns it red, restoring it turns it green.

## A text locator dies the moment the same words appear twice

- **What broke:** the on-self suite found Saarathi's suite health label by
  its text, "Suite health". Once the project had an actual run, the
  activity ticker also rendered "Suite health N percent, ...", the text
  matched two elements, and `findElement` refused to guess between them.
- **Why it mattered:** the suite was green only while the project had
  never been run. Running the tests once produced the JUnit file that
  broke the tests. A tool that watches running projects must not fail
  because a project ran, and the failure looked like a missing element
  rather than an ambiguous one.
- **Guardrail:** the element is now named, `data-testid="suite-health"`,
  and the page object asks for that first with the text strategy left as
  a fallback. This is what `findElement`'s own circuit-breaker message
  tells you to do, and the resolver refusing to guess between two matches
  is what turned a silent wrong-element click into a loud failure.
- **Test:** `tests/saarathi/saarathi.spec.ts`, the test titled "loads the
  command screen with the live suite health". It was watched failing on
  the ambiguous locator, then passing once the element was named, with a
  real run present in both cases.

## Honest limits (not turned into a test, and why)

Not every fix in this project's history could reasonably become an
automated guardrail. Listed here instead of silently skipped:

- The Jenkinsfile's `post { always { ... } }` fix for Allure report
  generation can only be proven by actually running a Jenkins pipeline,
  which this project does not have access to. Documented with comments
  in `ci/Jenkinsfile` instead.
- The Bitbucket pipeline's Java install step for Allure has the same
  limit, no real Bitbucket runner available to prove it against.
- The Playwright Docker image tag risk in `bitbucket-pipelines.yml`
  (Microsoft sometimes publishes a new version's image late) is an
  external dependency risk, not something this project's own code can
  guard against. Flagged with a comment and a fallback instruction
  instead.
