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
