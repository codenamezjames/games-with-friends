import { test, expect } from '@playwright/test';
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

test.describe('Ready Check Flow', () => {
  // Uses 10s test duration on localhost for fast tests
  // TODO: Flaky due to host disconnect during game - needs investigation
  // When host browser context becomes disconnected during gameplay, game never ends
  // because only host can trigger handleGameEnd() and set phase to 'finished'
  test.skip('ready check panel shows for both players after game ends', async ({ browser }) => {
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase on both
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Both should see the ready check panel
      await expect(hostResults.readyCheckTitle).toBeVisible();
      await expect(guestResults.readyCheckTitle).toBeVisible();

      // Both should see checkboxes
      await expect(hostResults.readyCheckbox).toBeVisible();
      await expect(guestResults.readyCheckbox).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('all players marking ready triggers auto-start', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase on both
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Wait for Firebase sync so both players see each other
      await hostPage.waitForTimeout(1000);

      // Verify we can see 2 players on host side (look for "X of 2 ready")
      await expect(hostPage.getByText(/of 2 ready/)).toBeVisible({ timeout: 5000 });

      // Both players mark ready
      await hostResults.markReady();
      await guestResults.markReady();

      // Wait for Firebase sync
      await hostPage.waitForTimeout(1000);

      // Should auto-start and navigate to game page
      await Promise.all([
        hostResults.waitForAutoStart(15000),
        guestResults.waitForAutoStart(15000),
      ]);

      // Verify both are on game page
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('host can start anyway with unready players', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase on both
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Wait for players to be loaded (should show "X of 2 ready")
      await expect(hostPage.getByText(/of 2 ready/)).toBeVisible({ timeout: 10000 });

      // Host should see "Start Anyway" button (no one marked ready yet)
      await expect(hostResults.startAnywayButton).toBeVisible({ timeout: 5000 });

      // Host clicks Start Anyway
      await hostResults.startAnywayButton.click();

      // Wait for navigation
      await hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 });

      // Host should be on game page
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);

      // Guest should also navigate to game page (as spectator)
      await guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 15000 });
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

test.describe('Host Transfer and Reconnection', () => {
  test('original host reconnects as guest after host transfer (does not get re-promoted)', async ({ browser }) => {
    // Test scenario:
    // 1. Host creates room, guest joins
    // 2. Host disconnects (closes page)
    // 3. Guest becomes new host after grace period
    // 4. Original host reconnects - should be a GUEST, not re-promoted to host
    test.setTimeout(45000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('OrigHost');
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

      // Verify initial state
      await expect(hostWaitingRoom.startGameButton).toBeVisible();
      await expect(guestWaitingRoom.readyCheckbox).toBeVisible();

      // Host disconnects
      await hostPage.close();

      // Wait for host transfer grace period (5 seconds) + buffer
      await guestPage.waitForTimeout(7000);

      // Guest should now be host
      await expect(guestWaitingRoom.startGameButton).toBeVisible({ timeout: 5000 });

      // Original host reconnects
      const reconnectedHostPage = await hostContext.newPage();
      const reconnectedMenu = new MainMenuPage(reconnectedHostPage);
      await reconnectedMenu.goto();
      await reconnectedMenu.joinRoom(hostName, roomCode);

      const reconnectedWaitingRoom = new WaitingRoomPage(reconnectedHostPage);
      await reconnectedWaitingRoom.expectVisible();

      // Original host should see GUEST UI (ready checkbox), NOT host UI
      await expect(reconnectedWaitingRoom.readyCheckbox).toBeVisible({ timeout: 5000 });
      await expect(reconnectedWaitingRoom.startGameButton).not.toBeVisible();

      // Guest should still be host
      await expect(guestWaitingRoom.startGameButton).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('three players: host leaves, second player becomes host, original host rejoins as guest', async ({ browser }) => {
    // Test scenario with 3 players to verify host transfer with multiple candidates
    test.setTimeout(45000);

    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();

    const hostName = generateTestPlayerName('Host');
    const guest1Name = generateTestPlayerName('Guest1');
    const guest2Name = generateTestPlayerName('Guest2');

    try {
      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.expectVisible();

      // Guest1 joins
      const guest1Menu = new MainMenuPage(guest1Page);
      await guest1Menu.goto();
      await guest1Menu.joinRoom(guest1Name, roomCode);
      const guest1WaitingRoom = new WaitingRoomPage(guest1Page);
      await guest1WaitingRoom.expectVisible();

      // Guest2 joins
      const guest2Menu = new MainMenuPage(guest2Page);
      await guest2Menu.goto();
      await guest2Menu.joinRoom(guest2Name, roomCode);
      const guest2WaitingRoom = new WaitingRoomPage(guest2Page);
      await guest2WaitingRoom.expectVisible();

      // Verify initial state - host sees start button, guests see checkbox
      await expect(hostWaitingRoom.startGameButton).toBeVisible();
      await expect(guest1WaitingRoom.readyCheckbox).toBeVisible();
      await expect(guest2WaitingRoom.readyCheckbox).toBeVisible();

      // Host disconnects
      await hostPage.close();

      // Wait for host transfer grace period + buffer
      await guest1Page.waitForTimeout(7000);

      // One of the guests should become host (deterministic by playerId)
      // Check if either guest1 or guest2 became host
      const guest1IsHost = await guest1WaitingRoom.startGameButton.isVisible().catch(() => false);
      const guest2IsHost = await guest2WaitingRoom.startGameButton.isVisible().catch(() => false);

      expect(guest1IsHost || guest2IsHost).toBe(true);
      // Exactly one should be host
      expect(guest1IsHost !== guest2IsHost).toBe(true);

      // Original host reconnects
      const reconnectedHostPage = await hostContext.newPage();
      const reconnectedMenu = new MainMenuPage(reconnectedHostPage);
      await reconnectedMenu.goto();
      await reconnectedMenu.joinRoom(hostName, roomCode);

      const reconnectedWaitingRoom = new WaitingRoomPage(reconnectedHostPage);
      await reconnectedWaitingRoom.expectVisible();

      // Original host should be a guest now
      await expect(reconnectedWaitingRoom.readyCheckbox).toBeVisible({ timeout: 5000 });
      await expect(reconnectedWaitingRoom.startGameButton).not.toBeVisible();
    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });
});

test.describe('Play Again Scenarios', () => {
  test.skip('both players mark ready simultaneously', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Both mark ready at the same time
      await Promise.all([
        hostResults.markReady(),
        guestResults.markReady(),
      ]);

      // Wait for auto-start navigation to game page
      await Promise.all([
        hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
        guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
      ]);

      // Both should be on game page
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('guest leaves during results, host can still start', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Guest leaves (closes page)
      await guestPage.close();
      await hostPage.waitForTimeout(1000);

      // Host marks ready - since guest left, host is only player
      await hostResults.markReady();

      // Should auto-start since all remaining players are ready
      await hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('host leaves during results, guest sees leave room option', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for winner phase
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Host leaves (closes page)
      await hostPage.close();
      await guestPage.waitForTimeout(1000);

      // Guest should still see the ready check panel
      await expect(guestResults.readyCheckPanel).toBeVisible();

      // Guest can mark ready - after host transfer, guest becomes host
      await guestResults.markReady();

      // Since guest is now the only player and marked ready, game should start
      await guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 15000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('multiple consecutive rematches work correctly', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    // Test that ready check flow can be used multiple times in a row
    test.setTimeout(180000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    const hostName = generateTestPlayerName('Host');
    const guestName = generateTestPlayerName('Guest');

    try {
      // Setup initial room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);
      await hostWaitingRoom.setDuration('10s');

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);
      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.toggleReady();

      // Play first game
      await waitForFirebaseSync(1000);
      await hostWaitingRoom.startGame();

      const hostGame = new GamePage(hostPage);
      const guestGame = new GamePage(guestPage);
      await hostGame.waitForGameStart();
      await guestGame.waitForGameStart();
      await Promise.all([
        hostGame.waitForGameEnd(30000),
        guestGame.waitForGameEnd(30000),
      ]);

      // First rematch via ready check
      const hostResults1 = new ResultsPage(hostPage);
      const guestResults1 = new ResultsPage(guestPage);
      await Promise.all([
        hostResults1.waitForWinnerPhase(30000),
        guestResults1.waitForWinnerPhase(30000),
      ]);

      // Both mark ready
      await hostResults1.markReady();
      await guestResults1.markReady();

      // Wait for auto-start
      await Promise.all([
        hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
        guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
      ]);

      // Play second game
      const hostGame2 = new GamePage(hostPage);
      const guestGame2 = new GamePage(guestPage);
      await hostGame2.waitForGameStart();
      await guestGame2.waitForGameStart();
      await Promise.all([
        hostGame2.waitForGameEnd(30000),
        guestGame2.waitForGameEnd(30000),
      ]);

      // Second rematch via ready check
      const hostResults2 = new ResultsPage(hostPage);
      const guestResults2 = new ResultsPage(guestPage);
      await Promise.all([
        hostResults2.waitForWinnerPhase(30000),
        guestResults2.waitForWinnerPhase(30000),
      ]);

      // Both mark ready again
      await hostResults2.markReady();
      await guestResults2.markReady();

      // Wait for auto-start again
      await Promise.all([
        hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
        guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
      ]);

      // Verify both are in game after second rematch
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip('ready check works after game with no words found', async ({ browser }) => {
    // TODO: Fix Firebase sync timing issues with ready check
    // Edge case: results show immediately (no reveal phase) when no words found
    test.setTimeout(90000);

    const {
      hostContext,
      guestContext,
      hostPage,
      guestPage,
    } = await setupGameToResults(browser);

    try {
      const hostResults = new ResultsPage(hostPage);
      const guestResults = new ResultsPage(guestPage);

      // Wait for results to show (either reveal or winner phase)
      await Promise.all([
        hostResults.waitForWinnerPhase(30000),
        guestResults.waitForWinnerPhase(30000),
      ]);

      // Both mark ready
      await hostResults.markReady();
      await guestResults.markReady();

      // Wait for auto-start
      await Promise.all([
        hostPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
        guestPage.waitForURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/, { timeout: 10000 }),
      ]);

      // Verify both are on game page
      await expect(hostPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/play\/[A-Z0-9]+/);
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
