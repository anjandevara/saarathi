# UI Component Map

This document summarizes the hand-built UI component map living at
`ui-map/` inside the framework, and the honest reasoning behind how it was
built.

## Why it exists

The project's own stated goal included gathering every HTML component used
and understanding the app's UI surface. `ui-map/README.md` plus fourteen
`ui-map/components/*.md` files, one per HTML component in
`demo-app/index.html`, are the answer: an honest inventory of every
component, how the framework finds it, which reusable action function and
Page Object method drive it, and whether a real test actually exercises it.

One page (the demo page) means one flat set of linked component notes,
instead of a full multi-route site map, since this page has no navigation
between separate routes to map.

## An important honesty note about how it was built

There is an account-level Claude Skill called `ui-map-cartographer`,
described as exactly this kind of task: mapping a web app's UI surface into
a linked markdown graph with an honest coverage manifest. It is enabled at
the account level, but it was not invocable through the Skill tool inside
the build environment used for this project (it returned an "unknown
skill" error, confirmed twice). Rather than silently pretend that skill was
used, the map was built by hand instead, deliberately following that
skill's stated purpose and format as inspiration, and this fact is stated
directly inside `ui-map/README.md` itself, not hidden. If a future session
has access to the real `ui-map-cartographer` skill, it would be worth
comparing its output against this hand-built version.

## Each component note's format

Every file in `ui-map/components/` follows the same shape:

- Where the component lives (which section of `demo-app/index.html`).
- Why it exists in the demo, meaning what it proves about the framework.
- Its locator strategy, meaning which of the six fallback strategies
  actually matches it.
- The reusable action function that drives it.
- The Page Object method or methods that call that function.
- Its real test coverage, stated honestly, including exactly which
  variations are and are not exercised.

## The coverage manifest, and why it is the honest part

The `ui-map/README.md` index includes a coverage manifest table with three
possible ratings per component:

- **Full**: at least one test exercises the component's main path.
- **Partial**: a test exercises the component, but skips a real variation
  (for example, a second dropdown option, a second table row, a default
  state that is never explicitly checked).
- **None**: nothing exercises this component at all.

As of this project: 12 of 14 components rated Full, 2 rated Partial, 0
rated None.

The two Partial components:

- **Recent orders table**: only row 0 (order ORD-1001, status "Shipped") is
  ever read by any test. Row 1 (ORD-1002, "Processing") is never read.
- **Custom ARIA-based tabs**: only the "Shipping" tab is ever explicitly
  selected and checked. The "Details" tab, selected by default on page
  load, is never explicitly selected or asserted on by any test.

The manifest states directly, in its own text, that partial coverage is not
automatically a problem, sometimes one proven row is enough to trust a
pattern generalizes, but it is listed here so that judgment call is made on
purpose, not by accident. This is the same honesty principle that runs
through the rest of the project: a green test run does not, by itself, mean
every option of every component was actually exercised, and the map exists
specifically to make that visible rather than implied.

## One real gap the map itself surfaced and helped fix

Building this map required re-examining every component's real behavior
directly against the source code, and this process is what surfaced the
terms modal bug described in `06-bugs-found-and-lessons.md`: the map's
draft description of the modal's Open and Close buttons originally said
they were found by a direct `getByRole()` call rather than through
`findElement()`, describing the bug as if it were an accepted, intentional
design choice. Once that bug was actually found and fixed in the real code,
the map's own description was corrected to match, rather than left stale
and describing behavior that no longer existed.
