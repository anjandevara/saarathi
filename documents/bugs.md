# Bugs

This file lists real bugs found while running tests. Only the
documentation-keeper agent writes to this file.

Format for each bug:

- Title
- Status: OPEN or FIXED (with the date it was fixed)
- Steps to reproduce
- Expected result
- Actual result
- Comment (optional)

When a bug is marked FIXED, the test that first caught it should still
run and should now pass. If it fails again later, change the status back
to OPEN and add a new comment with the date.

---

# Application under test: Saarathi (the command center app)

Found 2026-08-25 in a review-and-triage pass over the Saarathi source.
Each bug names the exact file so it can be confirmed and fixed.

## 1. Project selector chip looks clickable but does nothing

**Status:** FIXED 2026-08-25 in code; pending live browser retest on your machine

**Steps to reproduce:**
1. Open any Saarathi screen.
2. Move the mouse over the project chip in the top bar (the one showing
   "playwright-framework").
3. Click it. Try to reach it with the Tab key.

**Expected result:**
Either it opens a project switcher, or it does not look interactive.

**Actual result:**
It shows a pointer cursor and a hover highlight, so it looks clickable,
but it is a plain `<span>` with no click handler. Clicking does nothing.
It is also not reachable by keyboard and has no button role.

**Comment:**
`src/components/Chrome.tsx` line 30, styled by `.proj` and `.proj:hover`
in `globals.css`. Severity: medium. An affordance that lies is worse than
no affordance. Fix: make it a real `<button>` that opens a switcher, or
drop the pointer/hover styling until the switcher exists.

## 2. Every screen shows the same browser tab title "Saarathi"

**Status:** FIXED 2026-08-25 in code; pending live browser retest on your machine

**Steps to reproduce:**
1. Open the home screen, look at the browser tab title.
2. Navigate to Agents, then Signals, checking the tab title each time.

**Expected result:**
The tab title changes per screen, for example "Agents - Saarathi", so
tabs, history, and bookmarks are distinguishable.

**Actual result:**
All three screens show the identical title "Saarathi".

**Comment:**
`src/app/layout.tsx` sets a static `metadata.title`; the agents and
signals pages export no `metadata`. Confirmed live through the browser:
all three routes returned title "Saarathi". Severity: low to medium
(deep-linking, tab clarity, accessibility).

## 3. Layout breaks on windows narrower than about 1100px

**Status:** FIXED 2026-08-25 in code; pending live browser retest on your machine

**Steps to reproduce:**
1. Open the home screen.
2. Make the browser window narrower than roughly 1100px, or open on a
   small laptop or a phone.

**Expected result:**
The screen reflows cleanly with no overlapping elements.

**Actual result:**
The panels become static and stack, but the 3D canvas, the centered
"suite health" readout, and the corner frame stay fixed and full-screen,
so they float on top of the stacked content and overlap it.

**Comment:**
The `@media (max-width: 1100px)` block in `globals.css` only repositions
`.panel`, `.topbar`, and `.dock`. It does not handle `.core-readout`,
`#gl`, or `.frame`, which remain `position: fixed`. Severity: medium to
high on small screens. This is the biggest functional layout defect.

## 4. Activity feed is cut off and cannot be read in full

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. Open the home screen.
2. Read the "Activity" strip along the bottom.

**Expected result:**
The full activity text is readable, by wrapping, scrolling, a tooltip, or
a "view all" link.

**Actual result:**
The text is forced to one line and clipped with an ellipsis. Anything past
the visible width is lost, with no way to see it.

**Comment:**
`.ticker .stream` in `globals.css` (line 207): `white-space: nowrap;
overflow: hidden; text-overflow: ellipsis`. It is called a ticker but does
not move. Severity: medium (information loss).

## 5. Default framework favicon still ships

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. Open Saarathi.
2. Look at the browser tab icon.

**Expected result:**
A Saarathi icon (the teal wave mark).

**Actual result:**
The generic default icon from the app scaffold is shown.

