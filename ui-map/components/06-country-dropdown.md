# 6. Country dropdown

**Why it exists in the demo:** Proves the role strategy on a native <select> with no id, no name, and no <label>, only nearby unlinked text.

**Locator strategy:** role="combobox" (unique by role on this page, no name given).

**Reusable action function:** selectDropdownOptionByLabel() in support/actions/dropdown.actions.ts

**Page Object methods:** DemoPage.chooseCountry()

**Test coverage:** Covered (India only, from fixtures/test-data.json). "fills the whole demo form end to end". United States and United Kingdom options are never selected by any test.

**Links:** [[../README|Back to the UI map index]]
