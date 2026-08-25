# The Multi-Agent System

Six small Claude Code subagents live inside the framework at
`.claude/agents/`, each with exactly one job. This document explains what
each one does, the shared rules and handoff formats they all follow, and
what was deliberately kept out of the agent system entirely.

## Why six small agents instead of one big one

This follows directly from the standing preference: small, focused,
self-contained agents, one clear job each, a pipeline of small agents beats
one big agent. A large monolithic prompt trying to do everything (write
tests, review them, run them, triage failures, heal locators, and keep
documentation) would be harder to reason about, harder to fix when one part
of it misbehaves, and harder to trust. Splitting the work into six separate,
narrow jobs, each with its own file, its own tool access, and its own
explicit "when to stop and ask a human" rules, makes each one easy to read
end to end and easy to verify independently.

## Two shared files every agent reads

Instead of repeating the same rules in all six agent files, two shared files
hold the cross-cutting rules and formats:

### `.claude/agents/_shared/guardrails.md`

Rules that bind every agent:

- **Never guess.** If an agent is not fully sure what to do, it stops and
  writes the question to `documents/doubts.md` instead of picking an
  answer. This applies to naming, classification, code changes, everything.
  A low-confidence guess is treated as worse than an honest "not sure."
- **Data privacy.** Only synthetic test data is allowed anywhere: fixtures,
  S3, logs, screenshots, reports. Never a real person's name, email,
  password, or payment details, even as an example.
- **Credentials.** All credentials come only from environment variables,
  never hard-coded, never written into a committed file.
- **Stay in your own job.** Each agent only touches the files listed in its
  own agent file. If a task seems to need a change outside that scope, the
  agent stops and escalates instead of reaching into another agent's area.
- **Never hide a failure.** An agent must never change a test's assertion,
  skip a test, or soften an expected result just to make a run turn green.
  A real bug goes in `documents/bugs.md`, and the test keeps failing until
  the actual bug is fixed. A red test that gets quietly made to look green
  is treated as worse than a red test that stays red.
- **Files every agent ignores**, unless its own job explicitly says
  otherwise: `node_modules/`, `reports/`, `test-results/`, `.env` and
  `.env.local`, `.github/` and `ci/` (the CI/CD pipeline files, only ever
  touched by a human in this project).
- **JSON handoffs only.** One agent's work becomes another agent's input as
  a JSON object with named fields, matching the shapes in
  `handoff-schemas.md`. No agent assumes a field's value from context.
- **Pre-handoff checklist**, confirmed before any agent hands off its work:
  every required JSON field is filled in with no placeholder or guessed
  value, the change follows the guardrails, anything unclear was already
  written to doubts.md, no file outside the agent's own scope was touched.
- **Writing style.** No em dashes, long dashes, or other "AI sounding"
  formatting, anywhere. Full names instead of abbreviations on first use.

### `.claude/agents/_shared/handoff-schemas.md`

One example JSON object per handoff pair in the pipeline, so every agent has
a concrete shape to match, not just a description. The eight handoff shapes
are: spec-writer to test-implementer, test-implementer to code-reviewer,
code-reviewer to test run, test run to triage, triage to self-healer, triage
to documentation-keeper (bug), self-healer to documentation-keeper, and any
agent to doubts.md (the general escalation shape). Every field in every
example is named explicitly, no agent is expected to infer a field's meaning
from context.

## The six agents, in pipeline order

### 1. spec-writer

One job: turn a feature description, a bug report, or a resolved doubt into
a structured Given/When/Then test plan. This agent never writes test code,
only the plan. Before proposing anything, it checks `pages/` and
`support/actions/` to see whether an existing Page Object or action
function already covers what is needed, so it never proposes a redundant
new one. It decides both tags (lifecycle and category) and marks a test
`chained` if it depends on another test's data. Stops and asks (writes to
`doubts.md`) when the feature description is too vague, when it is unclear
whether an existing action already covers the element in question, or when
the expected result is not stated anywhere in the input.

### 2. test-implementer

One job: take spec-writer's JSON plan and write the actual `.spec.ts` file
plus any needed Page Object changes. Follows the full coding rules in
`03-coding-rules-and-style.md`: strict Page Object Model, reuse existing
action functions before adding a new one, no hard-coded waits, object
destructuring, one short comment per test and function, spec files under
1000 lines, chained tests wrapped in serial mode, both tags present on every
test. Uses `support/s3-data.ts` for large test data or files to upload,
never a hard-coded local path or a large file checked into fixtures. Stops
and asks when the plan references an action function that does not exist
and it is unclear what a new one should look like, or when the plan is
missing information needed to write a real assertion.

### 3. code-reviewer

One job: check a spec file that test-implementer just wrote or changed
against the house style rules, fixing mechanical problems directly and
escalating real design questions instead of guessing.

