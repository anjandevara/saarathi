# Saarathi

Saarathi is a test-operations platform. A Playwright and TypeScript framework
does the testing; the Saarathi web app watches over it and, in time, will
drive it. The app even tests itself with the framework. The full plan is in
`docs/BLUEPRINT.md`. Read that before building anything non-trivial.

## Model

Use the latest, most capable Claude by default: Opus.

- At launch: `claude --model opus`
- Inside a session: `/model opus`

Sonnet is a fine, faster choice for routine mechanical edits if you want to
save time. Do not use `fable` here; that model is for your other project.

## The rule that matters most: be honest

- Never fake a passing test or a "done". If something is blocked, say so.
  "Ask a human" is a valid answer.
- Ground every claim in the real source. Read the actual code before you
  write or claim anything. Never guess a name, a locator, or a behavior.
- The code in git is the source of truth. Any database or catalog only
  mirrors it. If they disagree, the code wins.

## How we build

- Plan before you build. Show the exact file changes and get agreement
  before writing code.
- Keep code simple and match the style around it. No clever code.
- One issue per commit. Do not bundle many changes into one.
- Work on a branch. A pre-commit hook refuses a commit made on `main`. Git
  does not share hooks by itself, so turn it on once per clone:

      git config core.hooksPath .githooks

- Prefer checks a tool runs (lint, hooks, tests) over rules written in prose.
- No em-dashes or long dashes anywhere: not in code, comments, docs, or
  generated reports. Use commas, colons, or short sentences.

## Tests and framework rules

- Page Object Model. One numbered file per page. Simple methods, no complex
  typed return objects.
- Independent tests, no shared state. Each test owns its data.
- No hard waits (no `waitForTimeout`). Use Playwright web-first assertions.
- Two tag dimensions only: lifecycle (`@smoke`, `@regression`) and category
  (`@crud`, `@readOnly`, `@chained`). Do not invent new tags.

## The six agent personas

Planner (spec-writer), Builder (test-implementer), Critic (code-reviewer),
Diagnostician (triage), Mender (self-healer), Scribe (documentation-keeper).
Their definitions live in `.claude/agents/`.

## Stack

- App: `saarathi/web`. Next.js 16 (App Router), React 19, TypeScript,
  Tailwind v4, three.js for the 3D core, Node built-in SQLite (`node:sqlite`).
- Framework: repo root. Playwright and TypeScript, resilient locators,
  base-test fixtures, JUnit reporting.

## How to run

App:

    cd saarathi/web
    npm install
    SAARATHI_PROJECT_PATH="<absolute path to this repo>" npm run dev   # http://localhost:3000
    npm run build
    npm run test:integration          # config + scanner + SQLite tests

To watch more than one project, copy the example file and edit it:

    cd saarathi/web
    cp saarathi.projects.example.json saarathi.projects.json
    npm run dev

Each entry needs a `path`. The `id`, `name`, and `env` are optional and
default from the folder name. The file is gitignored because it holds
absolute paths for one machine. If it is missing or malformed, Saarathi logs
the reason and falls back to the single `SAARATHI_PROJECT_PATH` project, so
the one-project case stays one line.

The `id` is the key the run history is stored under. For this repo, set it to
`playwright-framework`, which is what the single-project fallback uses. Let it
default from the folder name and you get `playwright-ai-framework` instead, a
different key, so the runs already recorded stop showing until the id matches.

Framework, testing Saarathi on itself:

    TEST_ENV=saarathi npx playwright test tests/saarathi --config=playwright.saarathi.config.ts

## Phase 1 (what we are building now)

Reports plus multi-project, built only on data we already trust.

1. Multi-project: config lists more than one project, and a project switcher
   in the top bar. The data layer already isolates by `projectId`; keep it
   that way.
2. Reports: a Reports page with daily, weekly, pending, and project views
   from the mirror. A period with no run shows "no run", never a fake number.
   Add markdown and PDF export.

Do not build Phase 2 and beyond yet (the orchestrator, the git ladder, the
event ledger, and so on). The phased roadmap is in `docs/BLUEPRINT.md`.
