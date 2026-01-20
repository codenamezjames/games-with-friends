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

  // Setup screen locators
  readonly startGameButton: Locator;
  readonly gridSizeOptions: Locator;
  readonly timeOptions: Locator;
  readonly testDurationButton: Locator;

  constructor(page: Page) {
    super(page);

    // Main page elements
    this.soloHeader = page.getByRole('heading', { name: 'Solo Practice' });
    // Word count is shown during gameplay as "X words"
    this.wordCountDisplay = page.getByText(/\d+\s+words?/);
    this.scoreDisplay = this.wordCountDisplay; // Solo mode shows word count, not score

    // Setup screen elements
    this.startGameButton = page.getByRole('button', { name: 'Start Game' });
    this.gridSizeOptions = page.getByText('4×4').locator('..');
    this.timeOptions = page.getByText('Sprint').locator('..');
    this.testDurationButton = page.getByText('0:02').locator('..');

    // Results modal elements
    this.resultsModal = page.locator('.fixed.inset-0.bg-black\\/70');
    this.resultsTitle = page.getByRole('heading', { name: 'Game Over!' });
    this.finalScoreDisplay = page.locator('.text-6xl.font-bold.text-accent');
    this.playAgainButton = page.getByRole('button', { name: /play again/i });
    this.backToMenuButton = page.getByRole('button', { name: /^exit$/i });
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
    await this.wordCountDisplay.waitFor({ state: 'visible', timeout: 5000 });
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
   * Verify solo game setup screen is displayed.
   */
  async expectSetupVisible() {
    await expect(this.soloHeader).toBeVisible();
    await expect(this.startGameButton).toBeVisible();
  }

  /**
   * Verify solo game page is displayed (either setup or gameplay).
   */
  async expectVisible() {
    await expect(this.soloHeader).toBeVisible();
    // Check for either setup screen (Start Game button) or gameplay (cells)
    const hasStartButton = await this.startGameButton.isVisible().catch(() => false);
    const hasCells = await this.cells.first().isVisible().catch(() => false);
    expect(hasStartButton || hasCells).toBe(true);
  }

  /**
   * Select the 10s test duration (only available on localhost).
   */
  async selectTestDuration() {
    await this.testDurationButton.click();
  }

  /**
   * Start the game from the setup screen.
   */
  async startGame() {
    await this.startGameButton.click();
    // Wait for countdown or game to start
    await this.waitForGameReady();
  }

  /**
   * Start game with 10s test duration for faster tests.
   */
  async startTestGame() {
    await this.selectTestDuration();
    await this.startGame();
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
