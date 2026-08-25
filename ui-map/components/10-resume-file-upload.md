# 10. Resume file upload

**Why it exists in the demo:** Proves the label-wrapping strategy on a <input type=file>, and that a component action written early in the project can sit completely unused until something actually calls it.

**Locator strategy:** label="Upload resume".

**Reusable action function:** uploadFile() in support/actions/file-upload.actions.ts

**Page Object methods:** DemoPage.uploadResume(), DemoPage.getResumeFileName()

**Test coverage:** Covered as of this map. "uploads a resume file wrapped in a label", using fixtures/files/sample-resume.txt. Before this entry was added, this component action existed in the codebase but was never imported by any Page Object or exercised by any test, a real, previously silent coverage gap.

**Links:** [[../README|Back to the UI map index]]
