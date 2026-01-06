import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

test.describe('Ready and Start Game', () => {
  test('non-host can toggle ready checkbox', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Setup room with two players
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);

      const guestWaitingRoom = new WaitingRoomPage(guestPage);

      // Guest should see ready checkbox
      await expect(guestWaitingRoom.readyCheckbox).toBeVisible();

      // Toggle ready
      await guestWaitingRoom.toggleReady();
      expect(await guestWaitingRoom.isReady()).toBe(true);

      // Toggle off
      await guestWaitingRoom.toggleReady();
      expect(await guestWaitingRoom.isReady()).toBe(false);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('host sees start button disabled with only one player', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.createRoom(generateTestPlayerName('Host'));

    const waitingRoom = new WaitingRoomPage(page);

    // Start button should be visible but disabled
    await expect(waitingRoom.startGameButton).toBeVisible();
    await expect(waitingRoom.startGameButton).toBeDisabled();
  });

  test('host sees start button disabled when guest not ready', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));
      const hostWaitingRoom = new WaitingRoomPage(hostPage);

      // Guest joins but doesn't ready up
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);

      await waitForFirebaseSync(1000);

      // Start button should be disabled (guest not ready)
      await expect(hostWaitingRoom.startGameButton).toBeDisabled();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('host can start game when all players ready', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));
      const hostWaitingRoom = new WaitingRoomPage(hostPage);

      // Guest joins and readies up
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);

      // Start button should be enabled
      await expect(hostWaitingRoom.startGameButton).toBeEnabled();

      // Start the game
      await hostWaitingRoom.startGame();

      // Both should navigate to game page
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 5000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('all players navigate to game when host starts', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));
      const hostWaitingRoom = new WaitingRoomPage(hostPage);

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Both should see game page elements
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);

      await hostGame.expectVisible();
      await guestGame.expectVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('leave room returns to home', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.createRoom(generateTestPlayerName('Host'));

    const waitingRoom = new WaitingRoomPage(page);
    await waitingRoom.leaveRoom();

    // Should be back at home
    await expect(page).toHaveURL('/');
  });

  test('ready state syncs to host player list', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const guestName = generateTestPlayerName('Guest');

      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));

      // Guest joins
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);

      await waitForFirebaseSync(500);

      // Guest readies up
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);

      // Host should see ready indicator for guest
      // Find the list item containing the guest name, then look for Ready badge within it
      await expect(
        hostPage.locator('li').filter({ hasText: guestName }).getByText('Ready')
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
