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
  readonly leaveRoomButton: Locator;
  readonly confetti: Locator;
  readonly progressBar: Locator;
  readonly longestWord: Locator;
  readonly wordRevealHeader: Locator;
  readonly trophyEmoji: Locator;

  // Ready check panel elements
  readonly readyCheckPanel: Locator;
  readonly readyCheckTitle: Locator;
  readonly readyCheckbox: Locator;
  readonly startAnywayButton: Locator;
  readonly readyCountdown: Locator;

  constructor(page: Page) {
    super(page);

    // Winner phase elements
    this.winnerAnnouncement = page.locator('.winner-announce h1');
    this.trophyEmoji = page.locator('.trophy-bounce');
    this.rematchButton = page.getByRole('button', { name: 'Play Again' }); // Legacy - may not exist
    this.homeButton = page.getByRole('button', { name: 'Home' });
    this.leaveRoomButton = page.getByRole('button', { name: 'Leave Room' });
    this.confetti = page.locator('canvas');
    this.longestWord = page.getByText('Longest Word').locator('..');

    // Ready check panel elements
    this.readyCheckPanel = page.getByRole('heading', { name: 'Ready for Rematch?' }).locator('..');
    this.readyCheckTitle = page.getByRole('heading', { name: 'Ready for Rematch?' });
    this.readyCheckbox = page.locator('input[type="checkbox"]').first();
    this.startAnywayButton = page.getByRole('button', { name: /Start Anyway/ });
    this.readyCountdown = page.getByText(/\d+s remaining/);

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
   * Mark this player as ready for rematch.
   */
  async markReady() {
    // Wait for checkbox to be visible and enabled
    await this.readyCheckbox.waitFor({ state: 'visible' });
    const isChecked = await this.readyCheckbox.isChecked();
    if (!isChecked) {
      await this.readyCheckbox.click();
      // Wait for the checkbox to be checked
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Unmark this player as ready.
   */
  async unmarkReady() {
    const isChecked = await this.readyCheckbox.isChecked();
    if (isChecked) {
      await this.readyCheckbox.click();
    }
  }

  /**
   * Check if the ready check panel is visible.
   */
  async hasReadyCheckPanel(): Promise<boolean> {
    try {
      return await this.readyCheckTitle.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Click "Start Anyway" button (host only).
   */
  async startAnyway() {
    await this.startAnywayButton.click();
    // Wait for navigation to game page
    await this.page.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
  }

  /**
   * Wait for game to auto-start after all players are ready.
   */
  async waitForAutoStart(timeout = 10000) {
    await this.page.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout });
  }

  /**
   * Legacy: Click rematch / play again button if it exists.
   * @deprecated Use markReady() instead for the new ready check flow.
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
   * Click leave room button.
   */
  async leaveRoom() {
    await this.leaveRoomButton.click();
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
