# Configuration and Setup

This document covers how to install, configure, and run the framework, how
secrets are handled, how CI/CD is wired up, and how to move the whole thing
to a different machine.

## Prerequisites

- Node.js and npm installed.
- For a real test run, Playwright's own browsers, downloaded once with
  `npx playwright install` (this is a normal, one-time step on any real
  machine; it is only skipped inside certain sandboxed build environments
  where browsers are already pre-installed).

## Install and run

```bash
npm install
npx playwright install   # one-time, downloads real browsers
npm test                 # runs everything against the demo page, local environment
npm run test:smoke       # only tests tagged @smoke
npm run test:regression  # only tests tagged @regression
npm run test:headed      # same as npm test, but shows the browser window
npm run typecheck        # runs the TypeScript compiler with no output, just checks types
npm run check:guardrails # runs the house-rule enforcement script, see 03-coding-rules-and-style.md
npm run report:html:open           # opens the Playwright HTML report
npm run report:allure:generate     # builds the Allure report (needs Java installed)
npm run report:allure:open         # opens the Allure report
```

To point at a real environment instead of the demo page:

```bash
npm run test:dev
npm run test:qa
npm run test:prod
```

## The two kinds of configuration

Configuration is deliberately split into two categories, kept in two
different places, so secrets can never accidentally end up in git.

### Non-secret settings: `config/environments/<name>.env`

One file per environment: `local`, `dev`, `qa`, `prod`. As of this project,
the only value in these files is `BASE_URL`, the address of the application
under test.

```bash
# config/environments/dev.env
ENV_NAME=dev
BASE_URL=https://dev.your-real-app.example.com
```

`local` is a special case. Its `BASE_URL` is left blank on purpose. When
`ENV_NAME=local`, `support/env.ts` builds a `file://` path to the demo page
(`demo-app/index.html`) automatically. This is what lets `npm test` work on
a brand new machine with zero setup, no real app needed to try the
framework out.

Which environment a run uses is controlled by the `TEST_ENV` environment
variable. The npm scripts already set this for you (`npm run test:dev` sets
`TEST_ENV=dev`, and so on). It only needs to be set by hand when running
`npx playwright test` directly instead of through an npm script.

### Secrets: a root `.env` file, never committed

Amazon Web Services (AWS) credentials and the S3 bucket name never go in the
files above. They go in a root `.env` file, which `.gitignore` excludes from
version control on purpose. This file does not exist by default and needs
to be created:

```bash
# .env (create this yourself, never commit it)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
S3_BUCKET_NAME=your-bucket-name
```

These four variables are only needed if a test actually calls
`support/s3-data.ts` (uploading a file, or passing data between `@chained`
test suites). If nothing in the current tests uses S3, this file can be
skipped entirely: `support/env.ts` only loads it if it exists.

`support/s3-data.ts` builds its AWS client strictly from these four
environment variables and throws a clear error if any are missing. It never
falls back to a default or a guessed credential. This is a direct
application of the "never guess" rule that runs through the whole project
(see `03-coding-rules-and-style.md`).

### Real gap found and fixed: `.gitignore` did not actually exclude `.env`

Early in the project, `.gitignore` had a comment explaining that secrets
belong in a root `.env` file and should never be committed, but the file
itself did not list `.env` as an excluded pattern. The comment was a hope,
not an enforced rule. This was found and fixed; see `06-bugs-found-and-lessons.md`
for the full entry, including the guardrail check that now prevents this
specific gap from silently coming back.

In CI/CD, do not use a `.env` file at all. Set the same four variable names
directly in the pipeline's own secret settings instead (see the CI/CD
section below).

## CI/CD

Three ready-to-use pipeline files exist, all performing the exact same four
steps (install dependencies, install the browser, run the tests, publish the
reports), so the framework itself does not care which platform is used:

- `.github/workflows/playwright.yml`: GitHub Actions.
- `ci/Jenkinsfile`: Jenkins. Copy the contents into a job, or point a
  Pipeline job at this file directly.
- `ci/bitbucket-pipelines.yml`: Bitbucket Pipelines. Must be copied to the
  repository root as `bitbucket-pipelines.yml`, Bitbucket requires that
  exact file name and location.

All three platforms were deliberately supported at once, rather than picking
one, because the project was explicitly meant to be CI-agnostic.

Set the four AWS variables from the secrets section above directly in each
platform's own secret settings, never as a committed `.env` file:

- GitHub: repository Settings, then Secrets and variables, then Actions.
- Jenkins: Credentials.
- Bitbucket: Repository settings, then Repository variables.

### Two things worth knowing before relying on the CI files

- The Bitbucket pipeline uses Microsoft's official Playwright Docker image.
  That image's version tag must exactly match the `@playwright/test`
  version in `package.json`, or tests cannot launch a browser. Microsoft has,
  in the past, been slow to publish the image for a brand new patch version.
  If the exact tag in the file returns a 404, check
  `https://mcr.microsoft.com/en-us/product/playwright/tags` for the closest
  available one. This risk is documented directly as a comment in the file
  itself, and was deliberately not turned into an automated test, since
  proving it needs a real Bitbucket runner this project does not have access
  to (see `06-bugs-found-and-lessons.md`, "Honest limits" section).
- Generating the Allure report needs a real Java installation on the
  machine. GitHub's runners already have one. The Bitbucket pipeline
  installs one as part of its script, because the official Playwright
  Docker image does not include Java. Most Jenkins agents already have Java,
  since Jenkins itself needs it to run.
- The Jenkinsfile originally had a bug: a `when { expression { true } }`
  stage for generating the Allure report would not actually run after a
  failed test stage, because Jenkins declarative pipelines skip later
  stages once one stage fails. This was fixed by moving report generation
  into a `post { always { ... } }` block instead, the correct construct for
  "run this regardless of whether earlier stages passed or failed."

## Testing the framework on a different machine (for example, a friend's laptop)

This breaks into three separate pieces, and each one moves differently.

**The framework itself** is a normal folder of files. Copy it over (zip,
USB drive, or a git repository to clone). On the new machine: install
Node.js, run `npm install`, run `npx playwright install` once (a normal
step on a real machine, downloads real browsers), then `npx playwright
test`. The 14-component demo page ships inside the framework, so this alone
proves the core framework works on a machine that is not the original one,
with no real application needed.

**The six agents** live inside `.claude/agents/` in that same folder, so
they travel automatically when the folder is copied. But they only come
alive when Claude Code, or Cowork, is actually running on that machine,
pointed at that folder. If the other person does not have their own working
Claude Code (or Cowork) setup, the agent files just sit there as plain text
and do nothing.

**The two skills** are tied to a Claude account, not to a machine or a
folder. If the other person logs into the same Claude account, the skills
are already there, nothing to copy. If they have a separate account, the
skills are not there automatically, the two `.skill` files need to be sent
to them again so they can install and save them on their own account.

## A note on this project's own sandboxed build environment

While this framework was being built and verified inside a cloud sandbox
session, that sandbox had its own pre-installed Chromium build, which
sometimes did not exactly match the `@playwright/test` npm package version
installed in the project. This is not a real-world concern on a normal
laptop or a real CI runner, where `npx playwright install` downloads the
exact matching browser version. As a general-purpose escape hatch (useful
beyond just this sandbox, for example on a locked-down corporate machine
that cannot download browsers), `playwright.config.ts` supports an optional
`PLAYWRIGHT_CHROMIUM_PATH` environment variable that, if set, points
Playwright at a specific Chrome executable instead of the one it would
normally look for.
