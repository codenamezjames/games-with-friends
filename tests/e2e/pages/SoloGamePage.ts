import { Page, Locator, expect } from '@playwright/test';
import { GamePage } from './GamePage';

/**
 * Page object for solo practice mode.
 * Extends GamePage with solo-specific functionality.
 */
export class SoloGamePage extends GamePage {
  // Solo-specific locators
  readonly soloHeader: Locator;
  readonly scoreDisplay: Locator;
  readonly wordCountDisplay: Locator;
  readonly resultsModal: Locator;
  readonly resultsTitle: Locator;
  readonly finalScoreDisplay: Locator;
  readonly playAgainButton: Locator;
  readonly backToMenuButton: Locator;
  readonly shareResultsButton: Locator;

  constructor(page: Page) {
    super(page);

    // Main page elements
    this.soloHeader = page.getByRole('heading', { name: 'Solo Practice' });
    this.scoreDisplay = page.locator('.bg-bg-card .text-2xl.font-bold.text-primary');
    this.wordCountDisplay = page.locator('.bg-bg-card .text-xs.text-text-muted');

    // Results modal elements
    this.resultsModal = page.locator('.fixed.inset-0.bg-black\\/70');
    this.resultsTitle = page.getByRole('heading', { name: 'Game Over!' });
    this.finalScoreDisplay = page.locator('.text-6xl.font-bold.text-accent');
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
  async waitForResults(timeout = 150000) {
    await this.resultsTitle.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if results modal is visible.
   */
  async hasResultsModal(): Promise<boolean> {
    return this.resultsTitle.isVisible();
  }

  /**
   * Get final score from results modal.
   */
  async getFinalScore(): Promise<number> {
    const text = await this.finalScoreDisplay.textContent();
    return parseInt(text || '0');
  }

  /**
   * Click play again.
   */
  async playAgain() {
    await this.playAgainButton.click();
    // Wait for new game countdown or grid to reset
    await this.page.waitForTimeout(1000);
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
    await expect(this.soloHeader).toBeVisible();
    await expect(this.grid).toBeVisible();
  }

  /**
   * Wait for game to be ready to play (countdown finished).
   */
  async waitForGameReady(timeout = 10000) {
    // Wait for cells to be visible and interactive
    await this.cells.first().waitFor({ state: 'visible', timeout });
    await expect(this.cells.first()).not.toHaveClass(/opacity-50/, { timeout });
  }
}
