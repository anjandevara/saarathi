# 11. Recent orders table

**Why it exists in the demo:** Proves the role=table strategy for reading data out of a table, not just filling forms.

**Locator strategy:** role="table".

**Reusable action function:** getTableCellText() in support/actions/table.actions.ts

**Page Object methods:** DemoPage.getOrderStatus()

**Test coverage:** Partially covered. "reads the orders table" reads row 0 only (ORD-1001, Shipped). Row 1 (ORD-1002, Processing) is never read by any test.

**Links:** [[../README|Back to the UI map index]]
