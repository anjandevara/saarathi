# Project Overview: Playwright Automation Framework + Second Brain + Multi-Agent System

## What this document set is

This is the full knowledge base for a project built across many sessions with
Claude. It is meant to be uploaded to a tool like NotebookLM so the person
building this project never loses the reasoning, the rules, and the history
behind it, even in a brand new chat session.

This is not one document. It is a set of documents, each covering one part of
the project in depth. Read this file first, it explains how the others fit
together.

## The three-sentence version

A Playwright and TypeScript test automation framework that can find elements
on a web page even when the page has no clean ids, built by a small team of
single-job Claude Code agents, following house rules that are checked by a
real script instead of just written down. A companion "second brain" keeps a
copy of the real Playwright documentation up to date on a weekly schedule.
Two of the house rules were also packaged as portable Claude Skills, so they
follow the person to any future project, not just this one.

## The goal, in the builder's own words

Three connected pieces were asked for:

1. A "second brain": a knowledge base that mirrors the real Playwright
   documentation and stays updated on a schedule, so the project always has
   accurate, current Playwright knowledge to build from.
2. A Playwright and TypeScript automation framework, with a reusable action
   function per HTML component type, resilient locators for badly-structured
   apps, environment configuration, HTML and Allure reporting, structured
   logging, JSON test data fixtures, tags, hooks, and CI/CD files for GitHub
   Actions, Jenkins, and Bitbucket, all three, chosen deliberately to be
   CI-agnostic rather than locked to one platform.
3. A team of small, single-job Claude Code subagents that write, review, run,
   and heal the framework's tests, so the person is not hand-writing or
   hand-reviewing test code day to day.

Later in the project, two more things were added because gaps were found by
actually auditing the work rather than assuming it was complete: two
installable Claude Skills (the machine-checkable subset of the house rules,
plus the enforcement script that runs them), and an honest, hand-built map of
every UI component in the framework's demo page, showing exactly how well
each one is actually tested.

## The three layers of the finished project

The finished project is not one flat pile of files. It is three layers, and
each one behaves differently. This distinction came up directly in
conversation and is worth remembering:

1. **The framework itself.** A normal folder of TypeScript and config files.
   Fully portable: copy it, clone it, move it to another machine, it keeps
   working the same way everywhere, as long as Node.js is installed there.
2. **The multi-agent system**, living inside the framework folder at
   `.claude/agents/`. Six small subagent definitions. They travel with the
   framework folder (since they are just files inside it), but they only
   come alive when Claude Code, or Cowork, is actually running with that
   folder open as the working directory. Note: `.claude` is a dot-folder, so
   on a Mac, Finder hides it from view by default (reveal it with
   `Cmd+Shift+.`). This caused real confusion during the project, someone
   assumed the agents were "missing" when they were actually just hidden.
3. **Two companion Claude Skills**, installed to a Claude account rather than
   copied into the repo. Once installed, they work in any Claude session, on
   any Playwright project, not just this one. This is the opposite of the
   agents: the agents are repo-scoped, the skills are account-scoped.

See `04-multi-agent-system.md` and `05-skills.md` for the full detail on
layers 2 and 3.

## Target application

The framework was proven against a local demo HTML page shipped inside the
framework itself (`demo-app/index.html`), not a real production application.
This was a deliberate choice: it lets every part of the framework be tested
today, with zero setup, on any machine, without waiting for access to a real
app. The demo page was deliberately built with some fields missing ids and
labels, and one element that renders 1200 milliseconds late, specifically to
prove the framework's resilient-locator logic actually works on a
badly-structured, slow-rendering page, not just an ideal one.

## How to use this document set

- `00-overview.md`: this file. Read first.
- `01-framework-architecture.md`: how the Playwright framework itself is
  built, the resilient locator strategy, the Page Object Model, the reusable
  action functions, reporting.
- `02-configuration-and-setup.md`: how to install, configure, and run the
  framework, including secrets and CI/CD, and how to move it to another
  machine.
- `03-coding-rules-and-style.md`: the full house style, why each rule exists,
  and the person's own stated engineering preferences that shaped them.
- `04-multi-agent-system.md`: the six Claude Code subagents, their shared
  rules, their handoff formats, and what was deliberately not made into an
  agent.
- `05-skills.md`: the two installable Claude Skills, how they were built and
  tested, and how they differ from the agents.
- `06-bugs-found-and-lessons.md`: every real bug found in the framework's own
  code and tooling, across the whole project, with what broke, why it
  mattered, the fix, and the test that proves the fix actually works.
- `07-ui-component-map.md`: the honest, hand-built inventory of every UI
  component in the demo page and how well each is really tested.
- `08-decisions-and-rationale.md`: a decision log. Every real fork in the
  road during this project, and why one path was chosen over another.
- `09-glossary.md`: short definitions of every recurring term, for quick
  lookup.
- `10-open-items-and-next-steps.md`: what is still unverified or unfinished,
  stated honestly rather than left implicit.
