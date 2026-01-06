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
  readonly wordList: Locator;
  readonly playerScores: Locator;
  readonly feedback: Locator;
  readonly countdown: Locator;

  constructor(page: Page) {
    super(page);

    this.timer = page.locator('.font-mono.font-bold').first();
    this.grid = page.locator('[class*="grid"]').first();
    this.cells = page.locator('[class*="cell"], [class*="Cell"]');
    this.wordList = page.locator('[class*="word"]');
    this.playerScores = page.locator('[class*="score"], [class*="Score"]');
    this.feedback = page.locator('[class*="feedback"], [class*="Feedback"]');
    this.countdown = page.locator('[class*="countdown"], [class*="Countdown"]');
  }

  /**
   * Navigate directly to a game.
   */
  async goto(roomCode: string) {
    await super.goto(`/games/wordtrace/play/${roomCode}`);
  }

  /**
   * Get the current time remaining.
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
   * Trace a word by clicking/dragging through cells.
   * @param indices Array of cell indices to trace through
   */
  async traceWord(indices: number[]) {
    if (indices.length === 0) return;

    const firstCell = this.cells.nth(indices[0]);
    const box = await firstCell.boundingBox();
    if (!box) throw new Error('Could not get cell bounding box');

    // Start the trace
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();

    // Move through remaining cells
    for (let i = 1; i < indices.length; i++) {
      const cell = this.cells.nth(indices[i]);
      const cellBox = await cell.boundingBox();
      if (!cellBox) continue;
      await this.page.mouse.move(
        cellBox.x + cellBox.width / 2,
        cellBox.y + cellBox.height / 2
      );
    }

    // Release to submit
    await this.page.mouse.up();
  }

  /**
   * Get the feedback message.
   */
  async getFeedback(): Promise<string> {
    try {
      await this.feedback.waitFor({ state: 'visible', timeout: 2000 });
      return this.getTextContent(this.feedback);
    } catch {
      return '';
    }
  }

  /**
   * Wait for feedback message to appear.
   */
  async waitForFeedback(expectedText?: string | RegExp, timeout = 5000) {
    await this.feedback.waitFor({ state: 'visible', timeout });
    if (expectedText) {
      await expect(this.feedback).toHaveText(expectedText);
    }
  }

  /**
   * Get list of found words.
   */
  async getFoundWords(): Promise<string[]> {
    const wordElements = this.page.locator('[class*="word-item"], [class*="WordItem"]');
    const count = await wordElements.count();
    const words: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await wordElements.nth(i).textContent();
      if (text) words.push(text.trim().toLowerCase());
    }

    return words;
  }

  /**
   * Wait for countdown to finish.
   */
  async waitForCountdownComplete(timeout = 5000) {
    await this.countdown.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for game to start (countdown finished).
   */
  async waitForGameStart(timeout = 10000) {
    // Wait for grid to be interactive
    await this.cells.first().waitFor({ state: 'visible', timeout });
    // Ensure countdown is done
    try {
      await this.countdown.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Countdown may already be hidden
    }
  }

  /**
   * Wait for game to end.
   */
  async waitForGameEnd(timeout = 180000) {
    await this.page.waitForURL(/\/games\/wordtrace\/results/, { timeout });
  }

  /**
   * Verify game page is displayed.
   */
  async expectVisible() {
    await expect(this.grid).toBeVisible();
    await expect(this.timer).toBeVisible();
  }
}
