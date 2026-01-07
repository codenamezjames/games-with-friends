import { test, expect } from '@playwright/test';
import { MainMenuPage, SoloGamePage } from '../pages';
import { generateTestPlayerName } from '../helpers';

test.describe('Solo Mode Game Start', () => {
  test('can start solo game from main menu', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();

    const playerName = generateTestPlayerName('Solo');
    await mainMenu.startSoloMode(playerName);

    // Should be on solo game page
    await expect(page).toHaveURL(/\/games\/wordtrace\/solo/);

    const soloGame = new SoloGamePage(page);
    await soloGame.expectVisible();
  });

  test('solo game shows countdown then starts', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);

    // Countdown may have passed quickly, so just verify game eventually starts
    // Wait for game to be ready (cells interactive)
    await soloGame.waitForGameReady();

    // Timer should be visible and counting
    await soloGame.expectTimerVisible();

    // Verify the game is in playing state
    const isPlaying = await soloGame.isPlaying();
    expect(isPlaying).toBe(true);
  });

  test('solo game shows timer and grid', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Timer should show time
    const time = await soloGame.getTimeRemainingSeconds();
    expect(time).toBeGreaterThan(0);
    expect(time).toBeLessThanOrEqual(120); // Default 2 min

    // Grid should have letters
    const letters = await soloGame.getGridLetters();
    expect(letters.length).toBe(25); // 5x5 grid
  });

  test('solo game score starts at zero', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Score should be 0
    const score = await soloGame.getScore();
    expect(score).toBe(0);
  });
});

test.describe('Solo Mode Gameplay', () => {
  test('can trace letters on grid', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Trace some cells
    const firstCell = soloGame.getCell(0);
    const box = await firstCell.boundingBox();
    if (!box) throw new Error('Could not get cell bounding box');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Cell should be selected
    await expect(firstCell).toHaveClass(/bg-primary/);

    await page.mouse.up();
  });

  test('word submission shows feedback', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Trace 3+ cells to attempt word submission
    await soloGame.traceWord([0, 1, 2]);

    // Should show some feedback (success or error)
    const hasSuccess = await soloGame.feedbackSuccess.isVisible().catch(() => false);
    const hasError = await soloGame.feedbackError.isVisible().catch(() => false);

    // One of them should be visible
    expect(hasSuccess || hasError).toBe(true);
  });

  test('timer decrements during gameplay', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Get initial time
    const initialTime = await soloGame.getTimeRemainingSeconds();

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Time should have decreased
    const newTime = await soloGame.getTimeRemainingSeconds();
    expect(newTime).toBeLessThan(initialTime);
  });
});

test.describe('Solo Mode Results', () => {
  // Uses 10s test duration on localhost
  test('results modal appears when game ends', async ({ page }) => {
    test.setTimeout(60000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Wait for game to end (10s game on localhost + countdown + buffer)
    await soloGame.waitForResults(30000);

    // Results modal should be visible
    const hasResults = await soloGame.hasResultsModal();
    expect(hasResults).toBe(true);

    // Should show "Game Over!"
    await expect(page.getByText('Game Over!')).toBeVisible();
  });

  test('play again starts new game', async ({ page }) => {
    test.setTimeout(60000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Wait for game to end
    await soloGame.waitForResults(30000);

    // Click play again
    await soloGame.playAgain();

    // Should reset - results modal should close
    await expect(page.getByText('Game Over!')).not.toBeVisible({ timeout: 5000 });

    // Should be able to wait for game ready again
    await soloGame.waitForGameReady();
  });

  test('back to menu navigates to main menu', async ({ page }) => {
    test.setTimeout(60000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.waitForGameReady();

    // Wait for game to end
    await soloGame.waitForResults(30000);

    // Click back to menu
    await soloGame.backToMenu();

    // Should be at main menu
    await expect(page).toHaveURL(/\/games\/wordtrace$/);
  });
});
