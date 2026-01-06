import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Word Trace main menu / lobby.
 */
export class MainMenuPage extends BasePage {
  // Locators
  readonly nameInput: Locator;
  readonly createRoomButton: Locator;
  readonly roomCodeInput: Locator;
  readonly joinButton: Locator;
  readonly playSoloButton: Locator;
  readonly backToGamesButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.nameInput = page.locator('#player-name');
    this.createRoomButton = page.getByRole('button', { name: /create room/i });
    this.roomCodeInput = page.getByPlaceholder(/room code/i);
    this.joinButton = page.getByRole('button', { name: /^join$/i });
    this.playSoloButton = page.getByRole('button', { name: /play solo/i });
    this.backToGamesButton = page.getByRole('button', { name: /back to games/i });
    this.errorMessage = page.locator('.text-error');
  }

  /**
   * Navigate to the Word Trace main menu.
   */
  async goto() {
    await super.goto('/games/wordtrace');
  }

  /**
   * Navigate with a prefilled room code (join invite link).
   */
  async gotoWithRoomCode(roomCode: string) {
    await super.goto(`/games/wordtrace?room=${roomCode}`);
  }

  /**
   * Enter player name.
   */
  async enterName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Create a new room. Returns the room code.
   */
  async createRoom(playerName: string): Promise<string> {
    await this.enterName(playerName);
    await this.createRoomButton.click();

    // Wait for navigation to waiting room
    await this.page.waitForURL(/\/games\/wordtrace\/room\/[A-Z0-9]+/);

    // Extract room code from URL
    const url = this.page.url();
    const match = url.match(/\/room\/([A-Z0-9]+)/);
    if (!match) throw new Error('Could not extract room code from URL');

    return match[1];
  }

  /**
   * Join an existing room.
   */
  async joinRoom(playerName: string, roomCode: string) {
    await this.enterName(playerName);
    await this.roomCodeInput.fill(roomCode);
    await this.joinButton.click();

    // Wait for navigation to waiting room
    await this.page.waitForURL(/\/games\/wordtrace\/room\/[A-Z0-9]+/);
  }

  /**
   * Start solo practice mode.
   */
  async startSoloMode(playerName?: string) {
    if (playerName) {
      await this.enterName(playerName);
    }
    await this.playSoloButton.click();

    // Wait for navigation to solo game
    await this.page.waitForURL(/\/games\/wordtrace\/solo/);
  }

  /**
   * Check if an error message is displayed.
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get the error message text.
   */
  async getErrorText(): Promise<string> {
    return this.getTextContent(this.errorMessage);
  }

  /**
   * Verify the main menu is displayed.
   */
  async expectVisible() {
    await expect(this.page.getByText('Word Trace')).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }
}
