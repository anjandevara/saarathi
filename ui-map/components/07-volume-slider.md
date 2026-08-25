# 7. Volume slider

**Why it exists in the demo:** Proves the role plus accessible-name strategy on a <input type=range> identified only by aria-label.

**Locator strategy:** role="slider" name="Volume".

**Reusable action function:** setSliderValue() in support/actions/slider.actions.ts

**Page Object methods:** DemoPage.setVolume()

**Test coverage:** Covered (value read from fixtures/test-data.json, set only, never read back). "fills the whole demo form end to end".

**Links:** [[../README|Back to the UI map index]]
