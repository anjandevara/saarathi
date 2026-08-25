# Real Bugs Found and Fixed, and the Discipline Behind Finding Them

This document is the full, honest history of real bugs found in this
project's own code and tooling, across every phase of the build, what
broke, why it mattered, what now guards against it, and how each fix was
proven to actually work rather than just claimed to work.

## The discipline: self-correcting build

A recurring method was used throughout this project, based on a simple
idea: a tool does not get smarter by wishing it would. It gets smarter when
each mistake is turned into a check that runs automatically. A comment
saying "be careful about X" is forgotten by the next edit. A test that
fails the build when X breaks is not.

The loop, followed in order, every time:

1. Plan the smallest real version of the fix.
2. Test it on real data before claiming anything works, never a toy
   example assumed to work.
3. When something breaks, find the exact cause, not a plausible guess. Read
   the actual output, trace the actual failure.
4. Fix it as a checked guardrail, not a note or a comment. Ask: can a
   machine enforce this? Usually yes.
5. Re-test, then prove the test is not vacuous. A test that always passes
   guards nothing. Break the fix on purpose, watch the test go red, then
   restore it and watch it go green. Only a test that has actually been
   seen to fail is a test that can be trusted.
6. Record the lesson: what broke, why it mattered, the guardrail, the test
   that locks it in.
7. Gate shipping on the tests actually passing, and say the result
   honestly, including if a test is still red.

Every entry below follows this same shape, and every fix listed as "proven
non-vacuous" genuinely was, by deliberately breaking it and watching it
fail before restoring it.

## First pass: bugs found while first proving the framework worked

- **Sandbox browser mismatch.** The build environment's pre-installed
  Chromium build did not always match the npm-installed `@playwright/test`
  version. Fixed with a general-purpose `PLAYWRIGHT_CHROMIUM_PATH`
  environment variable escape hatch in `playwright.config.ts` (useful
  beyond just this one sandbox, for example on a locked-down machine that
  cannot download browsers).
- **`file://` base URL resolved to the filesystem root.** `page.goto('/')`
  against a `file://` base URL resolved to "Index of /" instead of the
  actual demo page. Fixed by having `DemoPage.open()` go directly to
  `env.baseUrl` for the local, file-based case.
- **Deprecated Allure API.** `allure-playwright`'s legacy `allure` object is
  deprecated. Fixed by importing `epic`, `feature`, `story`, and
  `description` directly from `allure-js-commons` instead, confirmed
  against the package's own type definitions rather than assumed.
- **TypeScript 7 config incompatibility.** TypeScript 7 removed
  `moduleResolution: "node"` and `baseUrl`/`paths`. Fixed by simplifying
  `tsconfig.json`, which cost nothing since no path aliases were actually
  in use.
- **Jenkinsfile report stage would not run after a failure.** A
  `when { expression { true } }` stage for Allure report generation would
  not run after a failed test stage, because Jenkins declarative pipelines
  skip later stages once one stage fails. Fixed by moving report
  generation into `post { always { ... } }`, the correct construct for
  "run regardless of pass or fail."
- **Missing Java in the Bitbucket pipeline.** Allure's report generator
  needs a real Java install; the official Playwright Docker image used by
  the Bitbucket pipeline does not include one. Fixed by adding an apt-get
  install step. GitHub's runners and most Jenkins agents already have Java.
- **Docker image tag risk, flagged not fixed.** The exact Docker image tag
  pinned in `bitbucket-pipelines.yml` is the officially documented naming
  convention, but Microsoft has, in the past, been slow to publish the
  image for a brand new patch version. This cannot be fixed in code, so it
  was flagged directly as a comment in the file with a fallback
  instruction, rather than silently left as a hidden risk.
- **`findElement()` checked once instead of really waiting.** The original
  locator strategy picked using a single point-in-time `count()` call, so
  an element rendering even slightly late was wrongly reported as zero
  matches. Fixed by switching to Playwright's real
  `locator.waitFor({ state: 'attached', timeout })` per strategy. Proven by
  adding a deliberately late-rendering button to the demo page and
  confirming the old code found zero matches while the fixed code found
  one.
- **`.gitignore` did not actually exclude `.env`.** A comment about never
  committing credentials existed, but no actual `.env` exclusion backed it
  up, a real risk once S3 credentials were introduced. Fixed by adding
  `.env` and `.env.local` to `.gitignore`, and by loading a root `.env` for
  secrets in `support/env.ts`.

## Second pass: found through an honest self-audit, using the discipline above

This second pass happened after the person pointed out that earlier claims
of completeness had not actually been checked carefully enough, and asked
for a rigorous re-audit. Four more real, previously invisible bugs were
found this way, and every one of them was proven non-vacuous, not just
fixed and assumed correct.

