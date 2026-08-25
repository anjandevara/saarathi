# 12. Custom ARIA-based tabs (Details / Shipping)

**Why it exists in the demo:** Proves role=tab works on a hand-built widget (plain <div>s with ARIA roles), not just native HTML elements.

**Locator strategy:** role="tab" name="Details" | "Shipping".

**Reusable action function:** selectTab() / isTabSelected() in support/actions/tabs.actions.ts

**Page Object methods:** DemoPage.openShippingTab(), DemoPage.isShippingTabSelected()

**Test coverage:** Partially covered. "switches tabs" only exercises the Shipping tab. The Details tab, which is selected by default on page load, is never explicitly selected or asserted on by any test.

**Links:** [[../README|Back to the UI map index]]
