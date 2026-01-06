import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the waiting room / lobby.
 */
export class WaitingRoomPage extends BasePage {
  // Locators
  readonly roomCodeDisplay: Locator;
  readonly copyCodeButton: Locator;
  readonly copyLinkButton: Locator;
  readonly shareUrlInput: Locator;
  readonly playerList: Locator;
  readonly readyCheckbox: Locator;
  readonly startGameButton: Locator;
  readonly leaveRoomButton: Locator;

  constructor(page: Page) {
    super(page);

    this.roomCodeDisplay = page.locator('.text-4xl.font-mono');
    this.copyCodeButton = page.getByRole('button', { name: /copy code/i });
    this.copyLinkButton = page.getByRole('button', { name: /^copy$/i });
    this.shareUrlInput = page.locator('input[readonly]');
    this.playerList = page.locator('text=Players').locator('..');
    this.readyCheckbox = page.getByRole('checkbox');
    this.startGameButton = page.getByRole('button', { name: /start game/i });
    this.leaveRoomButton = page.getByRole('button', { name: /leave room/i });
  }

  /**
   * Navigate directly to a room's waiting room.
   */
  async goto(roomCode: string) {
    await super.goto(`/games/wordtrace/room/${roomCode}`);
  }

  /**
   * Get the displayed room code.
   */
  async getRoomCode(): Promise<string> {
    return this.getTextContent(this.roomCodeDisplay);
  }

  /**
   * Get the share URL.
   */
  async getShareUrl(): Promise<string> {
    return (await this.shareUrlInput.inputValue()) ?? '';
  }

  /**
   * Get list of player names in the room.
   */
  async getPlayerNames(): Promise<string[]> {
    const playerElements = this.page.locator('[class*="player"]');
    const count = await playerElements.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await playerElements.nth(i).textContent();
      if (text) names.push(text.trim());
    }

    return names;
  }

  /**
   * Check if a player is in the room.
   */
  async hasPlayer(name: string): Promise<boolean> {
    return this.page.getByText(name).isVisible();
  }

  /**
   * Toggle ready state (for non-host players).
   */
  async toggleReady() {
    await this.readyCheckbox.click();
  }

  /**
   * Check if ready checkbox is checked.
   */
  async isReady(): Promise<boolean> {
    return this.readyCheckbox.isChecked();
  }

  /**
   * Start the game (host only).
   */
  async startGame() {
    await this.startGameButton.click();

    // Wait for navigation to game page
    await this.page.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
  }

  /**
   * Check if start button is enabled.
   */
  async canStartGame(): Promise<boolean> {
    return this.startGameButton.isEnabled();
  }

  /**
   * Leave the room.
   */
  async leaveRoom() {
    await this.leaveRoomButton.click();

    // Wait for navigation to home
    await this.page.waitForURL('/');
  }

  /**
   * Copy room code to clipboard.
   */
  async copyCode() {
    await this.copyCodeButton.click();
  }

  /**
   * Copy share link to clipboard.
   */
  async copyLink() {
    await this.copyLinkButton.click();
  }

  /**
   * Verify the waiting room is displayed.
   */
  async expectVisible() {
    await expect(this.page.getByText('Waiting Room')).toBeVisible();
    await expect(this.roomCodeDisplay).toBeVisible();
  }

  /**
   * Wait for a player to join.
   */
  async waitForPlayer(name: string, timeout = 10000) {
    await this.page.getByText(name).waitFor({ state: 'visible', timeout });
  }
}
