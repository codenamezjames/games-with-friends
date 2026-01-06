import { Page, Locator, expect } from '@playwright/test';
import { GamePage } from './GamePage';

/**
 * Page object for solo practice mode.
 * Extends GamePage with solo-specific functionality.
 */
export class SoloGamePage extends GamePage {
  // Solo-specific locators
  readonly header: Locator;
  readonly scoreDisplay: Locator;
  readonly wordCountDisplay: Locator;
  readonly resultsModal: Locator;
  readonly playAgainButton: Locator;
  readonly backToMenuButton: Locator;
  readonly shareResultsButton: Locator;

  constructor(page: Page) {
    super(page);

    this.header = page.getByText('Solo Practice');
    this.scoreDisplay = page.locator('.text-2xl.font-bold.text-primary');
    this.wordCountDisplay = page.locator('text=/\\d+ word/');
    this.resultsModal = page.locator('[class*="modal"], [class*="Modal"]');
    this.playAgainButton = page.getByRole('button', { name: /play again/i });
    this.backToMenuButton = page.getByRole('button', { name: /back to menu/i });
    this.shareResultsButton = page.getByRole('button', { name: /share/i });
  }

  /**
   * Navigate to solo practice mode.
   */
  async goto() {
    await this.page.goto('/games/wordtrace/solo');
  }

  /**
   * Get current score.
   */
  async getScore(): Promise<number> {
    const text = await this.getTextContent(this.scoreDisplay);
    return parseInt(text) || 0;
  }

  /**
   * Get word count.
   */
  async getWordCount(): Promise<number> {
    const text = await this.getTextContent(this.wordCountDisplay);
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Wait for results modal to appear.
   */
  async waitForResults(timeout = 180000) {
    await this.resultsModal.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if results modal is visible.
   */
  async hasResultsModal(): Promise<boolean> {
    return this.resultsModal.isVisible();
  }

  /**
   * Get final score from results modal.
   */
  async getFinalScore(): Promise<number> {
    const scoreElement = this.resultsModal.locator('.text-6xl, .text-5xl').first();
    const text = await scoreElement.textContent();
    return parseInt(text || '0');
  }

  /**
   * Click play again.
   */
  async playAgain() {
    await this.playAgainButton.click();

    // Wait for new game to start (countdown)
    await this.countdown.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Click back to menu.
   */
  async backToMenu() {
    await this.backToMenuButton.click();

    // Wait for navigation
    await this.page.waitForURL(/\/games\/wordtrace$/);
  }

  /**
   * Share results.
   */
  async shareResults() {
    await this.shareResultsButton.click();
  }

  /**
   * Verify solo game page is displayed.
   */
  async expectVisible() {
    await expect(this.header).toBeVisible();
    await expect(this.grid).toBeVisible();
  }
}
