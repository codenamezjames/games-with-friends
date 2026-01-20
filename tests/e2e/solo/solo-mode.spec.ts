import { test, expect } from '@playwright/test';
import { MainMenuPage, SoloGamePage } from '../pages';
import { generateTestPlayerName } from '../helpers';

test.describe('Solo Mode Game Start', () => {
  test('can start solo game from main menu', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();

    const playerName = generateTestPlayerName('Solo');
    await mainMenu.startSoloMode(playerName);

    // Should be on solo game page (setup screen)
    await expect(page).toHaveURL(/\/games\/wordtrace\/solo/);

    const soloGame = new SoloGamePage(page);
    await soloGame.expectSetupVisible();

    // Start the game
    await soloGame.startGame();

    // Should now be in gameplay
    await soloGame.expectTimerVisible();
  });

  test('solo game shows countdown then starts', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);

    // Start the game from setup screen
    await soloGame.startGame();

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
    await soloGame.startGame();

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
    await soloGame.startGame();

    // Word count should show 0 words
    const wordCount = await soloGame.getWordCount();
    expect(wordCount).toBe(0);
  });
});

test.describe('Solo Mode Gameplay', () => {
  test('can trace letters on grid', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.startGame();

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
    await soloGame.startGame();

    // Small delay to ensure game is fully ready
    await page.waitForTimeout(200);

    // Trace 3+ adjacent cells to attempt word submission
    await soloGame.traceWord([0, 1, 2]);

    // Check for any feedback message by looking for specific text
    // Possible messages: "Nice!", "Already found!", "Too short", "Not a word"
    const feedbackLocator = page.getByText(/Nice!|Already found!|Too short|Not a word/);

    // Wait for feedback to appear
    await expect(feedbackLocator).toBeVisible({ timeout: 5000 });
  });

  test('timer decrements during gameplay', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    await soloGame.startGame();

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
  // Uses 2s test duration on localhost
  test('results modal appears when game ends', async ({ page }) => {
    test.setTimeout(30000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    // Select 2s test duration for faster test
    await soloGame.startTestGame();

    // Wait for game to end (2s game + countdown + buffer)
    await soloGame.waitForResults(15000);

    // Results modal should be visible
    const hasResults = await soloGame.hasResultsModal();
    expect(hasResults).toBe(true);

    // Should show "Game Over!"
    await expect(page.getByText('Game Over!')).toBeVisible();
  });

  test('play again starts new game', async ({ page }) => {
    test.setTimeout(30000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    // Select 2s test duration for faster test
    await soloGame.startTestGame();

    // Wait for game to end
    await soloGame.waitForResults(15000);

    // Click play again
    await soloGame.playAgain();

    // Should reset - results modal should close
    await expect(page.getByText('Game Over!')).not.toBeVisible({ timeout: 5000 });

    // Should be able to wait for game ready again (play again goes directly to gameplay)
    await soloGame.waitForGameReady();
  });

  test('back to menu navigates to main menu', async ({ page }) => {
    test.setTimeout(30000);

    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startSoloMode(generateTestPlayerName('Solo'));

    const soloGame = new SoloGamePage(page);
    // Select 2s test duration for faster test
    await soloGame.startTestGame();

    // Wait for game to end
    await soloGame.waitForResults(15000);

    // Click back to menu
    await soloGame.backToMenu();

    // Should be at main menu
    await expect(page).toHaveURL(/\/games\/wordtrace$/);
  });
});
