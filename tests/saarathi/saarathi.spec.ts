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

    await test.step('Then the four captured lessons are shown', async () => {
      const lessonsHeading = await saarathi.getByVisibleText('Lessons (4)', 'Lessons section heading');
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
});
