# Saarathi Blueprint: architecture and phasing plan (version 2)

This is the canonical plan. It turns Saarathi from a status screen into a
test-operations platform. Part one answers the product questions across 13
domains. Part two designs the engine and its guardrails. Each is sequenced
into phases so every slice is useful and honest on its own.

Naming is locked. System name: Saarathi. The six personas are Planner
(spec-writer), Builder (test-implementer), Critic (code-reviewer),
Diagnostician (triage), Mender (self-healer), Scribe (documentation-keeper).

## The core idea: an engine and a window

The dashboard is the window. The engine is the framework, the six agents,
the git repo, and the run machinery behind it. Nothing on any screen is
typed in by hand or invented. Every number, test, and result is read from a
real file that a real run produced. That is what keeps this a platform and
not a fancy dashboard.

## The four locked decisions

1. Deployment: local first, hosted soon. Runs on the laptop now, no login,
   SQLite. Built with the seams ready so accounts and a shared database are
   a later step, not a rebuild.
2. Phase one: reports plus multi-project.
3. Proof a test is real: artifacts per test. Every result links its real
   Playwright trace, video, screenshots, and result line.
4. Source of truth: code canonical, database mirrors it. The spec files in
   git are the one truth. The database is a fast catalog of them. If the two
   disagree, the code wins and the catalog is rebuilt.

## The data spine

The running spec files are the master record. A scan reads the repo and
rewrites a SQLite mirror that the screens read. None of it is authored by
hand, so the catalog can never quietly disagree with what runs. This makes
"ground in the real source, never let the agents drift from the facts" a
structural guarantee, not a promise.

## Part I: the 13 product domains (in brief)

Navigation and pages. Four top-level places (Command, Projects, Reports,
Settings) plus eight sections inside each project (Overview, Test cases, Runs,
Failures, Bugs, Traceability, Data and fixtures, Docs). The top bar is
identical everywhere; the nested rail appears only inside a project. All
sections read one mirror keyed by project.

Proof tests are real. Each result links trace, video, screenshots, the JUnit
line, and the commit. The app never writes its own pass. A bug is confirmed
fixed only when its test re-runs and passes and a regression test exists. A
recommendation counts as implemented only when its new test passes and the
suite stays green.

Authoring test cases. The Test cases page shows each test with title, tags,
Given/When/Then, page objects, requirement, and last result. Adding or
improving a test runs the agent pipeline (Planner, Builder, Critic), writes
real code first, shows the diff, runs it, and you approve.

Running and tags. Run per project, spec, or single test. Independent tests
run in parallel (capped at three workers); @chained tests run serial. Only
two tag dimensions exist, and agents never invent tags. A lint check caps
spec size and flags overloaded page objects.

Failures and traces. The Diagnostician reads the real evidence and classifies
a failure as brittleness, real bug, risky design, or unclear. Low confidence
goes to doubts, never a guess.

Bugs by category. Filed on facts: severity, area, type, and status. Severity
is machine-derived from the evidence; priority is suggested but human-owned.
The two are separate fields.

Traceability. A matrix links requirement to tests to latest result to bug,
built by reading a requirement annotation in each spec and rebuilt on every
scan. Full graph design is in Part II.

Data vs fixtures. Test data is the values a test feeds in (data/, JSON); a
fixture is the reusable stage it runs on (fixtures/, code). Generated data is
seeded; ephemeral data gets a unique key per run and is cleaned up; no real
PII, synthetic only.

Docs and conformance. The Docs page renders generated documentation. A
two-way check flags tests with no doc link and requirements with no test.

Git, PR, environments. Branch, write, verify on dev and staging, open a PR, a
human merges, then re-verify on the live environment. Production is read-only:
the runner refuses any non-@readOnly spec there. An environment is a policy
enforced at the runner, not a URL swap.

Reports and sharing. Daily, weekly, pending, and project reports from the
mirror, exportable as markdown or PDF. A no-run shows as "no run", never a
fake number. The exec summary is plain house style, no em-dashes.

Access and roles. No login while local. The user table and a role column are
designed in now, so login, roles, and an admin switch on when hosted.

Settings. Real settings screens for Projects, Environments, CI and CD, the
git provider, and Notifications. Secrets stored securely, not in a JSON file.

Notifications and integrations. Controls built now, channels connected later.
A house-style formatter writes the exec summary. A delivery log records sent
or failed. Scheduling prevents flooding.

## Part II: the engine and its guardrails

