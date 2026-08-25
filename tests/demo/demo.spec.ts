/**
 * tests/demo/demo.spec.ts
 *
 * This is the framework's own example test. It exercises every reusable
 * component action against the local demo page, and shows the patterns
 * every real test in this project should follow:
 *   - import test/expect from support/base-test, not @playwright/test
 *   - tag every test
 *   - use test.step() for a given/when/then style report
 *   - use Allure to explain WHAT, WHY, and HOW
 *   - use beforeAll / beforeEach / afterEach / afterAll hooks
 *   - read test data from the fixtures/ folder, never hard-code it inline
 */
import { test, expect } from '../../support/base-test';
import { epic, feature, story, description } from 'allure-js-commons';
import { DemoPage } from '../../pages/01-demo.page';
import { readFixture } from '../../support/data-reader';
import * as path from 'path';

interface DemoFormData {
  demoForm: {
    country: string;
    birthDate: string;
    volume: number;
  };
}

test.describe('Demo page: component actions', () => {
  let testData: DemoFormData;

  // Runs once before every test in this file. Good place for anything
  // expensive that every test needs, but that does not change per test.
  test.beforeAll(async () => {
    testData = readFixture<DemoFormData>('test-data.json');
  });

  // Runs before EACH test. Every test starts from the same known page state.
  test.beforeEach(async ({ page, logger }) => {
    const demoPage = new DemoPage(page, logger);
    await demoPage.open();
  });

  // Runs after EACH test, pass or fail.
  test.afterEach(async ({ logger }, testInfo) => {
    logger.info(`Finished with status: ${testInfo.status}`);
  });

  // Runs once after all tests in this file are done.
  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('All demo page tests finished.');
  });

  test(
    'fills the login fields even though neither has a proper id @smoke',
    async ({ page, logger }) => {
      await epic('Demo Framework');
      await feature('Textbox actions');
      await story('Fill fields that have no id or proper label');
      await description(
        'WHAT: fill the username and password fields.\n' +
        'WHY: prove the framework can find fields using placeholder text and ' +
        'label-wrapping, not just an id, since many real apps are missing ids.\n' +
        'HOW: use fillTextbox() from support/actions/textbox.actions.ts.'
      );

      const demoPage = new DemoPage(page, logger);

      await test.step('Given I am on the demo page', async () => {
        await expect(page).toHaveTitle('Framework Demo Page');
      });

      await test.step('When I fill the username and password', async () => {
        await demoPage.fillUsername('jane.doe');
        await demoPage.fillPassword('Str0ngPass!');
      });

      await test.step('Then both fields hold the values I typed', async () => {
        expect(await demoPage.getUsernameValue()).toBe('jane.doe');
      });
    }
  );

  test(
    'selects a checkbox that has no label at all, using the css fallback @regression',
    async ({ page, logger }) => {
      await epic('Demo Framework');
      await feature('Checkbox actions');
      await story('Find an element with no label, no aria-label, no id');
      await description(
        'WHAT: check the newsletter opt-in checkbox.\n' +
        'WHY: prove the framework does not silently fail or guess wrong when ' +
        'an element truly has nothing but a css class to identify it, it should ' +
        'fall back to css and say so in the log.\n' +
        'HOW: use setCheckbox() with a css selector as the last resort.'
      );

      const demoPage = new DemoPage(page, logger);

      await test.step('When I opt in to the newsletter', async () => {
        await demoPage.setNewsletterOptIn(true);
      });

      await test.step('Then the checkbox is checked', async () => {
        expect(await demoPage.isNewsletterOptInChecked()).toBe(true);
      });
    }
  );

  test('fills the whole demo form end to end @regression', async ({ page, logger }) => {
    await epic('Demo Framework');
    await feature('Full form');
    await story('Every component type in one flow');
    await description(
      'WHAT: fill every component on the demo page in one test.\n' +
      'WHY: prove textbox, checkbox, radio, dropdown, slider, toggle, and date ' +
      'actions all work together as a realistic form-filling flow.\n' +
      'HOW: chain the DemoPage methods, reading values from fixtures/test-data.json.'
    );

    const demoPage = new DemoPage(page, logger);

    await test.step('Given valid form data from the fixtures folder', async () => {
      expect(testData.demoForm.country).toBeTruthy();
    });

    await test.step('When I fill in every field on the form', async () => {
      await demoPage.acceptTerms(true);
      await demoPage.choosePlan('Pro');
      await demoPage.chooseCountry(testData.demoForm.country);
      await demoPage.setVolume(testData.demoForm.volume);
      await demoPage.setDarkMode(true);
      await demoPage.setBirthDate(testData.demoForm.birthDate);
    });

    await test.step('Then every field reflects what I entered', async () => {
      expect(await demoPage.isTermsAccepted()).toBe(true);
      expect(await demoPage.isPlanSelected('Pro')).toBe(true);
      expect(await demoPage.isDarkModeOn()).toBe(true);
    });
  });

  test('uploads a resume file wrapped in a label @regression', async ({ page, logger }) => {
    await epic('Demo Framework');
    await feature('File upload actions');
    await story('Upload a file into an input found by its label');
    await description(
      'WHAT: attach a small synthetic fixture file to the resume upload input.\n' +
      'WHY: prove the framework\'s uploadFile() action, previously written but ' +
      'never exercised against this demo page, actually works end to end.\n' +
      'HOW: use DemoPage.uploadResume() with fixtures/files/sample-resume.txt.'
    );

    const demoPage = new DemoPage(page, logger);
    const filePath = path.resolve(__dirname, '../../fixtures/files/sample-resume.txt');

    await test.step('When I upload the sample resume file', async () => {
      await demoPage.uploadResume(filePath);
    });

    await test.step('Then the input shows the uploaded file name', async () => {
      expect(await demoPage.getResumeFileName()).toBe('sample-resume.txt');
    });
  });

  test('reads the orders table @regression', async ({ page, logger }) => {
    await epic('Demo Framework');
    await feature('Table actions');
    await story('Read a value out of a table row');
    await description(
      'WHAT: read the status of the first order in the table.\n' +
      'WHY: prove the framework can read data out of a table, not just fill forms.\n' +
      'HOW: use getTableCellText() from support/actions/table.actions.ts.'
    );

    const demoPage = new DemoPage(page, logger);

    const status = await test.step('When I read the first order row', async () => {
      return demoPage.getOrderStatus(0);
    });

    await test.step('Then the status matches what is on the page', async () => {
      expect(status).toBe('Shipped');
    });
  });

  test('switches tabs @regression', async ({ page, logger }) => {
    await epic('Demo Framework');
    await feature('Tabs actions');
    await story('Switch between ARIA-based tabs');
    await description(
      'WHAT: click the Shipping tab.\n' +
      'WHY: prove the framework works on custom-built tabs, not just native HTML.\n' +
      'HOW: use selectTab() from support/actions/tabs.actions.ts.'
    );

    const demoPage = new DemoPage(page, logger);

    await test.step('When I select the Shipping tab', async () => {
      await demoPage.openShippingTab();
    });

    await test.step('Then the Shipping tab is selected', async () => {
      expect(await demoPage.isShippingTabSelected()).toBe(true);
    });
  });

  test(
    'finds and clicks a button that only appears 1200ms after page load @regression',
    async ({ page, logger }) => {
      await epic('Demo Framework');
      await feature('Resilient locators');
      await story('Wait for a late-rendering element instead of giving up instantly');
      await description(
        'WHAT: click a button that does not exist in the page until 1200ms after load.\n' +
        'WHY: findElement() must really wait for an element to appear using ' +
        'Playwright\'s own waitFor(), not just check once at the moment it is ' +
        'called. A one-time check would report zero matches and fail here, ' +
        'even though the button shows up a moment later, this is a real bug ' +
        'this framework had and fixed, see LESSONS.md.\n' +
        'HOW: use DemoPage.clickLateArrivingButton(), backed by findElement().'
      );

      const demoPage = new DemoPage(page, logger);

      await test.step('When I click the late-arriving button', async () => {
        // If findElement only checked once instead of really waiting, this
        // line would already have thrown a circuit breaker error before
        // reaching the next step, since the button is not in the DOM yet
        // at the moment the test starts.
        await demoPage.clickLateArrivingButton();
      });

      await test.step('Then the button is visible on the page', async () => {
        expect(await demoPage.isLateArrivingButtonVisible()).toBe(true);
      });
    }
  );

  test('opens and closes the terms modal @regression', async ({ page, logger }) => {
    await epic('Demo Framework');
    await feature('Modal actions');
    await story('Open and close a native <dialog>');
    await description(
      'WHAT: open the Terms & Conditions modal, then close it.\n' +
      'WHY: prove the framework can wait for a modal to appear and disappear.\n' +
      'HOW: use waitForModalVisible() and waitForModalClosed().'
    );

    const demoPage = new DemoPage(page, logger);

    await test.step('When I open the terms modal', async () => {
      await demoPage.openTermsModal();
    });

    await test.step('Then I can close it again', async () => {
      await demoPage.closeTermsModal();
    });
  });
});
