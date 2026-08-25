#!/usr/bin/env node
/**
 * check-guardrails.js
 *
 * Scans a Playwright test project and checks the rules that CAN be
 * checked by a machine, instead of only being written down as text.
 * This is not the full style guide (see the playwright-test-standards
 * skill for that). This script only checks what it can check reliably
 * and says so honestly in its own output.
 *
 * Usage:
 *   node scripts/check-guardrails.js [project-root]
 *
 * Exit code 0 means every check that ran found zero violations.
 * Exit code 1 means at least one violation was found.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(process.argv[2] || '.');

/** Walks a directory recursively and returns every file path matching the given extension list. */
function findFiles(startDir, extensions) {
  const results = [];
  if (!fs.existsSync(startDir)) {
    return results;
  }
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'reports' || entry.name === 'test-results') {
        continue;
      }
      results.push(...findFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Reads a file and returns its lines, or an empty array if it does not exist. */
function readLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf-8').split('\n');
}

/** One violation: which file, which line, what the problem is. */
function violation(filePath, lineNumber, message) {
  return { file: path.relative(projectRoot, filePath), line: lineNumber, message };
}

const checks = [];

// Check 1: no hard-coded wait times.
function checkNoHardCodedWaits() {
  const violations = [];
  const files = [
    ...findFiles(path.join(projectRoot, 'tests'), ['.ts']),
    ...findFiles(path.join(projectRoot, 'pages'), ['.ts']),
    ...findFiles(path.join(projectRoot, 'support'), ['.ts']),
  ];
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, index) => {
      if (/\.waitForTimeout\s*\(/.test(line)) {
        violations.push(
          violation(file, index + 1, 'Hard-coded wait (waitForTimeout). Use locator.waitFor() or an auto-retrying expect() instead.')
        );
      }
    });
  }
  return { name: 'No hard-coded wait times', filesChecked: files.length, violations };
}

// Check 2: no em dash or en dash characters (a common "AI sounding" tell).
// Scans every source and documentation file a person or an agent actually
// writes prose or comments into. This check used to miss root-level docs
// (README.md) and HTML fixtures (demo-app/index.html), which let 29 real
// em dashes hide in this project for a while. See LESSONS.md.
function checkNoLongDashes() {
  const violations = [];
  const files = [
    ...findFiles(path.join(projectRoot, 'tests'), ['.ts']),
    ...findFiles(path.join(projectRoot, 'pages'), ['.ts']),
    ...findFiles(path.join(projectRoot, 'support'), ['.ts']),
    ...findFiles(path.join(projectRoot, 'documents'), ['.md']),
    ...findFiles(path.join(projectRoot, '.claude', 'agents'), ['.md']),
    ...findFiles(path.join(projectRoot, 'demo-app'), ['.html']),
    ...fs.readdirSync(projectRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(projectRoot, entry.name)),
  ];
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, index) => {
      if (/[—–]/.test(line)) {
        violations.push(violation(file, index + 1, 'Em dash or en dash found. Use a comma, a colon, or a short sentence instead.'));
      }
    });
  }
  return { name: 'No em dashes or long dashes', filesChecked: files.length, violations };
}

// Check 3: spec files stay under 1000 lines.
function checkSpecFileSize() {
  const violations = [];
  const files = findFiles(path.join(projectRoot, 'tests'), ['.spec.ts']);
  for (const file of files) {
    const lines = readLines(file);
    // readLines splits on '\n', which counts one extra empty entry at the end of most files.
    const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    if (lineCount > 1000) {
      violations.push(violation(file, lineCount, `Spec file is ${lineCount} lines, over the 1000 line limit. Split it by feature area.`));
    }
  }
  return { name: 'Spec files under 1000 lines', filesChecked: files.length, violations };
}

// Check 4: agent and skill files stay under 500 lines.
function checkAgentSkillFileSize() {
  const violations = [];
  const files = [
    ...findFiles(path.join(projectRoot, '.claude', 'agents'), ['.md']),
    ...findFiles(projectRoot, ['SKILL.md']).filter((f) => path.basename(f) === 'SKILL.md'),
  ];
  for (const file of files) {
    const lines = readLines(file);
    const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    if (lineCount > 500) {
      violations.push(violation(file, lineCount, `File is ${lineCount} lines, over the 500 line limit. Move detail into a references folder.`));
    }
  }
  return { name: 'Agent and skill files under 500 lines', filesChecked: files.length, violations };
}

