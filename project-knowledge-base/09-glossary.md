# Glossary

Short definitions of terms used throughout this project, for quick lookup.
Longer explanations live in the document named alongside each term.

**Action function.** A reusable function, one per HTML component type
(textbox, checkbox, dropdown, and so on), living in `support/actions/`,
that performs one interaction with that kind of element. See
`01-framework-architecture.md`.

**Circuit breaker.** The point at which every strategy in the resilient
locator fallback chain has failed. Instead of guessing, the framework
stops, captures an accessibility snapshot, and throws one clear error. See
`01-framework-architecture.md`.

**Documents folder (`documents/`).** Four living project record files:
`bugs.md`, `recommendations.md`, `doubts.md`, `lessons-learned.md`. Owned
only by the documentation-keeper agent. See `04-multi-agent-system.md`.

**Findelement / `findElement()`.** The core function that tries each
locator strategy in order and returns the first one that finds exactly one
match, or throws a clear error (a circuit breaker trip) if none do. See
`01-framework-architecture.md`.

**Handoff schema.** The exact JSON shape one agent hands to the next agent
in the pipeline. Defined with one worked example per pair in
`.claude/agents/_shared/handoff-schemas.md`. See `04-multi-agent-system.md`.

**Lessons Learned, two different files.** `documents/lessons-learned.md` is
the self-healer agent's log of locator strategies changing on a live
target app. Root-level `LESSONS.md` is about the framework's own source
code and tooling. Do not confuse the two. See `06-bugs-found-and-lessons.md`
and `08-decisions-and-rationale.md`.

**MAP prompt.** An early, pasted, monolithic prompt (Market, Action,
Process) combining locator strategy, healing, guardrails, and logging into
one large persona. Not adopted as a seventh agent, its useful pieces were
distributed into the right existing places instead. See
`08-decisions-and-rationale.md`.

**Multi-agent system.** The six Claude Code subagents living in
`.claude/agents/` inside the framework repository: spec-writer,
test-implementer, code-reviewer, triage, self-healer,
documentation-keeper. See `04-multi-agent-system.md`.

**Page Object / Page Object Model (POM).** A class, one per page
(`pages/NN-name.page.ts`), that owns every interaction with that page. A
test spec file never touches a raw Playwright locator directly, only calls
Page Object methods. See `01-framework-architecture.md` and
`03-coding-rules-and-style.md`.

**Resilient locator strategy / fallback chain.** The ordered list of ways
`findElement()` tries to find an element: testId, role and name, label,
placeholder, text, css, most reliable first. See
`01-framework-architecture.md`.

**Second brain.** The knowledge base of real Playwright documentation kept
inside the connected Claude Project, refreshed on a weekly scheduled task,
so the project's Playwright knowledge stays current. Separate from this
knowledge base, which is about the project itself, not about Playwright's
own documentation.

**Self-correcting build.** The discipline of turning every real bug found
into a checked, automated guardrail rather than a written note, and
proving each fix by deliberately breaking it and watching the guardrail
catch it before restoring the fix. See `06-bugs-found-and-lessons.md`.

**Skill (Claude Skill).** An installable capability, packaged as a
`.skill` file, attached to a Claude account rather than to one repository.
Two were built for this project: `playwright-test-standards` and
`playwright-guardrail-check`. Distinct from the repo-scoped agents. See
`05-skills.md`.

**Skill-creator process.** The rigorous method used to build and test the
two skills: draft, real test-case prompts, parallel with-skill and
baseline subagent runs, grading against assertions, an aggregated
benchmark, a review viewer, then packaging. See `05-skills.md`.

**Tags, lifecycle and category.** Every test carries two independent tags.
Lifecycle: `@smoke` or `@regression`. Category: `@crud`, `@readOnly`, or
`@chained`. See `01-framework-architecture.md`.

**UI map.** The hand-built, honest inventory of every HTML component in
the demo page, living in `ui-map/`, including a coverage manifest showing
which components are fully, partially, or not tested. See
`07-ui-component-map.md`.

**Vacuous test.** A test that always passes regardless of whether the code
it is supposed to guard is actually correct, meaning it guards nothing.
Every fix in this project claimed to be tested was proven non-vacuous by
deliberately breaking the fix and watching the test go red before
restoring it. See `06-bugs-found-and-lessons.md`.
