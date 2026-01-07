import { test, expect, BrowserContext, Page } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage, ResultsPage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

/**
 * Regression tests for bug fixes.
 * These tests verify that previously fixed bugs don't regress.
 */

/**
 * Helper to set up a two-player game and get to results.
 * Uses 10s test duration on localhost for fast tests.
 */
async function setupGameToResults(browser: any) {
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

  // Wait for game to end (10s game + countdown + buffer)
  await Promise.all([
    hostGame.waitForGameEnd(30000),
    guestGame.waitForGameEnd(30000),
  ]);

  return {
    hostContext,
    guestContext,
    hostPage,
    guestPage,
    hostName,
    guestName,
    roomCode,
  };
}

test.describe('Bug Fix: Play Again Redirect', () => {
  // Uses 10s test duration on localhost for fast tests
  test('guest clicking Play Again while host on results goes to lobby, not back to results', async ({ browser }) => {
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
      roomCode,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase on both
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Guest clicks Play Again first (while host is still on results)
      // This triggers navigation to the waiting room
      await Promise.all([
        guestPage.waitForURL(/\/games\/wordtrace\/room\/[A-Z0-9]+/, { timeout: 15000 }),
        guestResults.rematchButton.click(),
      ]);

      // Verify guest is in waiting room
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.expectVisible();

      // Wait a bit and verify guest is STILL in waiting room (not redirected back)
      await guestPage.waitForTimeout(3000);
      await expect(guestPage).toHaveURL(new RegExp(`/games/wordtrace/room/${roomCode}`));

      // Guest should see ready checkbox (not start button)
      await expect(guestWaitingRoom.readyCheckbox).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('host clicking Play Again resets room for guests', async ({ browser }) => {
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
      roomCode,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase on both
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Host clicks Play Again first
      await hostResults.rematch();

      // Host should be in waiting room
      await expect(hostPage).toHaveURL(new RegExp(`/games/wordtrace/room/${roomCode}`));

      // Now guest clicks Play Again
      await guestResults.rematchButton.click();

      // Guest should also go to waiting room
      await guestPage.waitForURL(/\/games\/wordtrace\/room\/[A-Z0-9]+/, { timeout: 10000 });

      // Verify both are in waiting room
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);

      await hostWaitingRoom.expectVisible();
      await guestWaitingRoom.expectVisible();

      // Host should see start button, guest should see ready checkbox
      await expect(hostWaitingRoom.startGameButton).toBeVisible();
      await expect(guestWaitingRoom.readyCheckbox).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});

test.describe('Bug Fix: Host UI After Reconnect', () => {
  test('player sees guest UI after losing and regaining connection as non-host', async ({ browser }) => {
    // This test simulates:
    // 1. Host creates room, guest joins
    // 2. Host disconnects (closes page)
    // 3. Guest becomes new host after grace period
    // 4. Original host reconnects - should see guest UI (ready checkbox), not host UI (start button)
    test.setTimeout(30000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('Host');
    const guestName = generateTestPlayerName('Guest');

    try {
      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.expectVisible();

      // Guest joins
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.expectVisible();

      // Verify initial state - host sees start button, guest sees checkbox
      await expect(hostWaitingRoom.startGameButton).toBeVisible();
      await expect(guestWaitingRoom.readyCheckbox).toBeVisible();

      // Host disconnects (close page to simulate disconnect)
      await hostPage.close();

      // Wait for host transfer grace period (5 seconds) + buffer
      await guestPage.waitForTimeout(7000);

      // Guest should now be host (should see start button)
      await expect(guestWaitingRoom.startGameButton).toBeVisible({ timeout: 5000 });

      // Original host reconnects with new page
      const newHostPage = await hostContext.newPage();
      const newHostMenu = new MainMenuPage(newHostPage);
      await newHostMenu.goto();
      await newHostMenu.joinRoom(hostName, roomCode);

      const newHostWaitingRoom = new WaitingRoomPage(newHostPage);
      await newHostWaitingRoom.expectVisible();

      // Original host should now see GUEST UI (ready checkbox), not host UI
      // This is the bug that was fixed - previously they'd see start button
      await expect(newHostWaitingRoom.readyCheckbox).toBeVisible({ timeout: 5000 });
      await expect(newHostWaitingRoom.startGameButton).not.toBeVisible();

      // Guest should still be host
      await expect(guestWaitingRoom.startGameButton).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});

test.describe('Bug Fix: Diagonal Cell Selection', () => {
  test('can trace diagonal path on grid', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();

    const playerName = generateTestPlayerName('Diag');
    await mainMenu.startSoloMode(playerName);

    // Wait for game to start
    await page.waitForURL(/\/games\/wordtrace\/solo/);
    const gameGrid = page.locator('.grid.gap-2');
    await gameGrid.waitFor({ state: 'visible' });

    // Wait for game to be ready
    const firstCell = page.locator('[data-index="0"]');
    await expect(firstCell).not.toHaveClass(/opacity-50/, { timeout: 10000 });

    // Get cell 0 (top-left) and cell 6 (diagonal: row 1, col 1 in 5x5 grid)
    // In a 5x5 grid: indices 0, 6, 12 form a diagonal
    const cell0 = page.locator('[data-index="0"]');
    const cell6 = page.locator('[data-index="6"]');
    const cell12 = page.locator('[data-index="12"]');

    const box0 = await cell0.boundingBox();
    const box6 = await cell6.boundingBox();
    const box12 = await cell12.boundingBox();

    if (!box0 || !box6 || !box12) {
      throw new Error('Could not get cell bounding boxes');
    }

    // Trace diagonal path: 0 -> 6 -> 12
    await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
    await page.mouse.down();

    // Move diagonally to cell 6
    await page.mouse.move(box6.x + box6.width / 2, box6.y + box6.height / 2, { steps: 5 });
    await page.waitForTimeout(100);

    // Move diagonally to cell 12
    await page.mouse.move(box12.x + box12.width / 2, box12.y + box12.height / 2, { steps: 5 });
    await page.waitForTimeout(100);

    // Check that all three cells are selected
    await expect(cell0).toHaveClass(/bg-primary/);
    await expect(cell6).toHaveClass(/bg-primary/);
    await expect(cell12).toHaveClass(/bg-primary/);

    await page.mouse.up();
  });

  test('diagonal selection prefers diagonal cells over orthogonal when moving diagonally', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();

    const playerName = generateTestPlayerName('Diag');
    await mainMenu.startSoloMode(playerName);

    await page.waitForURL(/\/games\/wordtrace\/solo/);
    const firstCell = page.locator('[data-index="0"]');
    await expect(firstCell).not.toHaveClass(/opacity-50/, { timeout: 10000 });

    // Get cells for testing
    // In 5x5 grid:
    // Cell 6 is at (1,1) - diagonal from (0,0)
    // Cell 1 is at (0,1) - orthogonal right from (0,0)
    // Cell 5 is at (1,0) - orthogonal down from (0,0)
    const cell0 = page.locator('[data-index="0"]');
    const cell1 = page.locator('[data-index="1"]'); // right
    const cell5 = page.locator('[data-index="5"]'); // down
    const cell6 = page.locator('[data-index="6"]'); // diagonal

    const box0 = await cell0.boundingBox();
    const box6 = await cell6.boundingBox();

    if (!box0 || !box6) {
      throw new Error('Could not get cell bounding boxes');
    }

    // Start from cell 0
    await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);

    // Move in a diagonal direction towards cell 6
    // Use multiple small steps to build up movement history
    const dx = (box6.x + box6.width / 2) - (box0.x + box0.width / 2);
    const dy = (box6.y + box6.height / 2) - (box0.y + box0.height / 2);

    // Move gradually in diagonal direction
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(
        box0.x + box0.width / 2 + (dx * i / 10),
        box0.y + box0.height / 2 + (dy * i / 10)
      );
      await page.waitForTimeout(20);
    }

    await page.waitForTimeout(200);

    // The diagonal cell (6) should be selected, not the orthogonal ones (1 or 5)
    const cell6Selected = await cell6.evaluate(el => el.classList.contains('bg-primary'));
    const cell1Selected = await cell1.evaluate(el => el.classList.contains('bg-primary'));
    const cell5Selected = await cell5.evaluate(el => el.classList.contains('bg-primary'));

    // We expect the diagonal to be selected
    // Note: Due to the algorithm, at least the diagonal should be preferred
    expect(cell6Selected).toBe(true);

    // At most one of the orthogonal cells should be selected (ideally none)
    // This is a relaxed check because the exact behavior depends on pointer position
    const orthogonalCount = (cell1Selected ? 1 : 0) + (cell5Selected ? 1 : 0);
    expect(orthogonalCount).toBeLessThanOrEqual(1);

    await page.mouse.up();
  });
});
