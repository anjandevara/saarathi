# Handoff Schemas

This file shows the exact JSON shape each agent hands to the next one.
Every field must be filled in. No agent assumes a value that is not in
the JSON it received.

## 1. spec-writer to test-implementer

```json
{
  "featureTitle": "Newsletter checkbox stays selected",
  "sourceType": "feature description",
  "tags": {
    "lifecycle": "regression",
    "category": "readOnly"
  },
  "givenWhenThen": [
    { "step": "given", "text": "the demo page is open" },
    { "step": "when", "text": "the user checks the newsletter opt-in checkbox" },
    { "step": "then", "text": "the checkbox shows as checked" }
  ],
  "existingComponentActionsToReuse": ["support/actions/checkbox.actions.ts"],
  "newComponentActionsNeeded": [],
  "targetSpecFile": "tests/demo/newsletter.spec.ts",
  "notes": "No new action function needed, checkbox.actions.ts already covers this."
}
```

## 2. test-implementer to code-reviewer

```json
{
  "specFile": "tests/demo/newsletter.spec.ts",
  "pageObjectFilesChanged": ["pages/01-demo.page.ts"],
  "actionFilesChanged": [],
  "actionFilesAdded": [],
  "lineCountOfSpecFile": 42,
  "usesHardCodedWait": false,
  "tagsPresent": ["@regression", "@readOnly"],
  "notes": "Reused checkbox.actions.ts, no new component action file needed."
}
```

## 3. code-reviewer to test run

```json
{
  "specFile": "tests/demo/newsletter.spec.ts",
  "reviewResult": "approved",
  "mechanicalFixesApplied": [
    "removed one abbreviation, spelled out 'UAT' on first use"
  ],
  "escalatedToDoubts": false,
  "readyToRun": true
}
```

If `reviewResult` is `"changes needed"`, the file goes back to
test-implementer with a `reasonsForRejection` array instead of moving to
a test run.

## 4. Test run to triage (one entry per failed test)

```json
{
  "testName": "fills the login fields even though neither has a proper id",
  "specFile": "tests/demo/demo.spec.ts",
  "status": "failed",
  "errorMessage": "Timed out waiting for locator to resolve",
  "screenshotPath": "reports/html-report/data/failure-1.png",
  "videoPath": "test-results/demo-demo-spec-ts/video.webm",
  "tracePath": "test-results/demo-demo-spec-ts/trace.zip",
  "logExcerpt": "[ERROR] Circuit breaker tripped after 3 strategies, aria snapshot attached"
}
```

## 5. triage to self-healer

```json
{
  "testName": "fills the login fields even though neither has a proper id",
  "classification": "test brittleness",
  "confidence": "high",
  "elementDescription": "Username textbox",
  "failingStrategy": "placeholder=\"Username\"",
  "ariaSnapshotExcerpt": "textbox \"Enter your username\"",
  "checkedLessonsLearnedForRepeat": true,
  "isRepeatBreak": false
}
```

If `classification` is `"real bug"`, `"recommendation"`, or `"doubt"`,
this goes to documentation-keeper instead, using the matching section
below.

## 6. triage to documentation-keeper (bug)

```json
{
  "testName": "checks newsletter checkbox survives reload",
  "classification": "real bug",
  "title": "Newsletter checkbox does not stay checked after page reload",
  "stepsToReproduce": [
    "Open the demo page",
    "Check the newsletter opt-in checkbox",
    "Reload the page"
  ],
  "expectedResult": "Checkbox stays checked after reload",
  "actualResult": "Checkbox is unchecked after reload",
  "comment": "Locator found correctly both times, this is not a test problem"
}
```

## 7. self-healer to documentation-keeper

```json
{
  "testName": "fills the login fields even though neither has a proper id",
  "elementDescription": "Username textbox",
  "oldStrategy": "placeholder=\"Username\"",
  "newStrategy": "placeholder=\"Enter your username\"",
  "isRepeatBreak": false,
  "healedSuccessfully": true
}
```

## 8. any agent to doubts.md (escalation)

```json
{
  "agentName": "triage",
  "title": "Should a slider stuck at 50 count as a bug or a flaky test?",
  "whatItWasTryingToDo": "Classify a failed slider test",
  "whyItCouldNotDecide": "Failure rate is low and inconsistent, 2 out of 10 runs",
  "questionForHuman": "Log as a bug, or add a stronger assertion first?"
}
```
