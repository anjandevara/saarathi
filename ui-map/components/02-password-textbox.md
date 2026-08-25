# 2. Password textbox

**Why it exists in the demo:** Proves the label-wrapping fallback, the input has no id or name but is wrapped in a real <label>.

**Locator strategy:** label="Password" (no testId, no role+name available for a bare password input, label strategy matches).

**Reusable action function:** fillTextbox() in support/actions/textbox.actions.ts

**Page Object methods:** DemoPage.fillPassword()

**Test coverage:** Covered. "fills the login fields even though neither has a proper id" (fills it, does not read it back).

**Links:** [[../README|Back to the UI map index]]
