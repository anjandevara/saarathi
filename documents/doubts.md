# Doubts

This file holds anything an agent could not classify or decide on its
own. An agent should never guess. If it is not sure, it writes the doubt
here and stops, instead of picking bug, recommendation, or healing on
its own judgment.

Format for each doubt:

- Title
- Status: OPEN or RESOLVED (with the date and what the human decided)
- Which agent got stuck
- What it was trying to do
- Why it could not decide
- Question for the human

A doubt only leaves this file once a human answers it here or in chat.
The documentation-keeper agent updates the status and outcome, it does
not decide the answer itself.

---

## EXAMPLE (delete this once a real doubt is logged)

### Should a slider stuck at 50 count as a bug or a flaky test?

**Status:** OPEN

**Which agent got stuck:** triage

**What it was trying to do:**
Classify a failed test where the volume slider action reported success
but the final value stayed at 50 instead of 75, on 2 out of 10 runs.

**Why it could not decide:**
It is not clear if this is a real bug in the app's slider, a timing
problem in the test, or a genuine flaky UI component. The failure rate
is too low and inconsistent to classify with confidence.

**Question for the human:**
Should this be logged as a bug, or should the test-implementer agent add
a stronger wait/assertion after setting the slider first, to rule out a
test problem before calling it a bug?
