# 4. Newsletter opt-in checkbox

**Why it exists in the demo:** Proves the last-resort css fallback, the element has no id, no name, no aria-label, and its nearby text is deliberately not linked to it.

**Locator strategy:** css=".js-newsletter-opt-in" (every stronger strategy is unavailable on purpose).

**Reusable action function:** setCheckbox() / isCheckboxChecked() in support/actions/checkbox.actions.ts

**Page Object methods:** DemoPage.setNewsletterOptIn(), DemoPage.isNewsletterOptInChecked()

**Test coverage:** Covered. "selects a checkbox that has no label at all, using the css fallback".

**Links:** [[../README|Back to the UI map index]]
