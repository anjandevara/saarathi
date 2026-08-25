# 14. Late-arriving button (1200ms delay)

**Why it exists in the demo:** Exists specifically to prove findElement() really waits for an element to appear, using Playwright's own waitFor(), instead of checking once and giving up. This is the framework's single most important resilience guarantee.

**Locator strategy:** role="button" name="Late Arriving Button".

**Reusable action function:** findElement() directly in support/locator-resolver.ts (no dedicated action function, a plain button click does not need one).

**Page Object methods:** DemoPage.clickLateArrivingButton(), DemoPage.isLateArrivingButtonVisible()

**Test coverage:** Covered, and proven non-vacuous. "finds and clicks a button that only appears 1200ms after page load". See LESSONS.md for the before/after proof (the fix was temporarily reverted, this test went red, then the fix was restored and it went green again).

**Links:** [[../README|Back to the UI map index]]