What counts as a safe, mechanical fix it can apply directly: spelling out an
abbreviation, replacing an obvious hard-coded wait with the matching
Playwright wait, rewording a comment to remove "AI sounding" phrasing
without changing its meaning, adding a tag that was clearly specified in the
plan but left out by mistake.

What is explicitly not a mechanical fix, and must be escalated instead: a
missing assertion or one that seems to test the wrong thing, a locator
strategy that looks wrong but might be intentional, any change that would
alter what the test actually verifies.

If everything not mechanical looks correct, `reviewResult` is set to
"approved" and the file moves to a real test run. If a non-mechanical
problem is found, `reviewResult` is set to "changes needed" with reasons,
and it goes back to test-implementer instead.

### 4. triage

One job: read a failed test's result, given as JSON (error message,
screenshot path, video path, trace path, a log excerpt), and classify it as
exactly one of four things:

1. **Test brittleness**: the app's behavior is correct, but a locator or
   timing assumption in the test broke, for example a placeholder text
   changed. Goes to self-healer.
2. **Real bug**: the app itself is not doing what it should. Goes to
   documentation-keeper as a bug entry.
3. **Recommendation**: the app works, but something looks risky or unclear
   even though the test technically passed. Goes to documentation-keeper as
   a recommendation entry.
4. **Doubt**: not enough information to tell which of the above this is.
   Stays open until a human decides.

Before classifying, triage always checks `documents/lessons-learned.md` for
whether this same element has broken before. If it has, the classification
still proceeds normally, but `isRepeatBreak` is flagged true in the
handoff, because a repeat break is treated as a signal worth a human look,
not something to keep quietly patching. Low confidence is always routed to
a doubt, never forced into one of the other three categories just to avoid
writing a doubt entry.

### 5. self-healer

One job: repair a broken locator, but only after triage classifies a
failure as test brittleness, and only within the framework's own existing
fallback chain (testId, role and name, label, placeholder, text, css). This
agent never invents a brand new selector by guessing at DOM similarity. That
restriction is deliberate and directly narrows a looser idea from an early
draft prompt for this project (see `08-decisions-and-rationale.md`, the MAP
prompt entry, for why "closest semantic alternative" language was rejected
in favor of this stricter rule).

If every strategy in the defined chain fails to find a unique match, that is
a circuit breaker trip, exactly like inside `findElement()` itself, and it
goes to `documents/doubts.md`, not a silent retry loop. If the same element
has broken before (`isRepeatBreak: true`), self-healer refuses to heal it
again silently and escalates instead. After a successful heal, it re-runs
only the one affected test to confirm the fix actually works, rather than
assuming it does, then hands off to documentation-keeper so the event gets
recorded in `documents/lessons-learned.md`.

### 6. documentation-keeper

One job, and the only agent allowed to write to the four files in
`documents/`: `bugs.md`, `recommendations.md`, `doubts.md`, and
`lessons-learned.md`. This keeps the format of those files consistent and
keeps a single place responsible for status transitions:

- **bugs.md**: title, status (OPEN or FIXED with date), steps to reproduce,
  expected result, actual result, optional comment. Status moves to FIXED
  once a previously failing test passes again on retest.
- **recommendations.md**: title, status (SUGGESTED or IMPLEMENTED with
  date). Once a human confirms a recommendation shipped, status becomes
  IMPLEMENTED and a note goes to spec-writer to turn it into a real test
  case.
- **doubts.md**: title, status (OPEN or RESOLVED with date and decision),
  which agent got stuck, what it was trying to do, why it could not decide,
  the question for the human. Status only becomes RESOLVED when a human
  actually answers it.
- **lessons-learned.md**: date, test name, element description, old
  strategy, new strategy, whether it was a repeat. One entry per healing
  event from self-healer. This file is the self-healer's own operational
  log, distinct from the project's root-level `LESSONS.md`, which is about
  the framework's own source code and tooling, see
  `06-bugs-found-and-lessons.md`.

## What was deliberately NOT made into an agent

Two things that could look like agent work were built as plain
deterministic code instead, because turning them into LLM agents would add
cost and risk with no real benefit:

- **Running the test suite.** `npx playwright test` with the right
  tags and workers is a shell command, not a judgment call. Owned directly
  by whatever session is driving the pipeline.
- **S3 data read and write.** Uploading a created form's data, or
  downloading a large fixture file, is a fixed operation, not something
  that benefits from a language model's judgment. Built as
  `support/s3-data.ts`, a plain utility function set.

## Honest limit on this whole layer

The six agent files were designed and written, and verified to be well
formed (under the size limits, and with JSON handoff shapes that are
internally consistent, hand-traced example by example). What could not be
verified from inside the build session: actually invoking one of these six
agents end to end inside a real, running Claude Code session. That
environment cannot register a custom subagent type to prove it runs, since
it is not itself a Claude Code session with this project open. That final
check is still open and needs the person's own Claude Code (or Cowork)
session, with this project folder open, to confirm the agents actually get
picked up and behave as written. See `10-open-items-and-next-steps.md`.