Understand first. Nothing is authored until the app is modeled. The
Application Model captures purpose, actors, features, rules, and states. The
Risk Strategy decides what to test and what to skip, recording the reason for
each skip. Only then do the techniques (equivalence partitioning, boundary
value, decision tables, state transition, use cases) turn the model into
tests and data. This is a mandatory gate before authoring.

The four-axis model. Every test is one point across four independent axes:
level (integration, system, acceptance; unit stays in the app repo), type
(functional or non-functional), design technique (black-box or
experience-based), and execution style (scripted or agent-assisted
exploratory).

The three-tier honest scope. Fully automated: smoke, functional regression,
CRUD, chained flows, API-to-UI contract, accessibility, gated visual
regression, negative input validation, read-only production sweep.
Agent-assisted: exploratory with suggested clues, UAT scenario prep,
accessibility triage. Purely human: usability judgment, business sign-off,
dedicated load and stress, deep security penetration. The platform never
claims tier three as its own.

The execution pipeline is a DAG, not a line. Triggers (PR, nightly,
post-deploy) are separate from sequence. Inside a run: static checks, then
the smoke gate (the only blocking prerequisite), then a parallel fan-out of
API, CRUD, chained, and non-functional, all feeding one four-layer artifact
bundle sealed with a SHA-256 hash. Impact-based selection runs only the tests
a PR touches.

The traceability graph is the backbone. Everything is a node, every
relationship a labeled edge (CONTAINS, COVERS, IMPLEMENTED_BY, USES, RAN_IN,
PRODUCED, FOUND, FIXED_BY, DOCUMENTED_BY). Edges are derived from code
annotations, imports, and run results, never typed. Two tables, nodes and
edges, rebuildable in full by one scan. Stable requirement IDs are the
linchpin. Impact analysis, the matrix, coverage gaps, and release readiness
are all queries over this graph.

Agent governance: agents propose, gates dispose. Auto-allowed actions are
read, scan, run read-only, and draft. Gated behind approval are any repo
write, pull request, assertion change, deletion, or staging and production
access. Token and time budgets bound every task, retry loops have a hard cap
that escalates to a doubt, agents never commit to main. Decisions are gated on
objective signals (a locator resolving to exactly one element, role and name
and text and geometry agreeing), not a self-reported confidence score.

Secrets and scrubbing. Secrets are referenced by key and resolved at runtime
from the OS keychain locally or a vault when hosted, never in git, config, or
the database. Before any trace, HAR, screenshot, or video is stored, a
sanitizer scrubs authorization and cookie headers and masks password and card
fields. That scrubber is a tested guardrail.

The flaky lifecycle. Detect (mixed results on one commit), confirm (re-run a
few times: all-fail goes to triage, mixed is a flake, all-pass is noise),
quarantine (@flaky, non-blocking, tracked in doubts), fix at the root cause,
exit only on a clean streak plus human approval.

The event ledger, tamper-evident. Every change is an append-only event with
id, timestamp, actor, type, subject, payload, and the hash of the previous
event, so deleting or editing one row breaks the chain. Code is canonical for
what the tests are; the ledger is canonical for what happened; the mirror and
graph are projections rebuildable by replay.

Release quality gates (eight), rising with each environment: smoke 100
percent, full regression green for staging, requirement coverage (every
release requirement maps to a passing test), zero open critical or P1
defects, zero unquarantined flakes, zero unapproved weakened assertions, zero
critical or serious accessibility violations on changed screens, and the
production read-only shield. An override is a signed waiver recorded in the
ledger with approver, reason, risk, and expiry. Done means green with
evidence, or green with recorded waivers.

## Phase roadmap

- Phase 1 (now): Reports plus multi-project. No backend needed.
- Phase 2: Read views over the code. Test cases, Traceability, Data and
  fixtures, Docs, Failure analysis, Bugs by category. Still no orchestrator.
- Phase 3: The orchestrator. Manual run triggers, live streaming, evidence
  capture, bug and recommendation confirmation re-runs. Authoring goes live.
- Phase 4: Git, PR, and the environment ladder, including the read-only
  production sweep and the release gates.
- Phase 5: Settings and notifications. Controls first, wiring when chosen.
- Phase 6: Hosting, login, roles, admin. The seams are ready from Phase 1.

## Honest risks

The orchestrator is the hardest piece and the one that makes Saarathi an
operator, not a viewer; until Phase 3, running and authoring are shown but
done by the user at the command line, and the screen says so. True daily
history needs a scheduled scan, so daily reports show gaps until that job
exists. Production safety depends on the read-only policy plus the check that
enforces it, which must be tested like any other guardrail. The whole plan
rests on the code staying canonical; flipping to database-canonical would
weaken every honesty guarantee here, so that choice should not be made
lightly.
