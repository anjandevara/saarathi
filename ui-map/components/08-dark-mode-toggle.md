# 8. Dark mode toggle

**Why it exists in the demo:** Proves role=switch is treated as its own strategy, since a toggle built from a checkbox needs role=switch, not role=checkbox, to match how a screen reader would describe it.

**Locator strategy:** role="switch" name="Dark mode".

**Reusable action function:** setToggle() / isToggleOn() in support/actions/toggle.actions.ts

**Page Object methods:** DemoPage.setDarkMode(), DemoPage.isDarkModeOn()

**Test coverage:** Covered. "fills the whole demo form end to end".

**Links:** [[../README|Back to the UI map index]]
