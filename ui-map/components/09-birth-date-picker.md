# 9. Birth date picker

**Why it exists in the demo:** Proves the testId strategy, the most reliable one, used here as the best-practice example for when a team does control the app's code.

**Locator strategy:** testId="birth-date".

**Reusable action function:** setDate() in support/actions/datepicker.actions.ts

**Page Object methods:** DemoPage.setBirthDate()

**Test coverage:** Covered (set only, never read back). "fills the whole demo form end to end".

**Links:** [[../README|Back to the UI map index]]
