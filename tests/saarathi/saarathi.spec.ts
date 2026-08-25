/**
 * tests/saarathi/saarathi.spec.ts
 *
 * The framework testing Saarathi on self: this suite drives the Saarathi
 * command center app (the thing that visualises this very framework) using
 * the framework's own resilient locators and Page Object rules.
 *
 * Run it against a live Saarathi dev server:
 *   TEST_ENV=saarathi npx playwright test tests/saarathi
 */
import { test, expect } from '../../support/base-test';
import { epic, feature, story, description } from 'allure-js-commons';
import { SaarathiPage } from '../../pages/02-saarathi.page';

test.describe('Saarathi command center: on-self checks', () => {
  // Every test starts from the command screen in a known state.
  test.beforeEach(async ({ page, logger }) => {
    // In this sandbox the browser cannot reach Google Fonts, and the pending
    // request would stall page load. Abort it so the page loads immediately.
    // On a normal machine the fonts load and this route simply never matches.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const saarathi = new SaarathiPage(page, logger);
    await saarathi.openHome();
  });

  test('loads the command screen with the live suite health @smoke @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Command screen');
    await story('The home command core loads and shows live status');
    await description(
      'WHAT: open the Saarathi home and confirm the core, wordmark, and live status render.\n' +
      'WHY: this is the flagship screen; if it loads with real status, the whole data path works.\n' +
      'HOW: find each element through findElement(), the same resilient strategy the framework uses.'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('Given I am on the Saarathi command screen', async () => {
      await expect(page).toHaveTitle('Saarathi');
    });

    await test.step('Then the brand and the 3D command core are present', async () => {
      expect(await (await saarathi.getWordmark()).isVisible()).toBe(true);
      expect(await (await saarathi.getCommandCore()).isVisible()).toBe(true);
    });

    await test.step('And the live status is shown', async () => {
      expect(await (await saarathi.getNominalBanner()).isVisible()).toBe(true);
      expect(await (await saarathi.getSuiteHealthLabel()).isVisible()).toBe(true);
      const triage = await saarathi.getByVisibleText('Triage', 'Triage agent in the agents panel');
      expect(await triage.isVisible()).toBe(true);
    });
  });

  test('navigates to the agents screen and shows the personas @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Agents screen');
    await story('Each agent is shown with its persona for attribution');
    await description(
      'WHAT: navigate to the agents screen and confirm the personas render.\n' +
      'WHY: personas are how the agent work reads like a team, not a black box.\n' +
      'HOW: click the Agents nav link, then find persona labels through findElement().'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('When I open the agents screen', async () => {
      await saarathi.goToAgents();
    });

    await test.step('Then the agents are shown with their personas', async () => {
      const diagnostician = await saarathi.getByVisibleText('The Diagnostician', 'Triage persona label');
      const mender = await saarathi.getByVisibleText('The Mender', 'Self-healer persona label');
      const planner = await saarathi.getByVisibleText('The Planner', 'Spec-writer persona label');
      expect(await diagnostician.isVisible()).toBe(true);
      expect(await mender.isVisible()).toBe(true);
      expect(await planner.isVisible()).toBe(true);
    });
  });

  test('navigates to the signals screen and shows real lessons and zero states @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Signals screen');
    await story('Real lessons are listed and empty categories show a zero count');
    await description(
      'WHAT: navigate to the signals screen and confirm real records and zero counts render.\n' +
      'WHY: the screen must show truth, real captured lessons and honest empty categories.\n' +
      'HOW: click the Signals nav link, then find the labels and a real lesson through findElement().'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('When I open the signals screen', async () => {
      await saarathi.goToSignals();
    });

    await test.step('Then the captured lessons are shown with a real count', async () => {
      // The count is read as a number rather than pinned to one, because
      // capturing a lesson is normal work, not a regression. What matters is
      // that the section reports a real count and that a real lesson from
      // LESSONS.md is listed under it, which the next assertion proves.
      const lessonsHeading = await saarathi.getByVisibleText(
        /Lessons \(\d+\)/,
        'Lessons section heading with its count'
      );
      const realLesson = await saarathi.getByVisibleText(
        'findElement() checked once instead of really waiting',
        'A real captured lesson from LESSONS.md'
      );
      expect(await lessonsHeading.isVisible()).toBe(true);
      expect(await realLesson.isVisible()).toBe(true);
    });

    await test.step('And the bugs category honestly shows zero', async () => {
      const bugsZero = await saarathi.getByVisibleText('Bugs (0)', 'Bugs section heading with zero count');
      expect(await bugsZero.isVisible()).toBe(true);
    });
  });

  // Real end-to-end regression checks that lock the fixes from the bug pass.
  // Each one fails on the pre-fix build, so they prove the fix, not just the app.
  test('the bug fixes hold: per-page titles, the Recs tile, and the app icon @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Bug-fix regression');
    await story('Fixes for bugs 5, 8, and 10 stay fixed');
    await description(
      'WHAT: confirm per-page browser titles, the home Recommendations tile, and the app icon.\n' +
      'WHY: these three fixes are silent if they regress, so a live check is the honest guard.\n' +
      'HOW: read the document title on each route, find the Recs tile, and request /icon.svg.'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('Given the home dock shows the Recommendations count (bug 10)', async () => {
      expect(await (await saarathi.getRecsTile()).isVisible()).toBe(true);
    });

    await test.step('When I open the Agents screen, its title is page-specific (bug 5)', async () => {
      await saarathi.goToAgents();
      await expect(page).toHaveTitle('Agents · Saarathi');
    });

    await test.step('And the Signals screen also has its own title (bug 5)', async () => {
      await saarathi.goToSignals();
      await expect(page).toHaveTitle('Signals · Saarathi');
    });

    await test.step('And the app serves its own icon, not the default favicon (bug 8)', async () => {
      const res = await page.request.get('/icon.svg');
      expect(res.status()).toBe(200);
      // A stray Next default favicon.ico should no longer be served.
      const old = await page.request.get('/favicon.ico');
      expect(old.status()).toBe(404);
    });
  });

  // The per-project rail is layout, and the Node integration suite cannot see
  // layout. These checks are the durable guard. They assert structure and one
  // invariant, never pixel offsets, so restyling the rail does not break them
  // but removing or unlabelling it does.
  test('the project rail lists every section and marks the open one @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Project rail');
    await story('The rail names the project sections and shows which one is open');
    await description(
      'WHAT: confirm the rail is a labelled landmark holding the five sections, and that the open one is marked.\n' +
      'WHY: the sections moved out of the top bar into the rail, so the rail is now the only way to reach them. ' +
      'If it disappears or stops marking the current section, the app loses its navigation silently.\n' +
      'HOW: find the rail by its navigation landmark and read aria-current, never a css class or a pixel position.'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('Given the rail is a labelled navigation landmark with every section', async () => {
      await expect(await saarathi.getRail()).toBeVisible();
      await expect(await saarathi.getRailSections()).toHaveText([
        'Overview',
        'Agents',
        'Test cases',
        'Data and fixtures',
        'Signals',
      ]);
    });

    await test.step('And the home marks Overview as the open section', async () => {
      await expect(await saarathi.getActiveRailSection()).toHaveText('Overview');
    });

    await test.step('When I open Test cases from the rail', async () => {
      await saarathi.goToRailSection('Test cases');
    });

    await test.step('Then the rail marks Test cases, and only that', async () => {
      await expect(await saarathi.getActiveRailSection()).toHaveText('Test cases');
      await expect(await saarathi.getActiveRailSection()).toHaveCount(1);
    });

    await test.step('And opening another section moves the mark with it', async () => {
      await saarathi.goToRailSection('Data and fixtures');
      await expect(await saarathi.getActiveRailSection()).toHaveText('Data and fixtures');
    });
  });

  test('the rail marks no section on the global Reports view @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Project rail');
    await story('Reports is global, so no project section is marked open');
    await description(
      'WHAT: open Reports and confirm the rail is still there with nothing marked as current.\n' +
      'WHY: Reports is not one of the project sections. Marking one of them would tell the reader they are ' +
      'somewhere they are not, and dropping the rail would strand them.\n' +
      'HOW: navigate to Reports, then assert the rail is present and aria-current matches nothing.'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('When I open Reports from the top bar', async () => {
      await saarathi.goToReports();
    });

    await test.step('Then the rail is still present', async () => {
      await expect(await saarathi.getRail()).toBeVisible();
      await expect(await saarathi.getRailSections()).toHaveCount(5);
    });

    await test.step('And no section is marked as the open one', async () => {
      await expect(await saarathi.getActiveRailSection()).toHaveCount(0);
    });
  });

  test('the layout never scrolls sideways at a narrow width @regression @readOnly', async ({ page, logger }) => {
    await epic('Saarathi');
    await feature('Project rail');
    await story('The rail collapses on a narrow screen without pushing the page sideways');
    await description(
      'WHAT: at a phone width, confirm the rail is still reachable and the document is not wider than the viewport.\n' +
      'WHY: a fixed rail is the classic cause of a page that slides sideways on a phone. This is the one ' +
      'geometric fact worth locking in, because it is felt by a reader rather than measured in pixels.\n' +
      'HOW: resize to a narrow viewport, then compare scrollWidth against clientWidth on the document.'
    );

    const saarathi = new SaarathiPage(page, logger);

    await test.step('When I view the app at a narrow width', async () => {
      await page.setViewportSize({ width: 390, height: 780 });
      await saarathi.openHome();
    });

    await test.step('Then the rail is still there', async () => {
      await expect(await saarathi.getRail()).toBeVisible();
      await expect(await saarathi.getRailSections()).toHaveCount(5);
    });

    await test.step('And the page does not scroll sideways', async () => {
      expect(await saarathi.scrollsSideways()).toBe(false);
    });

    await test.step('And a section page does not either', async () => {
      await saarathi.goToRailSection('Test cases');
      await expect(await saarathi.getActiveRailSection()).toHaveText('Test cases');
      expect(await saarathi.scrollsSideways()).toBe(false);
    });
  });
});
