import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the results page.
 */
export class ResultsPage extends BasePage {
  // Locators
  readonly winnerDisplay: Locator;
  readonly playerRankings: Locator;
  readonly wordReveal: Locator;
  readonly speedToggle: Locator;
  readonly rematchButton: Locator;
  readonly homeButton: Locator;
  readonly shareButton: Locator;
  readonly confetti: Locator;

  constructor(page: Page) {
    super(page);

    this.winnerDisplay = page.locator('[class*="winner"], h1, h2').first();
    this.playerRankings = page.locator('[class*="ranking"], [class*="player"]');
    this.wordReveal = page.locator('[class*="reveal"], [class*="word-card"]');
    this.speedToggle = page.getByRole('button', { name: /speed|fast|slow/i });
    this.rematchButton = page.getByRole('button', { name: /play again|rematch/i });
    this.homeButton = page.getByRole('button', { name: /home|menu|back/i });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.confetti = page.locator('[class*="confetti"], canvas');
  }

  /**
   * Navigate directly to results page.
   */
  async goto() {
    await super.goto('/games/wordtrace/results');
  }

  /**
   * Get the winner name or tie message.
   */
  async getWinnerText(): Promise<string> {
    return this.getTextContent(this.winnerDisplay);
  }

  /**
   * Check if it's a tie.
   */
  async isTie(): Promise<boolean> {
    const text = await this.getWinnerText();
    return /tie|draw/i.test(text);
  }

  /**
   * Get player scores from rankings.
   */
  async getPlayerScores(): Promise<{ name: string; score: number }[]> {
    const results: { name: string; score: number }[] = [];
    const count = await this.playerRankings.count();

    for (let i = 0; i < count; i++) {
      const text = await this.playerRankings.nth(i).textContent();
      if (text) {
        // Parse "PlayerName: 123" or similar formats
        const match = text.match(/([^:]+):\s*(\d+)/);
        if (match) {
          results.push({ name: match[1].trim(), score: parseInt(match[2]) });
        }
      }
    }

    return results;
  }

  /**
   * Toggle speed between normal and fast.
   */
  async toggleSpeed() {
    await this.speedToggle.click();
  }

  /**
   * Click rematch / play again.
   */
  async rematch() {
    await this.rematchButton.click();

    // Wait for navigation to waiting room
    await this.page.waitForURL(/\/games\/wordtrace\/room\/[A-Z0-9]+/);
  }

  /**
   * Click home / back to menu.
   */
  async goHome() {
    await this.homeButton.click();

    // Wait for navigation
    await this.page.waitForURL('/');
  }

  /**
   * Click share button.
   */
  async share() {
    await this.shareButton.click();
  }

  /**
   * Check if confetti is visible.
   */
  async hasConfetti(): Promise<boolean> {
    return this.confetti.isVisible();
  }

  /**
   * Wait for word reveal animation to start.
   */
  async waitForWordReveal(timeout = 10000) {
    await this.wordReveal.first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Verify results page is displayed.
   */
  async expectVisible() {
    await expect(this.rematchButton).toBeVisible();
  }
}
