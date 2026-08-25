# Decisions and Rationale

This is a decision log: every real fork in the road during this project,
what was chosen, and why. The goal is that a future session, or the
person themselves, can understand not just what was built but why it was
built that way, instead of re-litigating settled questions from scratch.

## Why a demo page instead of a real application first

The framework needed to be provable today, with zero setup, on any machine,
without waiting for access to a real application. A local demo HTML page,
shipped inside the framework itself, deliberately built with some fields
missing ids and labels, plus one deliberately late-rendering element, lets
every part of the resilient locator logic be exercised and proven
end to end immediately. The honest tradeoff, stated directly in the
project's own documentation: this framework has only been proven against
that demo page, not a real production application, and real apps will
likely need adjustments the demo could not anticipate.

## Why CI-agnostic: three pipelines instead of one

GitHub Actions, Jenkins, and Bitbucket Pipelines files were all built,
deliberately, rather than picking one platform. This was confirmed directly
with the person as an explicit choice, not a default. All three perform the
exact same four steps (install dependencies, install the browser, run the
tests, publish the reports), so the framework's own logic does not care
which platform ends up being used in practice.

## Why a fixed 3-worker cap, everywhere, not just in CI

The requirement was never more than two to three workers in any
environment. The original config only capped workers in CI
(`process.env.CI ? 2 : undefined`, meaning unbounded locally). This was
changed to a fixed cap of 3 in every environment, local and CI alike, so
the rule actually holds everywhere it was meant to, not only where a person
happened to remember to set `CI=true`.

## Why `@chained` tests use serial mode inside the same worker cap, not a separate CI stage

A simpler-sounding alternative would have been a separate CI stage just for
tests that depend on each other's data. Instead,
`test.describe.configure({ mode: 'serial' })` was used, which runs a group
of chained tests in order on one worker, without needing any special CI
stage at all, while independent tests keep running in parallel across the
other workers, still inside the same fixed 3-worker cap. This keeps the
whole system simpler: one config, one cap, no separate pipeline logic for
one category of test.

## Why S3 for data that needs to survive between test suites

Local JSON fixtures are read-only, shared test data. They do not carry
data created by one test suite forward to a different suite run later
(needed specifically for `@chained` category tests). `support/s3-data.ts`
exists specifically for that gap: saving data one test suite creates, so a
different suite, run later, can read it back. This was a deliberate,
narrow addition, not a general-purpose database layer, matching the
"simple, do not build the flexible version you do not need yet" principle.

## Why a resilient locator fallback chain instead of relying on ids

Most real web applications do not have clean, stable ids on every element.
A framework that only supports finding elements by id would break
immediately on a large share of real apps. The fallback chain (testId,
role and name, label, placeholder, text, css) tries the most reliable
method first and only falls back further when a stronger method is not
available, and it is honest about the case where nothing works: it throws
a clear error rather than guessing.

## Why a real wait per strategy, not one blind sleep or one instant check

Two tempting alternatives were both rejected. A single instant check
(`count()` with no wait) treats "not there yet" the same as "will never be
there," which is wrong, and was in fact the project's own most important
early bug (see `06-bugs-found-and-lessons.md`). A single long blind sleep
before every check would work, but wastes time on fast pages and can still
fail on slow ones. The chosen approach, a real, bounded
`waitFor({ state: 'attached', timeout })` per strategy, gets the benefit of
both: fast when the page is fast, and correctly patient when it is not,
with no wasted time either way.

## The pasted "MAP" prompt: what happened to it, and why

Early in the project, a monolithic prompt was shared, covering locator
strategy, self-healing, guardrails, and a specific logging format, all
combined into one large persona (referred to during the project as "MAP",
short for Market, Action, Process). Turning this into a seventh agent
wholesale would have repeated the exact pattern the person explicitly
rejected: one big agent doing everything, instead of a pipeline of small,
focused ones. Its genuinely useful pieces were kept, but distributed to the
right existing places instead of preserved as one big prompt:

