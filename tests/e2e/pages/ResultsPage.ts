import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the results page.
 */
export class ResultsPage extends BasePage {
  // Locators
  readonly winnerAnnouncement: Locator;
  readonly playerScoreCards: Locator;
  readonly currentWordDisplay: Locator;
  readonly speedToggle: Locator;
  readonly rematchButton: Locator;
  readonly homeButton: Locator;
  readonly confetti: Locator;
  readonly progressBar: Locator;
  readonly longestWord: Locator;
  readonly wordRevealHeader: Locator;
  readonly trophyEmoji: Locator;

  constructor(page: Page) {
    super(page);

    // Winner phase elements
    this.winnerAnnouncement = page.locator('.winner-announce h1');
    this.trophyEmoji = page.locator('.trophy-bounce');
    this.rematchButton = page.getByRole('button', { name: 'Play Again' });
    this.homeButton = page.getByRole('button', { name: 'Home' });
    this.confetti = page.locator('canvas');
    this.longestWord = page.getByText('Longest Word').locator('..');

    // Reveal phase elements
    this.wordRevealHeader = page.getByRole('heading', { name: 'Word Reveal' });
    this.currentWordDisplay = page.locator('.glow-text');
    this.speedToggle = page.getByRole('button', { name: /1x|2x/ });
    this.progressBar = page.locator('.bg-primary.transition-all');
    this.playerScoreCards = page.locator('footer .text-center');
  }

  /**
   * Navigate directly to results page.
   */
  async goto() {
    await super.goto('/games/wordtrace/results');
  }

  /**
   * Get the winner text from announcement.
   */
  async getWinnerText(): Promise<string> {
    return this.getTextContent(this.winnerAnnouncement);
  }

  /**
   * Check if it's a tie.
   */
  async isTie(): Promise<boolean> {
    const text = await this.getWinnerText();
    return /tie/i.test(text);
  }

  /**
   * Check if we're in reveal phase.
   */
  async isInRevealPhase(): Promise<boolean> {
    try {
      return await this.wordRevealHeader.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if we're in winner phase.
   */
  async isInWinnerPhase(): Promise<boolean> {
    try {
      return await this.winnerAnnouncement.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the current word being revealed.
   */
  async getCurrentWord(): Promise<string> {
    try {
      return this.getTextContent(this.currentWordDisplay);
    } catch {
      return '';
    }
  }

  /**
   * Toggle speed between normal (1x) and fast (2x).
   */
  async toggleSpeed() {
    await this.speedToggle.click();
  }

  /**
   * Get current speed setting.
   */
  async getSpeed(): Promise<'normal' | 'fast'> {
    const text = await this.speedToggle.textContent();
    return text?.includes('2x') ? 'fast' : 'normal';
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
   * Click home button.
   */
  async goHome() {
    await this.homeButton.click();
    // Wait for navigation
    await this.page.waitForURL('/');
  }

  /**
   * Check if confetti is visible.
   */
  async hasConfetti(): Promise<boolean> {
    try {
      return await this.confetti.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for word reveal phase.
   */
  async waitForRevealPhase(timeout = 10000) {
    await this.wordRevealHeader.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for winner phase (reveal complete).
   */
  async waitForWinnerPhase(timeout = 120000) {
    await this.winnerAnnouncement.waitFor({ state: 'visible', timeout });
  }

  /**
   * Verify results page is displayed (either phase).
   */
  async expectVisible() {
    // Should be in either reveal or winner phase
    const inReveal = await this.isInRevealPhase();
    const inWinner = await this.isInWinnerPhase();
    expect(inReveal || inWinner).toBe(true);
  }

  /**
   * Get the trophy emoji (🏆 for winner, 🤝 for tie).
   */
  async getTrophyEmoji(): Promise<string> {
    return this.getTextContent(this.trophyEmoji);
  }

  /**
   * Get the longest word displayed.
   */
  async getLongestWord(): Promise<string> {
    const container = this.longestWord;
    const wordEl = container.locator('.text-accent');
    return this.getTextContent(wordEl);
  }
}
