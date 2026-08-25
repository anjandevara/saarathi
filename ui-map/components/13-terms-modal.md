# 13. Terms and conditions modal

**Why it exists in the demo:** Proves the role=dialog strategy, waiting for a native <dialog> to open and close.

**Locator strategy:** role="dialog" for the modal itself, and role="button" name="View Terms & Conditions" / "Close" for the two buttons that open and close it, both found through findElement(), same as every other component on this page.

**Reusable action function:** waitForModalVisible() / waitForModalClosed() in support/actions/modal.actions.ts

**Page Object methods:** DemoPage.openTermsModal(), DemoPage.closeTermsModal()

**Test coverage:** Covered. "opens and closes the terms modal".

**Links:** [[../README|Back to the UI map index]]
