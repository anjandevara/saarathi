# The Two Companion Claude Skills

Partway through the project, the person pointed out that several things
discussed had not actually been followed through on, and asked for a
rigorous pass using the real skill-creator process rather than just writing
files and claiming success. This document covers the two real, packaged
Claude Skills that came out of that pass, how they were built and tested,
and how they differ from the six agents in `04-multi-agent-system.md`.

## Skills versus agents: the key difference

This distinction came up directly in conversation and is worth stating
plainly, since it caused real confusion:

- The six agents are **repo-scoped**. They live inside this framework's own
  `.claude/agents/` folder, and they only work when Claude Code (or Cowork)
  is open with this exact folder as the working directory. They reference
  exact file paths in this one repository.
- The two skills are **account-scoped**. They are packaged as `.skill`
  files (zip archives) and installed once to a Claude account, not copied
  into this repo. Once installed, they work in any Claude session, on any
  Playwright project, not just this one. This is the whole reason they were
  built as portable skills rather than as a seventh and eighth agent: the
  rules and the enforcement script they contain are general, not specific
  to this one repository, and the person is planning to build other
  projects with Claude's help, so a rule that only lives in this one repo
  would not follow them there.

Practically: a `.skill` file must actually be opened and saved by the
person to become an installed, usable skill. Sending the file is not the
same as it being installed, that distinction caused real confusion during
the project and is worth remembering.

## Why two skills instead of one

The person explicitly chose two separate skills over one combined skill:
a "rules" skill and an "enforcement" skill. This mirrors the same
small-focused-single-job principle used for the six agents. One skill
explains and teaches the full house style (subjective judgment plus
mechanical rules together). The other is only the part of those rules a
machine can check for certain, with zero judgment involved, packaged as a
real, runnable script.

## Skill 1: `playwright-test-standards`

The full written house style. See `03-coding-rules-and-style.md` for the
complete rule-by-rule content, this skill packages exactly that content plus
a `references/examples.md` file containing three complete, worked examples
(a reusable action function, a Page Object that uses it, a spec file that
uses the Page Object) so the whole pattern can be seen at once rather than
one rule at a time.

## Skill 2: `playwright-guardrail-check`

The enforcement half. Ships `scripts/check-guardrails.js`, the same script
also kept inside the framework repo itself at that same path, so
`npm run check:guardrails` works even without the skill installed. See
`03-coding-rules-and-style.md` for the full list of what it checks (eight
checks as of this project) and what it deliberately does not check. Every
violation it finds is printed with the exact file and line number, and it
exits with a non-zero code on any violation, so it can be wired into CI as
a real gate, not just an informational report someone has to remember to
read.

The skill's own `SKILL.md` explicitly documents, in its own words, what the
script does NOT check, so a clean run is never mistaken for a full review:
simple object-oriented design, preferring UI testing over API calls, object
destructuring, whether a comment actually explains the thing next to it,
one issue per report. Those stay the job of `playwright-test-standards` and
human or agent code review.

## How they were built and tested: the real skill-creator process

The person explicitly asked for "the full process: draft, real test cases,
review together" rather than a faster, less rigorous pass. The process
actually followed:

1. **Capture intent and interview.** Extracted what each skill should
   enable, when it should trigger, and the expected output format, largely
   from what had already been discussed and built earlier in the project.
2. **Write the SKILL.md draft** for each skill, following the progressive
   disclosure pattern: short frontmatter (name and a deliberately "pushy"
   description naming many trigger phrases, since skills otherwise tend to
   under-trigger), a body kept under the 500-line limit, with detail pushed
   into a `references/` folder as needed.
3. **Write real test-case prompts** (`evals/evals.json` for each skill),
   the kind of thing a real user would actually say, not artificial edge
   cases.
4. **Run every test case twice, in parallel, in the same turn**: once with
   the skill available (a "with-skill" subagent run), once without (a
   "baseline" subagent run, or the previous version of the skill for a
   later iteration). This "in the same turn" detail matters: the two runs
   need to finish under comparable conditions to be a fair comparison.
5. **Draft objectively verifiable assertions** for each test case while the
   runs were in progress, rather than idle waiting.
6. **Capture timing data** (`total_tokens`, `duration_ms`) from each
   subagent's completion notification, the only opportunity to capture it,
   since it is not persisted anywhere else.
7. **Grade each run** against its assertions, saving `grading.json` with
   `expectations[].{text, passed, evidence}` per run.
8. **Aggregate into a benchmark** with a script
   (`scripts.aggregate_benchmark`), producing pass rate, time, and token
   comparisons between the with-skill and baseline runs.
9. **Generate a static, browser-free review page** (`eval-viewer/generate_review.py --static`),
   since this project was built inside Cowork, a headless environment with
   no live browser to open a local server in. This produces a single HTML
   file with an "Outputs" tab (the actual generated files, side by side)
   and a "Benchmark" tab (the quantitative comparison).
10. **Package as `.skill` files** with `scripts.package_skill`, which
    validates the skill structure and automatically excludes the `evals/`
    working folder from the final package, since that folder is only
    needed during development, not at install time.

## A real friction point during this process, and how it was resolved

The review-HTML-file workflow above was genuinely confusing in practice. The
person had trouble understanding how to use the generated HTML files, and
what kind of feedback to give. This was resolved by explaining the
mechanics in plain language (open the file, click through Outputs and
Benchmark tabs, ignore the "Submit All Reviews" button since chat was being
used instead), and then, when that still was not landing well, by
abandoning the review-tool workflow entirely in favor of just showing
concrete before-and-after code differences directly in the conversation.
This is a real, useful lesson for future work with this same process: the
tooling is powerful but not always the fastest way to actually communicate
a result to a person, sometimes just showing the diff in chat is better.

A second real gap: at one point, only the eval-viewer review HTML files had
been sent, never the actual packaged `.skill` files themselves, so the
skills effectively did not exist anywhere the person could install them
until that was caught and fixed.

## Installing and using the two skills

If the `.skill` files have been sent (as file attachments in a
conversation), open each one and choose to save it to actually install it.
Once installed, no need to be inside this specific repo, any Claude session
can be asked something like "check my tests against the guardrails" or
"review this Playwright code against house style," on any Playwright
project, and the relevant skill should trigger.
