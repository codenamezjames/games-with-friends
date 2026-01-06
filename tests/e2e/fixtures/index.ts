/**
 * Playwright test fixtures for Word Trace e2e tests.
 *
 * Fixtures provide pre-configured test environments:
 * - authenticatedPage: Page with a logged-in user
 * - gameRoom: Pre-created room for testing
 * - twoPlayerGame: Two browser contexts in the same room
 * - soloGame: Solo mode with game started
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage, SoloGamePage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

/**
 * Extended test fixtures.
 */
export type TestFixtures = {
  /**
   * Main menu page object.
   */
  mainMenu: MainMenuPage;

  /**
   * Create a room and get the room code.
   */
  createRoom: (playerName?: string) => Promise<{
    roomCode: string;
    waitingRoom: WaitingRoomPage;
  }>;

  /**
   * Two browser contexts for multiplayer testing.
   */
  twoPlayers: {
    host: { context: BrowserContext; page: Page; name: string };
    guest: { context: BrowserContext; page: Page; name: string };
  };

  /**
   * Solo game page object.
   */
  soloGame: SoloGamePage;
};

/**
 * Extended test with fixtures.
 */
export const test = base.extend<TestFixtures>({
  /**
   * Main menu page object fixture.
   */
  mainMenu: async ({ page }, use) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await use(mainMenu);
  },

  /**
   * Create room helper fixture.
   */
  createRoom: async ({ page }, use) => {
    const createRoomFn = async (playerName?: string) => {
      const name = playerName ?? generateTestPlayerName('Host');
      const mainMenu = new MainMenuPage(page);
      await mainMenu.goto();
      const roomCode = await mainMenu.createRoom(name);
      const waitingRoom = new WaitingRoomPage(page);
      return { roomCode, waitingRoom };
    };

    await use(createRoomFn);
  },

  /**
   * Two players fixture for multiplayer testing.
   */
  twoPlayers: async ({ browser }, use) => {
    // Create two browser contexts
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('Host');
    const guestName = generateTestPlayerName('Guest');

    await use({
      host: { context: hostContext, page: hostPage, name: hostName },
      guest: { context: guestContext, page: guestPage, name: guestName },
    });

    // Cleanup
    await hostContext.close();
    await guestContext.close();
  },

  /**
   * Solo game fixture.
   */
  soloGame: async ({ page }, use) => {
    const soloGame = new SoloGamePage(page);
    await soloGame.goto();
    await use(soloGame);
  },
});

/**
 * Re-export expect for convenience.
 */
export { expect };

/**
 * Helper to set up a two-player game room.
 */
export async function setupTwoPlayerRoom(
  hostPage: Page,
  guestPage: Page,
  hostName: string,
  guestName: string
): Promise<{ roomCode: string; hostWaitingRoom: WaitingRoomPage; guestWaitingRoom: WaitingRoomPage }> {
  // Host creates room
  const hostMainMenu = new MainMenuPage(hostPage);
  await hostMainMenu.goto();
  const roomCode = await hostMainMenu.createRoom(hostName);
  const hostWaitingRoom = new WaitingRoomPage(hostPage);

  // Guest joins room
  const guestMainMenu = new MainMenuPage(guestPage);
  await guestMainMenu.goto();
  await guestMainMenu.joinRoom(guestName, roomCode);
  const guestWaitingRoom = new WaitingRoomPage(guestPage);

  // Wait for sync
  await waitForFirebaseSync(500);

  return { roomCode, hostWaitingRoom, guestWaitingRoom };
}

/**
 * Helper to start a two-player game.
 */
export async function startTwoPlayerGame(
  hostPage: Page,
  guestPage: Page,
  hostName: string,
  guestName: string
): Promise<{ roomCode: string; hostGame: GamePage; guestGame: GamePage }> {
  const { roomCode, hostWaitingRoom, guestWaitingRoom } = await setupTwoPlayerRoom(
    hostPage,
    guestPage,
    hostName,
    guestName
  );

  // Guest ready up
  await guestWaitingRoom.toggleReady();
  await waitForFirebaseSync(500);

  // Host starts game
  await hostWaitingRoom.startGame();

  // Both should navigate to game
  const hostGame = new GamePage(hostPage);
  const guestGame = new GamePage(guestPage);

  // Wait for game to start
  await hostGame.waitForGameStart();
  await guestGame.waitForGameStart();

  return { roomCode, hostGame, guestGame };
}