### 1. The wait fix itself had zero permanent test coverage

**What broke:** the fix described above (real waiting instead of a single
`count()` check) had no dedicated regression test locking it in. A future
change could have silently reverted it and nothing would have caught it.

**Why it mattered:** this directly contradicted the framework's core
promise, real waiting instead of hard-coded sleeps or instant guesses. A
framework meant to handle real, sometimes slow-rendering apps was one
accidental edit away from silently failing on exactly that case again.

**Guardrail:** a dedicated test, "finds and clicks a button that only
appears 1200ms after page load," added to `tests/demo/demo.spec.ts`,
exercising a deliberately late-rendering button on the demo page.

**Proof it is not vacuous:** the fix inside `support/locator-resolver.ts`
was temporarily reverted to the old `count()`-only behavior, the new test
was run and observed to fail with a real circuit breaker error, then the
fix was restored and the same test was run again and observed to pass.

### 2. A written but never-used action function: file upload

**What broke:** `support/actions/file-upload.actions.ts` existed in the
codebase, fully written, but was never actually called by any Page Object
or exercised by any test. A real, silent coverage gap: a function that
looked finished but had never actually been proven to work.

**Why it mattered:** untested code that looks complete is a trap, it reads
as "done" without ever having been run for real.

**Guardrail and proof:** `DemoPage.uploadResume()` and
`DemoPage.getResumeFileName()` were added, wired to a new
`fixtures/files/sample-resume.txt` synthetic fixture file (explicitly
containing no real personal data), and a real test, "uploads a resume file
wrapped in a label," was added that actually exercises the upload and reads
the resulting file name back.

### 3. A Page Object bypassing the resilient locator system entirely

**What broke:** `DemoPage.openTermsModal()` and `closeTermsModal()` were
calling `page.getByRole()` directly, a raw Playwright locator call,
completely bypassing `findElement()` and the whole resilient-locator
promise the rest of the framework relies on.

**Why it mattered:** this is exactly the kind of bug the framework's own
house rules exist to prevent, and it was invisible to the guardrail script
at the time, because that script only scanned spec files for raw locators,
never Page Object files. A test file can stay perfectly clean while the
Page Object it calls quietly cuts a corner underneath it.

**Guardrail:** the two methods were rewritten to use `findElement()`, and a
brand new check was added to `scripts/check-guardrails.js`,
`checkNoRawLocatorsInPageObjects()`, specifically so this class of bug can
never hide again.

**Proof it is not vacuous:** the old, buggy code was reconstructed in an
isolated copy of the file, the new check was run against it and correctly
reported the violation at the exact two lines, then the check was run again
against the real, fixed code and passed clean.

### 4. The em dash checker had its own blind spot

**What broke:** the em dash and long dash check only scanned `.ts` files
under `tests/`, `pages/`, and `support/`, plus `.md` files under
`documents/` and `.claude/agents/`. It never looked at the project's own
`README.md` or `demo-app/index.html`. Twenty-nine real em dashes sat in
those two files the entire time the check reported a clean pass.

**Why it mattered:** a guardrail with an unstated blind spot is worse than
having no guardrail at all, because a clean run reads as "no violations
anywhere" when it actually means "no violations in the four places the
script happened to look." The check's own SKILL.md, for the packaged
guardrail-check skill, was also found to contain seven em dashes in its own
instructions, the very tool meant to catch this had it in its own text.

**Guardrail:** the check was widened to also scan every `.html` file under
`demo-app/` and every `.md` file at the project root, README.md included.

**Proof it is not vacuous:** the widened check was run against the repo
before touching either file and correctly reported all 29 real violations
by exact file and line number, then both files, plus the skill's own
SKILL.md, were fixed, and the check was run again and confirmed zero
violations remain.

## Honest limits: things deliberately not turned into a test

Not every fix in this project's history could reasonably become an
automated guardrail. These are stated here, rather than silently left
unmentioned, because a fix that was never actually proven should never be
presented as equally solid as one that was:

- The Jenkinsfile's `post { always { ... } }` fix for Allure report
  generation can only be proven by actually running a real Jenkins
  pipeline, which this project's build environment does not have access
  to. Documented with comments in `ci/Jenkinsfile` instead.
- The Bitbucket pipeline's Java install step for Allure has the same limit,
  no real Bitbucket runner available to prove it against.
- The Docker image tag risk in `bitbucket-pipelines.yml` is an external
  dependency risk (Microsoft's own release timing), not something this
  project's own code can guard against no matter how it is written. Flagged
  with a comment and a fallback instruction instead of silently ignored.
- The six subagents in `04-multi-agent-system.md` have not been run end to
  end inside a real Claude Code session, only checked for being well formed
  and internally consistent. See `10-open-items-and-next-steps.md`.
