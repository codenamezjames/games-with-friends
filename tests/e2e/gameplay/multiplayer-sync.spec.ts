import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

test.describe('Multiplayer Score Sync', () => {
  test('player list shows all players', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      // Both players should see both names in their player lists
      await expect(hostPage.getByText(hostName)).toBeVisible();
      await expect(hostPage.getByText(guestName)).toBeVisible();
      await expect(guestPage.getByText(hostName)).toBeVisible();
      await expect(guestPage.getByText(guestName)).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('local player is highlighted in player list', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      // Host should see their name with (You) indicator
      await expect(
        hostPage.locator('li').filter({ hasText: hostName }).getByText('(You)')
      ).toBeVisible();

      // Guest should see their name with (You) indicator
      await expect(
        guestPage.locator('li').filter({ hasText: guestName }).getByText('(You)')
      ).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('word counts are displayed for each player', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Word count should be visible (0 words initially)
      const hostPlayerRow = hostPage.locator('li').filter({ hasText: hostName });
      await expect(hostPlayerRow.getByText(/\d+ words?/i)).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('game continues when both players are active', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      const initialTime = await hostGame.getTimeRemainingSeconds();

      // Both players trace some cells
      await hostGame.traceWord([0, 1, 2]);
      await guestGame.traceWord([5, 6, 7]);

      // Game should still be running
      await hostPage.waitForTimeout(1000);
      const laterTime = await hostGame.getTimeRemainingSeconds();
      expect(laterTime).toBeLessThan(initialTime);
      expect(laterTime).toBeGreaterThan(0);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('players can make submissions simultaneously', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Setup and start game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      // Both players submit words at the same time (different paths)
      await Promise.all([
        hostGame.traceWord([0, 1, 6]),
        guestGame.traceWord([10, 11, 16]),
      ]);

      // Both should get feedback (success or error)
      await Promise.all([
        Promise.race([
          hostGame.expectSuccessFeedback(),
          hostGame.expectErrorFeedback(),
        ]),
        Promise.race([
          guestGame.expectSuccessFeedback(),
          guestGame.expectErrorFeedback(),
        ]),
      ]);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