// Check 5: every test has at least one tag in its title.
// This only catches single-line test titles. A multi-line title will not be
// checked and is not counted as a violation, since this check cannot see it
// reliably. That gap is called out in the summary.
function checkEveryTestIsTagged() {
  const violations = [];
  let skippedMultiLine = 0;
  const files = findFiles(path.join(projectRoot, 'tests'), ['.spec.ts']);
  const testTitleLine = /\btest(?:\.only|\.skip|\.fixme)?\s*\(\s*(['"`])((?:(?!\1).)*)\1/;
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, index) => {
      const match = line.match(testTitleLine);
      if (match) {
        const title = match[2];
        if (!title.includes('@')) {
          violations.push(violation(file, index + 1, `Test title "${title}" has no @tag.`));
        }
      } else if (/\btest(?:\.only|\.skip|\.fixme)?\s*\(\s*$/.test(line)) {
        skippedMultiLine += 1;
      }
    });
  }
  return {
    name: 'Every test has a tag',
    filesChecked: files.length,
    violations,
    note: skippedMultiLine > 0 ? `${skippedMultiLine} test title(s) span more than one line and could not be checked here.` : null,
  };
}

// Check 6: spec files do not call raw Playwright locators directly (strict Page Object Model).
function checkNoRawLocatorsInSpecFiles() {
  const violations = [];
  const files = findFiles(path.join(projectRoot, 'tests'), ['.spec.ts']);
  const rawLocatorPattern = /\bpage\.(locator|getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|getByAltText|getByTitle)\s*\(/;
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, index) => {
      if (rawLocatorPattern.test(line)) {
        violations.push(
          violation(file, index + 1, 'Raw Playwright locator found directly in a spec file. Move it into a Page Object.')
        );
      }
    });
  }
  return { name: 'No raw locators in spec files (strict Page Object Model)', filesChecked: files.length, violations };
}

// Check 7: Page Objects use findElement(), not a raw Playwright locator.
// This is a different blind spot than check 6: a spec file can stay
// perfectly clean while the Page Object it calls quietly bypasses the
// resilient locator strategy instead. Found for real in this project's
// own demo.spec.ts modal methods, see LESSONS.md.
function checkNoRawLocatorsInPageObjects() {
  const violations = [];
  const files = findFiles(path.join(projectRoot, 'pages'), ['.page.ts']);
  const rawLocatorPattern = /\b(this\.)?page\.(locator|getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|getByAltText|getByTitle)\s*\(/;
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, index) => {
      if (rawLocatorPattern.test(line)) {
        violations.push(
          violation(file, index + 1, 'Raw Playwright locator found directly in a Page Object. Use findElement() from support/locator-resolver.ts instead.')
        );
      }
    });
  }
  return { name: 'Page Objects use findElement(), not raw locators', filesChecked: files.length, violations };
}

// Check 8: .gitignore actually excludes .env, so a real secret can never
// slip into version control. This check exists because that exact gap
// was found by hand once already (a comment about never committing
// credentials, with no actual .env exclusion behind it). See LESSONS.md.
function checkGitignoreExcludesEnv() {
  const violations = [];
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const filesChecked = fs.existsSync(gitignorePath) ? 1 : 0;
  if (!fs.existsSync(gitignorePath)) {
    violations.push(violation(gitignorePath, 1, '.gitignore file not found. Create one that excludes .env.'));
  } else {
    const lines = readLines(gitignorePath).map((line) => line.trim());
    if (!lines.includes('.env')) {
      violations.push(violation(gitignorePath, lines.length, '.gitignore does not exclude .env. A real secret could be committed by accident.'));
    }
  }
  return { name: '.gitignore excludes .env', filesChecked, violations };
}

checks.push(checkNoHardCodedWaits());
checks.push(checkNoLongDashes());
checks.push(checkSpecFileSize());
checks.push(checkAgentSkillFileSize());
checks.push(checkEveryTestIsTagged());
checks.push(checkNoRawLocatorsInSpecFiles());
checks.push(checkNoRawLocatorsInPageObjects());
checks.push(checkGitignoreExcludesEnv());

// Print results.
let totalViolations = 0;
console.log(`Guardrail check for: ${projectRoot}\n`);

for (const check of checks) {
  const status = check.violations.length === 0 ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${check.name} (${check.filesChecked} file(s) checked)`);
  for (const v of check.violations) {
    console.log(`  ${v.file}:${v.line}  ${v.message}`);
  }
  if (check.note) {
    console.log(`  Note: ${check.note}`);
  }
  totalViolations += check.violations.length;
  console.log('');
}

console.log('---');
console.log('What this script does NOT check, on purpose, because these need real judgment, not a pattern match:');
console.log('  - Simple OOP (skipping unneeded abstract classes or generic hierarchies)');
console.log('  - Preferring UI testing over direct API calls');
console.log('  - Object destructuring for test data');
console.log('  - Whether a comment actually explains the thing next to it');
console.log('  - One issue per bug or doubt report');
console.log('See the playwright-test-standards skill for those rules, and use human or agent code review for them.');
console.log('---\n');

if (totalViolations === 0) {
  console.log('All machine-checkable guardrails passed.');
  process.exit(0);
} else {
  console.log(`${totalViolations} violation(s) found. Fix them, then run this check again.`);
  process.exit(1);
}
