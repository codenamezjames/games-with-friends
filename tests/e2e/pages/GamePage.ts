import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Word Trace game page.
 */
export class GamePage extends BasePage {
  // Locators
  readonly timer: Locator;
  readonly grid: Locator;
  readonly cells: Locator;
  readonly playerScores: Locator;
  readonly feedbackSuccess: Locator;
  readonly feedbackError: Locator;
  readonly countdown: Locator;
  readonly currentWord: Locator;
  readonly header: Locator;

  constructor(page: Page) {
    super(page);

    this.timer = page.locator('.font-mono.font-bold.text-4xl');
    this.grid = page.locator('.grid.gap-2');
    this.cells = page.locator('[data-index]');
    this.playerScores = page.locator('[class*="player"]');
    this.feedbackSuccess = page.locator('.text-lg.font-semibold.text-success');
    this.feedbackError = page.locator('.text-lg.font-semibold.text-error');
    this.countdown = page.locator('.fixed.inset-0'); // Countdown overlay
    this.currentWord = page.locator('.text-accent.tracking-wider');
    this.header = page.getByRole('heading', { name: 'Word Trace' });
  }

  /**
   * Navigate directly to a game.
   */
  async goto(roomCode: string) {
    await super.goto(`/games/wordtrace/play/${roomCode}`);
  }

  /**
   * Get the current time remaining as displayed text.
   */
  async getTimeRemaining(): Promise<string> {
    return this.getTextContent(this.timer);
  }

  /**
   * Parse time remaining as seconds.
   */
  async getTimeRemainingSeconds(): Promise<number> {
    const text = await this.getTimeRemaining();
    const match = text.match(/(\d+):(\d+)/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  /**
   * Wait for timer to show a specific format.
   */
  async expectTimerVisible() {
    await expect(this.timer).toBeVisible();
    await expect(this.timer).toHaveText(/\d+:\d{2}/);
  }

  /**
   * Get the grid letters.
   */
  async getGridLetters(): Promise<string[]> {
    const count = await this.cells.count();
    const letters: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await this.cells.nth(i).textContent();
      if (text) letters.push(text.trim());
    }

    return letters;
  }

  /**
   * Get a specific cell by its index.
   */
  getCell(index: number): Locator {
    return this.page.locator(`[data-index="${index}"]`);
  }

  /**
   * Trace a word by clicking/dragging through cells.
   * @param indices Array of cell indices to trace through
   */
  async traceWord(indices: number[]) {
    if (indices.length === 0) return;

    const firstCell = this.getCell(indices[0]);
    const box = await firstCell.boundingBox();
    if (!box) throw new Error('Could not get cell bounding box');

    // Start the trace - move to first cell and press down
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();

    // Small delay to ensure pointerdown is processed
    await this.page.waitForTimeout(50);

    // Move through remaining cells with small delays for reliable event processing
    let lastBox = box;
    for (let i = 1; i < indices.length; i++) {
      const cell = this.getCell(indices[i]);
      const cellBox = await cell.boundingBox();
      if (!cellBox) continue;

      // Move to the center of each cell
      await this.page.mouse.move(
        cellBox.x + cellBox.width / 2,
        cellBox.y + cellBox.height / 2,
        { steps: 5 } // Smoother movement for more reliable cell detection
      );
      lastBox = cellBox;

      // Small delay to ensure pointermove is processed
      await this.page.waitForTimeout(30);
    }

    // Release at the last cell position to trigger submission
    await this.page.mouse.up();
  }

  /**
   * Get the current word being traced.
   */
  async getCurrentWord(): Promise<string> {
    return this.getTextContent(this.currentWord);
  }

  /**
   * Wait for success feedback.
   */
  async expectSuccessFeedback(timeout = 3000) {
    await expect(this.feedbackSuccess).toBeVisible({ timeout });
  }

  /**
   * Wait for error feedback.
   */
  async expectErrorFeedback(timeout = 3000) {
    await expect(this.feedbackError).toBeVisible({ timeout });
  }

  /**
   * Wait for any feedback (success or error) to appear.
   * Returns true if feedback was found, false if timed out.
   */
  async waitForAnyFeedback(timeout = 3000): Promise<boolean> {
    try {
      await Promise.race([
        this.feedbackSuccess.waitFor({ state: 'visible', timeout }),
        this.feedbackError.waitFor({ state: 'visible', timeout }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if any feedback is currently visible.
   */
  async hasFeedback(): Promise<boolean> {
    const hasSuccess = await this.feedbackSuccess.isVisible().catch(() => false);
    const hasError = await this.feedbackError.isVisible().catch(() => false);
    return hasSuccess || hasError;
  }

  /**
   * Get success feedback message.
   */
  async getSuccessFeedback(): Promise<string> {
    try {
      await this.feedbackSuccess.waitFor({ state: 'visible', timeout: 2000 });
      return this.getTextContent(this.feedbackSuccess);
    } catch {
      return '';
    }
  }

  /**
   * Get error feedback message.
   */
  async getErrorFeedback(): Promise<string> {
    try {
      await this.feedbackError.waitFor({ state: 'visible', timeout: 2000 });
      return this.getTextContent(this.feedbackError);
    } catch {
      return '';
    }
  }

  /**
   * Wait for countdown to complete.
   */
  async waitForCountdownComplete(timeout = 5000) {
    // Wait for countdown to appear then disappear
    try {
      await this.countdown.waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      // Countdown might have already completed
    }
    await this.countdown.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for game to start (countdown finished, grid active).
   */
  async waitForGameStart(timeout = 10000) {
    // Wait for grid cells to be visible and not disabled
    await this.cells.first().waitFor({ state: 'visible', timeout });
    // Wait until cells are not disabled (opacity-50)
    await expect(this.cells.first()).not.toHaveClass(/opacity-50/, { timeout });
  }

  /**
   * Check if game is in playing state (cells not disabled).
   */
  async isPlaying(): Promise<boolean> {
    try {
      const firstCellClass = await this.cells.first().getAttribute('class');
      return !firstCellClass?.includes('opacity-50');
    } catch {
      return false;
    }
  }

  /**
   * Wait for game to end (navigation to results).
   */
  async waitForGameEnd(timeout = 180000) {
    await this.page.waitForURL(/\/games\/wordtrace\/results/, { timeout });
  }

  /**
   * Verify game page is displayed.
   */
  async expectVisible() {
    await expect(this.header).toBeVisible();
    await expect(this.timer).toBeVisible();
    await expect(this.grid).toBeVisible();
  }

  /**
   * Get the score for a player by name.
   */
  async getPlayerScore(playerName: string): Promise<number> {
    // Find player row and get their score
    const playerRow = this.page.locator('li').filter({ hasText: playerName });
    const scoreText = await playerRow.locator('.font-bold').first().textContent();
    return parseInt(scoreText?.replace(/[^\d]/g, '') || '0');
  }
}
