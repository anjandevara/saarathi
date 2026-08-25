# 3. Terms and conditions checkbox

**Why it exists in the demo:** Proves the role plus accessible-name strategy, using only an aria-label.

**Locator strategy:** role="checkbox" name="Accept terms and conditions".

**Reusable action function:** setCheckbox() / isCheckboxChecked() in support/actions/checkbox.actions.ts

**Page Object methods:** DemoPage.acceptTerms(), DemoPage.isTermsAccepted()

**Test coverage:** Covered. "fills the whole demo form end to end".

**Links:** [[../README|Back to the UI map index]]
