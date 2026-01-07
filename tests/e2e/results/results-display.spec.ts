import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage, ResultsPage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

/**
 * Helper to start a quick two-player game with short duration.
 * Uses 10s game (localhost test mode) to minimize test time.
 */
async function startQuickGame(browser: any) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostName = generateTestPlayerName('Host');
  const guestName = generateTestPlayerName('Guest');

  // Setup room
  const hostMenu = new MainMenuPage(hostPage);
  await hostMenu.goto();
  const roomCode = await hostMenu.createRoom(hostName);
  const hostWaitingRoom = new WaitingRoomPage(hostPage);

  // Set test duration (10s) for faster tests
  await hostWaitingRoom.setDuration('10s');

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

  return {
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    hostGame,
    guestGame,
    hostName,
    guestName,
    roomCode,
  };
}

test.describe('Results Display', () => {
  test('game navigates to results after time expires', async ({ browser }) => {
    test.setTimeout(60000);

    const {
      hostContext,
      guestContext,
      hostGame,
      guestGame,
    } = await startQuickGame(browser);

    try {
      // Wait for game to end (10s game + countdown + buffer)
      // Both players should navigate to results
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      // Should be on results page
      await expect(hostGame.page).toHaveURL(/\/games\/wordtrace\/results/);
      await expect(guestGame.page).toHaveURL(/\/games\/wordtrace\/results/);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('results page shows reveal or winner phase', async ({ browser }) => {
    test.setTimeout(60000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestGame,
    } = await startQuickGame(browser);

    try {
      // Host traces some words to try to get results
      const hostGame = new GamePage(hostPage);
      await hostGame.traceWord([0, 1, 2]);
      await hostGame.traceWord([5, 6, 7]);

      // Wait for game to end (10s game)
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      // Results should be visible (either reveal or winner phase)
      // With a 10s game and random words, it may skip reveal if no valid words found
      const hostResults = new ResultsPage(hostPage);
      const inReveal = await hostResults.isInRevealPhase();
      const inWinner = await hostResults.isInWinnerPhase();
      expect(inReveal || inWinner).toBe(true);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('speed toggle changes animation speed', async ({ browser }) => {
    test.setTimeout(60000);

    const {
      hostContext,
      guestContext,
      hostPage,
      hostGame,
      guestGame,
    } = await startQuickGame(browser);

    try {
      // Try multiple traces to increase chance of valid word
      await hostGame.traceWord([0, 1, 2]);
      await hostGame.traceWord([0, 1, 5, 6]);
      await hostGame.traceWord([0, 5, 10, 15]);

      // Wait for game to end (10s game)
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      const hostResults = new ResultsPage(hostPage);

      // Check if we're in reveal phase (if words were found)
      const inReveal = await hostResults.isInRevealPhase();
      if (!inReveal) {
        // No words found, skip speed toggle test
        console.log('No words found, skipping speed toggle test');
        return;
      }

      // Initial speed should be normal (1x)
      const initialSpeed = await hostResults.getSpeed();
      expect(initialSpeed).toBe('normal');

      // Toggle to fast
      await hostResults.toggleSpeed();
      const newSpeed = await hostResults.getSpeed();
      expect(newSpeed).toBe('fast');
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});

test.describe('Results Navigation', () => {
  test('play again navigates back to waiting room', async ({ browser }) => {
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      hostGame,
      guestGame,
      roomCode,
    } = await startQuickGame(browser);

    try {
      // Wait for game to end (10s game)
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      const hostResults = new ResultsPage(hostPage);

      // Wait for winner phase (reveal may be quick with few/no words)
      await hostResults.waitForWinnerPhase(30000);

      // Click play again
      await hostResults.rematch();

      // Should be back in waiting room with same room code
      await expect(hostPage).toHaveURL(new RegExp(`/games/wordtrace/room/${roomCode}`));
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('home button navigates to main menu', async ({ browser }) => {
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      hostGame,
      guestGame,
    } = await startQuickGame(browser);

    try {
      // Wait for game to end (10s game)
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      const hostResults = new ResultsPage(hostPage);

      // Wait for winner phase
      await hostResults.waitForWinnerPhase(30000);

      // Click home
      await hostResults.goHome();

      // Should be at home
      await expect(hostPage).toHaveURL('/');
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
