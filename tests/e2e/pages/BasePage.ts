import { Page, Locator } from '@playwright/test';

/**
 * Base page object with common functionality.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path relative to baseURL.
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for navigation to complete.
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get text content from an element.
   */
  async getTextContent(locator: Locator): Promise<string> {
    return (await locator.textContent()) ?? '';
  }

  /**
   * Check if an element is visible.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Wait for an element to be visible.
   */
  async waitForVisible(locator: Locator, timeout = 10000) {
    await locator.waitFor({ state: 'visible', timeout });
  }
}
