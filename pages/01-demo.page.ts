/**
 * pages/01-demo.page.ts
 *
 * Page Object for the framework's own demo page (demo-app/index.html).
 * Each method is simple on purpose: find the element, do one thing, log it.
 * No clever typed return objects: just plain functions.
 */
import { Page } from '@playwright/test';
import { Logger } from '../support/logger';
import { fillTextbox, readTextboxValue } from '../support/actions/textbox.actions';
import { setCheckbox, isCheckboxChecked } from '../support/actions/checkbox.actions';
import { selectRadio, isRadioSelected } from '../support/actions/radio.actions';
import { selectDropdownOptionByLabel } from '../support/actions/dropdown.actions';
import { setSliderValue } from '../support/actions/slider.actions';
import { setToggle, isToggleOn } from '../support/actions/toggle.actions';
import { setDate } from '../support/actions/datepicker.actions';
import { getTableCellText } from '../support/actions/table.actions';
import { selectTab, isTabSelected } from '../support/actions/tabs.actions';
import { waitForModalVisible, waitForModalClosed } from '../support/actions/modal.actions';
import { uploadFile } from '../support/actions/file-upload.actions';
import { findElement } from '../support/locator-resolver';
import { env } from '../support/env';

export class DemoPage {
  constructor(private page: Page, private logger: Logger) {}

  async open(): Promise<void> {
    // Note: for real dev/qa/prod environments, baseURL is a normal http(s)
    // URL and pages usually navigate with a relative path, e.g. page.goto('/login').
    // The local demo runs from a single static file, so it navigates straight
    // to that file instead of appending a path to it.
    await this.page.goto(env.baseUrl);
    this.logger.step('Opened the demo page');
  }

  async fillUsername(value: string) {
    await fillTextbox(this.page, { placeholder: 'Username', description: 'Username textbox' }, value, this.logger);
  }

  async fillPassword(value: string) {
    await fillTextbox(this.page, { label: 'Password', description: 'Password textbox' }, value, this.logger);
  }

  async getUsernameValue(): Promise<string> {
    return readTextboxValue(
      this.page,
      { placeholder: 'Username', description: 'Username textbox' },
      this.logger
    );
  }

  async acceptTerms(checked: boolean) {
    await setCheckbox(
      this.page,
      { role: 'checkbox', name: 'Accept terms and conditions', description: 'Accept terms checkbox' },
      checked,
      this.logger
    );
  }

  async setNewsletterOptIn(checked: boolean) {
    // This one has no label and no aria-label in the markup, proving the
    // css fallback strategy, which is the honest last resort.
    await setCheckbox(
      this.page,
      { css: '.js-newsletter-opt-in', description: 'Newsletter opt-in checkbox' },
      checked,
      this.logger
    );
  }

  async isNewsletterOptInChecked(): Promise<boolean> {
    return isCheckboxChecked(
      this.page,
      { css: '.js-newsletter-opt-in', description: 'Newsletter opt-in checkbox' },
      this.logger
    );
  }

  async isTermsAccepted(): Promise<boolean> {
    return isCheckboxChecked(
      this.page,
      { role: 'checkbox', name: 'Accept terms and conditions', description: 'Accept terms checkbox' },
      this.logger
    );
  }

  async choosePlan(planName: 'Basic' | 'Pro' | 'Enterprise') {
    await selectRadio(this.page, { role: 'radio', name: planName, description: `${planName} plan radio` }, this.logger);
  }

  async isPlanSelected(planName: 'Basic' | 'Pro' | 'Enterprise'): Promise<boolean> {
    return isRadioSelected(
      this.page,
      { role: 'radio', name: planName, description: `${planName} plan radio` },
      this.logger
    );
  }

  async chooseCountry(countryLabel: string) {
    await selectDropdownOptionByLabel(
      this.page,
      { role: 'combobox', description: 'Country dropdown' },
      countryLabel,
      this.logger
    );
  }

  async setVolume(value: number) {
    await setSliderValue(this.page, { role: 'slider', name: 'Volume', description: 'Volume slider' }, value, this.logger);
  }

  async setDarkMode(on: boolean) {
    await setToggle(this.page, { role: 'switch', name: 'Dark mode', description: 'Dark mode toggle' }, on, this.logger);
  }

  async isDarkModeOn(): Promise<boolean> {
    return isToggleOn(
      this.page,
      { role: 'switch', name: 'Dark mode', description: 'Dark mode toggle' },
      this.logger
    );
  }

  async setBirthDate(isoDate: string) {
    await setDate(this.page, { testId: 'birth-date', description: 'Birth date picker' }, isoDate, this.logger);
  }

  async uploadResume(filePath: string) {
    await uploadFile(this.page, { label: 'Upload resume', description: 'Resume file upload' }, filePath, this.logger);
  }

  async getResumeFileName(): Promise<string> {
    const fileInput = await findElement(
      this.page,
      { label: 'Upload resume', description: 'Resume file upload' },
      this.logger
    );
    return fileInput.evaluate((input: HTMLInputElement) => input.files?.[0]?.name ?? '');
  }

  async getOrderStatus(rowIndex: number): Promise<string> {
    return getTableCellText(this.page, { role: 'table', description: 'Recent orders table' }, rowIndex, 1, this.logger);
  }

  async openShippingTab() {
    await selectTab(this.page, { role: 'tab', name: 'Shipping', description: 'Shipping tab' }, this.logger);
  }

  async isShippingTabSelected(): Promise<boolean> {
    return isTabSelected(this.page, { role: 'tab', name: 'Shipping', description: 'Shipping tab' }, this.logger);
  }

  async openTermsModal() {
    const openButton = await findElement(
      this.page,
      { role: 'button', name: 'View Terms & Conditions', description: 'Open terms modal button' },
      this.logger
    );
    await openButton.click();
    await waitForModalVisible(this.page, { role: 'dialog', description: 'Terms & Conditions modal' }, this.logger);
  }

  async closeTermsModal() {
    const closeButton = await findElement(
      this.page,
      { role: 'button', name: 'Close', description: 'Close terms modal button' },
      this.logger
    );
    await closeButton.click();
    await waitForModalClosed(this.page, { role: 'dialog', description: 'Terms & Conditions modal' }, this.logger);
  }

  // This button does not exist in the page until 1200ms after load (see
  // demo-app/index.html, section 14). findElement() must really wait for
  // it, not just check once at time zero. See LESSONS.md for why this
  // method and its test exist.
  async clickLateArrivingButton(): Promise<void> {
    const lateButton = await findElement(
      this.page,
      { role: 'button', name: 'Late Arriving Button', description: 'Late arriving button' },
      this.logger
    );
    await lateButton.click();
  }

  async isLateArrivingButtonVisible(): Promise<boolean> {
    const lateButton = await findElement(
      this.page,
      { role: 'button', name: 'Late Arriving Button', description: 'Late arriving button' },
      this.logger
    );
    return lateButton.isVisible();
  }
}
