# Recommendations

This file lists safe design suggestions found while testing. These are
not bugs. The app works, but something could be better or safer. Only
the documentation-keeper agent writes to this file.

Format for each recommendation:

- Title
- Status: SUGGESTED or IMPLEMENTED (with the date it was implemented)
- What was noticed
- Why it matters
- Suggested change

Once a developer ships the change and status becomes IMPLEMENTED, the
documentation-keeper agent sends a note to the spec-writer agent so a
real test case gets added for it. After that happens, add one line here
saying which test file covers it.

---

## EXAMPLE (delete this once a real recommendation is logged)

### Add a visible error message when the country dropdown is left blank

**Status:** SUGGESTED

**What was noticed:**
The form can be submitted with the country dropdown still on "Select a
country" and nothing tells the user this field was required.

**Why it matters:**
A user could submit an incomplete order without knowing why it failed
later.

**Suggested change:**
Show an inline error message next to the dropdown when the form is
submitted with no country chosen.

---

# Security review: Saarathi (2026-08-25)

A source-level security pass over `saarathi/web/src`. No exploitable
vulnerability was found. SQL uses parameterized `node:sqlite` statements
(no string-built queries). React escapes all output and the app uses no
`dangerouslySetInnerHTML`, `eval`, or `new Function`. File reads are scoped
to the trusted `SAARATHI_PROJECT_PATH` env var, not to any user input. The
two items below are hardening suggestions, not bugs. They matter only if
Saarathi is ever served beyond localhost.

## Add security headers and a Content-Security-Policy before any non-local deploy

**Status:** SUGGESTED

**What was noticed:**
The app sends no `Content-Security-Policy`, `X-Frame-Options`, or
`X-Content-Type-Options` headers. On localhost this is harmless.

**Why it matters:**
If Saarathi is ever exposed on a network, missing CSP and frame headers
widen the blast radius of any future markup mistake (clickjacking, injected
script).

**Suggested change:**
Add a `headers()` block in `next.config.ts` setting CSP,
`X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`. Gate it so
it only tightens, never breaks local dev.

## No authentication on the dashboard

**Status:** SUGGESTED

**What was noticed:**
Every route is public. There is no login. This is correct for a personal
localhost tool.

**Why it matters:**
Saarathi surfaces your project's bugs, run history, and file paths. If it
were hosted for a team without auth, anyone on the network could read it.

**Suggested change:**
Keep it localhost-only for now. If it is ever shared, put it behind the
team's existing auth (reverse proxy or a simple middleware check) before
exposing it.

