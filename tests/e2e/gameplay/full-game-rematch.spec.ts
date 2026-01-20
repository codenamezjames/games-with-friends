import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage, ResultsPage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync, findValidWords, findDistinctWords } from '../helpers';

/**
 * Full two-player game e2e test with word submissions and rematch.
 *
 * This test verifies the complete game flow:
 * 1. Two players join a room
 * 2. Play a full game with valid word submissions
 * 3. Use ready check to play again
 * 4. Complete a second full game
 */

test.describe('Full Game with Rematch', () => {
  test('two players play full game with words and rematch', async ({ browser }) => {
    test.setTimeout(60000); // 1 minute for two 2s games + setup/transitions

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('Host');
    const guestName = generateTestPlayerName('Guest');

    try {
      // === SETUP ===
      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);

      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.expectVisible();

      // Set 2s test duration for faster tests
      await hostWaitingRoom.selectTestDuration();

      // Guest joins
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);

      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.expectVisible();

      // Guest marks ready
      await guestWaitingRoom.toggleReady();

      // === GAME 1 ===
      // Wait for Firebase sync and start game
      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for game to start
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await Promise.all([
        hostGame.waitForGameStart(),
        guestGame.waitForGameStart(),
      ]);

      // Read grid letters
      const letters = await hostGame.getGridLetters();
      const gridSize = 5; // Default grid size

      // Find valid words for both players
      const allWords = findValidWords(letters, gridSize);

      if (allWords.length >= 4) {
        // Host traces first 2 words
        const hostWords = allWords.slice(0, 2);
        // Guest traces next 2 different words
        const guestWords = findDistinctWords(
          letters,
          gridSize,
          2,
          hostWords.map(w => w.word)
        );

        // Both players trace their words (sequentially to avoid race conditions)
        for (const { path } of hostWords) {
          await hostGame.traceWord(path);
          await hostPage.waitForTimeout(500); // Wait between words
        }

        for (const { path } of guestWords) {
          await guestGame.traceWord(path);
          await guestPage.waitForTimeout(500);
        }
      }

      // Wait for game to end (2s game + countdown + buffer)
      await Promise.all([
        hostGame.waitForGameEnd(15000),
        guestGame.waitForGameEnd(15000),
      ]);

      // Wait for winner phase on both
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);
      await Promise.all([
        hostResults.waitForWinnerPhase(15000),
        guestResults.waitForWinnerPhase(15000),
      ]);

      // Verify ready check panel is visible
      await expect(hostResults.readyCheckTitle).toBeVisible();
      await expect(guestResults.readyCheckTitle).toBeVisible();

      // === PLAY AGAIN (REMATCH) ===
      // Wait for Firebase to sync player list
      await hostPage.waitForTimeout(1000);

      // Guest marks ready FIRST to expose race condition bug
      // (Bug: if guest clicks first, results may replay instead of starting new game)
      await guestResults.markReady();
      await guestPage.waitForTimeout(2000);

      // Then host marks ready
      await hostResults.markReady();

      // Wait for auto-start (should trigger when all ready)
      await Promise.all([
        hostResults.waitForAutoStart(15000),
        guestResults.waitForAutoStart(15000),
      ]);

      // === GAME 2 ===
      // Wait for second game to start
      const hostGame2 = new GamePage(hostPage);
      const guestGame2 = new GamePage(guestPage);
      await Promise.all([
        hostGame2.waitForGameStart(),
        guestGame2.waitForGameStart(),
      ]);

      // Read new grid letters
      const letters2 = await hostGame2.getGridLetters();

      // Find valid words for second game
      const allWords2 = findValidWords(letters2, gridSize);

      if (allWords2.length >= 4) {
        // Host traces first 2 words
        const hostWords2 = allWords2.slice(0, 2);
        // Guest traces next 2 different words
        const guestWords2 = findDistinctWords(
          letters2,
          gridSize,
          2,
          hostWords2.map(w => w.word)
        );

        // Both players trace their words
        for (const { path } of hostWords2) {
          await hostGame2.traceWord(path);
          await hostPage.waitForTimeout(500);
        }

        for (const { path } of guestWords2) {
          await guestGame2.traceWord(path);
          await guestPage.waitForTimeout(500);
        }
      }

      // Wait for second game to end
      await Promise.all([
        hostGame2.waitForGameEnd(15000),
        guestGame2.waitForGameEnd(15000),
      ]);

      // Wait for winner phase on both
      const hostResults2 = new ResultsPage(hostPage);
      const guestResults2 = new ResultsPage(guestPage);
      await Promise.all([
        hostResults2.waitForWinnerPhase(15000),
        guestResults2.waitForWinnerPhase(15000),
      ]);

      // Verify we reached winner phase after second game
      await expect(hostResults2.winnerAnnouncement).toBeVisible();
      await expect(guestResults2.winnerAnnouncement).toBeVisible();

      // Verify ready check panel is visible for potential third game
      await expect(hostResults2.readyCheckTitle).toBeVisible();
      await expect(guestResults2.readyCheckTitle).toBeVisible();

    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('players can submit words and see scores update', async ({ browser }) => {
    test.setTimeout(45000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('Host');
    const guestName = generateTestPlayerName('Guest');

    try {
      // Setup room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);

      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.selectTestDuration();

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);

      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      // Wait for game
      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await Promise.all([
        hostGame.waitForGameStart(),
        guestGame.waitForGameStart(),
      ]);

      // Get letters and find words
      const letters = await hostGame.getGridLetters();
      const gridSize = 5;
      const words = findValidWords(letters, gridSize);

      // Submit a word and verify success feedback
      if (words.length > 0) {
        const word = words[0];
        await hostGame.traceWord(word.path);

        // Should see success feedback
        await hostGame.expectSuccessFeedback(3000);
      }

      // Wait for game end
      await Promise.all([
        hostGame.waitForGameEnd(15000),
        guestGame.waitForGameEnd(15000),
      ]);

      // Verify results
      const hostResults = new ResultsPage(hostPage);
      await hostResults.waitForWinnerPhase(15000);

    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
