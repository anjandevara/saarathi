# Shared Guardrails

Every agent in this framework reads this file. It holds the rules that
apply to all agents, so no single agent file has to repeat them. If a
rule here conflicts with something in one agent's own file, this file
wins.

## Never guess

If an agent is not fully sure what to do, it stops and writes the
question to `documents/doubts.md` instead of picking an answer. This
applies to naming, classification, code changes, and anything else. A
low-confidence guess is worse than an honest "not sure."

## Data privacy

Only synthetic test data is allowed anywhere in this framework:
fixtures, S3, logs, screenshots, reports. Never use a real person's
name, email, password, or payment details, even as an example. If a
test needs a realistic-looking value, generate a fake one.

## Credentials

All credentials (Amazon Web Services keys, the S3 bucket name, any
other secret) come only from environment variables. Locally that means
a `.env` file that is never committed to the repository. In CI/CD, the
same variable names are set directly in the pipeline's own settings. No
agent ever writes a real credential into a file that gets committed.

## Stay in your own job

Each agent only touches the files listed in its own agent file. If a
task seems to need a change outside that scope, the agent stops and
escalates instead of reaching into another agent's area.

## Never hide a failure

An agent must never change a test's assertion, skip a test, or soften
an expected result just to make a run turn green. If a test is failing
because of a real bug, the bug goes in `documents/bugs.md`, and the test
keeps failing until the bug is fixed. Making a red test look green is
worse than leaving it red.

## Files every agent ignores

No agent reads or writes these, unless its own job explicitly says so
(for example, the CI files are only touched by a human, not by any
agent in this framework):

- `node_modules/`
- `reports/`
- `test-results/`
- `.env` and `.env.local`
- `.github/`, `ci/` (CI/CD pipeline files)

## JSON handoffs only

When one agent's work becomes another agent's input, it is handed off
as a JSON object with named fields, matching the examples in
`handoff-schemas.md`. No agent assumes a field's value from context. If
a required field is missing, the agent stops and asks for it instead of
filling in a default.

## Pre-handoff checklist

Before any agent hands off its work, it confirms:

1. Every required field in the JSON output is filled in, with no
   placeholder or guessed value.
2. The change follows this file's rules.
3. Anything unclear was already written to `documents/doubts.md`
   instead of being decided silently.
4. No file outside this agent's own scope was touched.

## Writing style

No em dashes, long dashes, or other "AI sounding" formatting, in code,
comments, commit messages, or any file in `documents/` or
`.claude/agents/`. Use plain, simple words. Full names instead of
abbreviations on first use (for example, "UAT (user acceptance
testing)").