**Comment:**
`src/app/favicon.ico` is the untouched scaffold icon. Severity: low
(branding). Easy fix.

## 6. No fallback when WebGL is unavailable

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. Open the home screen on a machine or browser where WebGL is disabled or
   blocked (some remote desktops and locked-down corporate machines).

**Expected result:**
A static image or a clear message where the 3D core would be.

**Actual result:**
The core area is blank. The setup code has no error handling, so the
failure is swallowed silently and nothing tells the user why the hero is
empty.

**Comment:**
`src/components/CommandCore.tsx`: the async setup has no try/catch and no
fallback UI. Severity: low to medium (graceful degradation). Reduced-motion
is handled, but WebGL-absent is not.

## 7. "Run history" is a single synthetic row, not real run data

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. Open the Signals screen.
2. Look at the "Run history" table.
3. Reload a few times and look again.

**Expected result:**
A history of actual test runs over time, each with its own timestamp.

**Actual result:**
One row, stamped at the moment the app first seeded its database, that
never grows and does not correspond to a real Playwright run.

**Comment:**
`src/lib/db.ts recordRunIfNew` de-duplicates identical runs, and the app
seeds one row from the scan on first load. There is no ingestion of real
run results yet. Severity: medium (the label promises more than it shows).

## 8. Agents panel says "6 ONLINE" while every agent reads "idle"

**Status:** FIXED 2026-08-25 in code; pending live browser retest on your machine

**Steps to reproduce:**
1. Open the home screen.
2. Read the Agents panel header and the rows.

**Expected result:**
Consistent status wording.

**Actual result:**
The header says "6 ONLINE" but all six rows say "idle", and the agents are
not actually running processes. "Online" overstates the real state.

**Comment:**
`src/app/page.tsx` Agents panel. Severity: low (wording and honesty).
Consider "6 configured" or showing how many are actually active.

## 9. Fixed panels can overlap on short window heights

**Status:** FIXED 2026-08-25 in code; pending live browser retest on your machine

**Steps to reproduce:**
1. Open the home screen.
2. Reduce the window height (short laptop, split screen).

**Expected result:**
Panels and the bottom dock never overlap.

**Actual result:**
The left and right panels are fixed at top 150px and the dock is fixed at
bottom 34px. On a short viewport they can overlap the dock, since nothing
constrains their height or reflows them.

**Comment:**
`globals.css` `.panel.left/.right` and `.dock`. Severity: low to medium,
height dependent.

## 10. Recommendations count is missing from the home summary

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. On the home screen, read the three count tiles (Bugs open, Doubts,
   Lessons).
2. Open Signals and note it also tracks Recommendations.

**Expected result:**
The home summary reflects the same categories the app tracks.

**Actual result:**
The home dock shows Bugs, Doubts, and Lessons, but not Recommendations,
so one tracked category is invisible on the main screen.

**Comment:**
`src/app/page.tsx` dock counts. Severity: low (consistency).

## 11. Open bug is hidden if the word "FIXED" appears anywhere in its body

**Status:** FIXED 2026-08-25 (verified: build + integration tests)

**Steps to reproduce:**
1. Add an OPEN bug whose comment mentions another bug, e.g.
   "same corner as bug 3, now FIXED, but this one still repros".
2. Load the Signals or Command screen and read the open-bug count.

**Expected result:**
The bug stays counted as OPEN. Only its own Status line decides if it is
fixed.

**Actual result:**
The scanner marked the bug resolved because the bare word FIXED appeared in
the body, so a real open bug vanished from the count. A second defect was
found in the same code: the bold status form the framework actually uses,
`**Status:** FIXED`, was matched only by that same over-broad rule, not by
the intended status-line check.

**Comment:**
`src/lib/scan.ts` `parseDocEntries`. Fix: a bug is resolved only when its
Status line says so (`/status:\s*\**\s*fixed/i`), which also correctly
reads the bold `**Status:** FIXED` form. Locked by two regression tests in
`tests-integration/scan.test.ts`. Severity: high for a QA tool, because it
could silently hide open bugs. Found by exploratory testing.
