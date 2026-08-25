# 1. Username textbox

**Why it exists in the demo:** Proves the placeholder-text fallback, this input has no id, no name, and no label at all.

**Locator strategy:** placeholder="Username" (no testId, no role+name, no label available, resolver falls through to placeholder).

**Reusable action function:** fillTextbox() / readTextboxValue() in support/actions/textbox.actions.ts

**Page Object methods:** DemoPage.fillUsername(), DemoPage.getUsernameValue()

**Test coverage:** Covered. "fills the login fields even though neither has a proper id".

**Links:** [[../README|Back to the UI map index]]