- **The circuit breaker idea** (its own retry cap) became the retry logic
  inside `findElement()` itself, and the same idea bounds self-healer's own
  retry behavior.
- **The data privacy rule** (no real personal information, synthetic mocks
  only) became a shared guardrail binding every agent, and specifically
  binds the S3 data-handling code.
- **The scope-bound idea** (stay within a defined domain, clean teardown)
  became a guardrail on the test-execution step.
- **"Auto-heal by choosing the closest semantic alternative"**, was
  deliberately narrowed, not adopted as written. This is the one place the
  original prompt was looser than the project's own "never guess" rule.
  self-healer may only pick from the framework's already-defined, ordered
  fallback chain. It may never invent a new selector by fuzzy DOM
  similarity. If none of the defined strategies find a unique match, that
  is treated as a circuit breaker trip, a stop-and-escalate event, not a
  "pick the closest guess" event.
- **The MARKET/ACTION/PROCESS framing**, a business-aware rename of
  Given/When/Then, was folded in rather than kept as a second, parallel
  format. Its "Market" idea (environment, persona, business goal) became
  part of the test plan's context, while Given/When/Then stayed the one
  step format used everywhere else, since that was what was specifically
  asked for.
- **The bracketed logging template**
  (`[MAP-ANALYSIS]`, `[EXECUTION_LOG]`, `[STATE_VERIFICATION]` style
  blocks) was not adopted at all. It read as more "AI sounding" formatting
  than the project's own style wanted, and the existing simple logger
  format (timestamp, level, test name, message) was kept instead, only
  extended with one new level for healing events.

## Why two Claude Skills instead of two more agents

See `05-skills.md` for the full explanation. In short: the six agents are
tied to this one repository by design, since they reference this
framework's exact files and structure. The house style rules and the
enforcement script that checks them are general, useful on any future
Playwright project, so they were packaged as portable, account-level
skills instead, matching the person's own stated plan to build other
applications going forward.

## Why the full skill-creator process, not a faster version

When first asked to fix gaps found by an honest audit of the conversation,
the option to just write files and claim success was explicitly available
and explicitly rejected by the person ("do not just bluff"). The person
was offered a choice between a faster, lighter pass and the full rigorous
draft, real test cases, review process, and chose the full process. This
shaped the two skills' entire build history: real with-skill versus
baseline subagent comparisons, real grading against assertions, a real
aggregated benchmark, not just a description of what the skills should do.

## Why a second, deeper audit pass happened at all

After the two skills were delivered, the person asked directly why the
work still felt incomplete, and asked for every available skill to be used
and for the work to be pushed further. This was treated as a legitimate,
evidence-seeking complaint, not something to argue with. The
self-correcting-build discipline (see `06-bugs-found-and-lessons.md`) was
applied specifically to find real, previously invisible defects, rather
than defending the work already done. Four more real bugs were found this
way and each was proven fixed, not just claimed fixed.

## Why the `LESSONS.md` file is separate from `documents/lessons-learned.md`

These sound similar and are easy to confuse, so the distinction is
recorded directly, in both files' own text and here: `documents/lessons-learned.md`
is the self-healer agent's operational log of locator strategies changing
on a live, running target application, written by an agent while the
framework is in active use. The root-level `LESSONS.md` is about the
framework's own source code and tooling, written while the framework
itself was being built and audited, following the self-correcting-build
entry shape (what broke, why it mattered, the guardrail, the test that
locks it).

## Why the README was restructured mid-project, not just appended to

When asked how to configure and use the whole project, it became clear the
existing README only really covered the framework layer, not the agents or
the skills, and did not explain the hidden `.claude` dot-folder confusion
that had already come up in conversation. Rather than write a brand new,
separate summary document (which conflicts with the standing preference
against creating extra summary or report files), the existing, real
README.md was rewritten in place to add the missing sections (the
three-layer overview, full configuration details, the agents, the skills),
keeping status inside the one real, canonical document rather than
scattering it across new files.
