# UI Map: Framework Demo Page

This is the honest inventory the project's own goal asked for: every HTML component used in demo-app/index.html, how the framework finds it, which reusable action function and Page Object method drive it, and whether a real test actually exercises it. One page (demo-app/index.html) means one set of linked component notes instead of a full route map, this page has no navigation between separate routes.

This map was built by hand this session (the ui-map-cartographer skill that inspired its format was not invocable from this environment), so treat the format as inspired by that skill's stated purpose rather than its exact internal process.

## Components

- [[components/01-username-textbox|1. Username textbox]]
- [[components/02-password-textbox|2. Password textbox]]
- [[components/03-terms-checkbox|3. Terms and conditions checkbox]]
- [[components/04-newsletter-checkbox|4. Newsletter opt-in checkbox]]
- [[components/05-plan-radio-group|5. Plan radio buttons (Basic / Pro / Enterprise)]]
- [[components/06-country-dropdown|6. Country dropdown]]
- [[components/07-volume-slider|7. Volume slider]]
- [[components/08-dark-mode-toggle|8. Dark mode toggle]]
- [[components/09-birth-date-picker|9. Birth date picker]]
- [[components/10-resume-file-upload|10. Resume file upload]]
- [[components/11-orders-table|11. Recent orders table]]
- [[components/12-demo-tabs|12. Custom ARIA-based tabs (Details / Shipping)]]
- [[components/13-terms-modal|13. Terms and conditions modal]]
- [[components/14-late-arriving-button|14. Late-arriving button (1200ms delay)]]

## Coverage manifest

Full means at least one test exercises the component's main path. Partial means a test exercises it but skips real variations (a second option, a second row, a default state). None means nothing exercises it at all. This table is the honest part, a green npm test run does not by itself mean every option of every component was actually tried.

| Component | Coverage | Detail |
|---|---|---|
| 1. Username textbox | Full | Covered. |
| 2. Password textbox | Full | Covered. |
| 3. Terms and conditions checkbox | Full | Covered. |
| 4. Newsletter opt-in checkbox | Full | Covered. |
| 5. Plan radio buttons (Basic / Pro / Enterprise) | Full | Covered (Pro only). |
| 6. Country dropdown | Full | Covered (India only, from fixtures/test-data.json). |
| 7. Volume slider | Full | Covered (value read from fixtures/test-data.json, set only, never read back). |
| 8. Dark mode toggle | Full | Covered. |
| 9. Birth date picker | Full | Covered (set only, never read back). |
| 10. Resume file upload | Full | Covered as of this map. |
| 11. Recent orders table | Partial | Partially covered. |
| 12. Custom ARIA-based tabs (Details / Shipping) | Partial | Partially covered. |
| 13. Terms and conditions modal | Full | Covered. |
| 14. Late-arriving button (1200ms delay) | Full | Covered, and proven non-vacuous. |

**Totals:** 12 full, 2 partial, 0 not covered, out of 14 components.

Partial coverage is not automatically a problem, a table only needs one row proven to trust the pattern generalizes. It is listed here so that call is made on purpose, not by accident.
