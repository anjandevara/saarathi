# 5. Plan radio buttons (Basic / Pro / Enterprise)

**Why it exists in the demo:** Proves the role plus accessible-name strategy on a group of same-named radio inputs, each wrapped in its own <label>.

**Locator strategy:** role="radio" name="Basic" | "Pro" | "Enterprise".

**Reusable action function:** selectRadio() / isRadioSelected() in support/actions/radio.actions.ts

**Page Object methods:** DemoPage.choosePlan(), DemoPage.isPlanSelected()

**Test coverage:** Covered (Pro only). "fills the whole demo form end to end". Basic and Enterprise are never selected by any test.

**Links:** [[../README|Back to the UI map index]]
