import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

test.describe('Game Countdown and Timer', () => {
  test('game shows countdown before starting', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Setup game
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Both should see countdown overlay
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);

      // Countdown appears (3, 2, 1) - it uses absolute positioning within the grid container
      // Look for the countdown number or "GO!" text
      await expect(hostPage.getByText(/^[123]$|^GO!$/)).toBeVisible({ timeout: 5000 });
      await expect(guestPage.getByText(/^[123]$|^GO!$/)).toBeVisible({ timeout: 5000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('timer displays in correct format', async ({ browser }) => {
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
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for game to start
      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Timer should display in M:SS format
      await hostGame.expectTimerVisible();
      const timerText = await hostGame.getTimeRemaining();
      expect(timerText).toMatch(/^\d+:\d{2}$/);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('timer counts down during gameplay', async ({ browser }) => {
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
      // Use 1 min duration for this test so we can verify countdown
      await hostWaitingRoom.setDuration('1 min');

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for game to start
      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Get initial time
      const initialTime = await hostGame.getTimeRemainingSeconds();

      // Wait a second
      await hostPage.waitForTimeout(1500);

      // Timer should have decreased
      const laterTime = await hostGame.getTimeRemainingSeconds();
      expect(laterTime).toBeLessThan(initialTime);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('both players see same timer value', async ({ browser }) => {
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
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for both games to start
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      // Give it a moment to sync
      await waitForFirebaseSync(500);

      // Timers should be within 1 second of each other
      const hostTime = await hostGame.getTimeRemainingSeconds();
      const guestTime = await guestGame.getTimeRemainingSeconds();
      expect(Math.abs(hostTime - guestTime)).toBeLessThanOrEqual(1);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('grid is displayed with letters', async ({ browser }) => {
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
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for game to start
      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Grid should have 25 cells (5x5 default)
      const cellCount = await hostGame.cells.count();
      expect(cellCount).toBe(25);

      // Each cell should have a letter
      const letters = await hostGame.getGridLetters();
      expect(letters.length).toBe(25);
      letters.forEach(letter => {
        expect(letter.length).toBeGreaterThan(0);
        // Allow for 'Qu' digraph
        expect(letter).toMatch(/^[A-Z]$|^Qu$/);
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('both players see same grid', async ({ browser }) => {
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
      await hostWaitingRoom.selectTestDuration(); // 2s game for fast tests

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(generateTestPlayerName('Guest'), roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for both games to start
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();

      // Both should see the same grid
      const hostLetters = await hostGame.getGridLetters();
      const guestLetters = await guestGame.getGridLetters();
      expect(hostLetters).toEqual(guestLetters);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
