# Open Items and Next Steps

Stated plainly, so nothing unfinished is quietly implied to be done. This
is the honest punch list as of the most recent work on this project.

## Not yet verified, needs the person's own machine or session

- **The six subagents have never been run end to end inside a real Claude
  Code session.** The build environment used for this project cannot
  register a custom subagent type to invoke it. What has been checked: the
  agent files are well formed, under the size limits, and their JSON
  handoff shapes are internally consistent (hand-traced example by
  example against the shared schema file). What has not been checked:
  whether Claude Code actually picks them up correctly and behaves exactly
  as written, in a real session, with this project folder open. This is
  the single most important open item.
- **Whether the two `.skill` files were actually installed.** They were
  sent as file attachments, but a `.skill` file only becomes a usable,
  installed skill once it is opened and explicitly saved. There is no way
  to confirm from the build side whether that step happened.
- **The `ui-map-cartographer` skill was never actually usable in this
  build environment.** It is enabled at the account level but returned an
  "unknown skill" error when invoked directly. The UI map that exists was
  built by hand instead, inspired by that skill's stated purpose. If a
  future session has real access to that skill, comparing its output
  against the hand-built map would be worth doing.

## Known limitations, stated directly rather than hidden

- **Only proven against a local demo page, not a real application.** Expect
  real adjustments once this framework is pointed at an actual production
  app. The demo page's 14 components are a strong starting shape, not a
  guarantee every real app's components match exactly.
- **Custom-built (div-based) dropdowns are not covered.**
  `dropdown.actions.ts` only handles a native `<select>` element.
- **Two UI map components are only partially tested.** The orders table
  (only row 0 is ever read) and the custom tabs (only the "Shipping" tab
  is ever explicitly selected). See `07-ui-component-map.md` for detail.
- **Three CI/CD fixes could not be proven with an automated test,** since
  proving them needs real CI infrastructure this project's build
  environment does not have access to: the Jenkinsfile's
  `post { always {...} }` behavior, the Bitbucket pipeline's Java install
  step, and the Docker image tag risk in `bitbucket-pipelines.yml`. All
  three are documented directly as comments in their respective files
  instead of silently assumed correct.
- **The resilient locator strategy has a real, permanent limit.** A page
  with zero distinguishing test-ids, roles, labels, text, or unique CSS
  cannot be reliably automated by this framework, or by any tool. This is
  not a bug to eventually fix, it is a stated boundary of what browser
  automation can do.

## Reasonable next steps, in a sensible order

1. Confirm both `.skill` files are actually installed on the account that
   will be used going forward.
2. Open a real Claude Code (or Cowork) session with the framework folder
   as the working directory, and run the multi-agent pipeline end to end
   on a small, real example (for example, "add a test for the newsletter
   checkbox"), checking that each JSON handoff at each step actually
   matches its documented schema, and that a deliberately broken locator
   gets caught by self-healer and logged correctly, not silently ignored.
3. Point the framework at a real target application for the first time,
   expecting to add new component action functions (starting with a
   custom, div-based dropdown, since that is a known gap) as real
   components that do not fit the existing eleven types are encountered.
4. Once the framework has run against a real application for a while,
   revisit `documents/bugs.md`, `recommendations.md`, and
   `documents/lessons-learned.md` (not the same file as root-level
   `LESSONS.md`) to see what real patterns emerge that were not visible
   from the demo page alone.
5. Consider testing the two skills' triggering and usefulness against a
   wider, more varied set of real prompts than the initial evaluation set,
   since they were tested against a focused, deliberately realistic but
   still small set of test cases.

## Where the living status of this project actually lives

This knowledge base is a snapshot, useful for catching up quickly, but the
canonical, continuously updated status of this project lives in two real
places, not here:

- The connected Claude Project's own document,
  `claude/framework-plan.md`, which gets updated directly as the project
  progresses.
- The framework repository itself: `README.md`, `LESSONS.md`,
  `documents/*.md`, and `ui-map/`, all real, living files inside the
  project, not summaries about the project.

If this knowledge base and either of those two sources ever disagree,
trust the live sources, and treat this knowledge base as needing a refresh.
