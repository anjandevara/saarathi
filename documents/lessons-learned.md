# Lessons Learned

This file is the framework's memory of self-healing. Every time the
self-healer agent changes a locator strategy for an element, it adds one
entry here. This is what lets the framework learn from past mistakes
instead of repeating them silently. Only the documentation-keeper agent
writes to this file, using details handed to it by the self-healer
agent.

Format for each entry:

- Date
- Test name
- Element description
- Old strategy (the one that stopped working)
- New strategy (the one that now works)
- Repeat: yes or no (yes means this same element broke before)

If an element shows Repeat: yes, the self-healer agent does not heal it
again on its own. It escalates to doubts.md instead, because breaking
the same element more than once is a signal worth a human look, not
something to keep quietly patching.

---

## EXAMPLE (delete this once a real healing event is logged)

**Date:** 2026-08-23

**Test name:** fills the login fields even though neither has a proper id

**Element description:** Username textbox

**Old strategy:** placeholder="Username"

**New strategy:** placeholder="Enter your username"

**Repeat:** no
