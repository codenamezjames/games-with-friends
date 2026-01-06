import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage } from '../pages';
import { generateTestPlayerName } from '../helpers';

test.describe('Room Creation', () => {
  test('user can create a room with valid name', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Creator');

    await mainMenu.goto();
    await mainMenu.enterName(playerName);
    await mainMenu.createRoomButton.click();

    // Should navigate to waiting room
    await expect(page).toHaveURL(/\/games\/wordtrace\/room\/[A-Z0-9]{6}/);

    // Waiting room should display
    const waitingRoom = new WaitingRoomPage(page);
    await waitingRoom.expectVisible();
  });

  test('room code is 6 characters alphanumeric', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Creator');

    await mainMenu.goto();
    const roomCode = await mainMenu.createRoom(playerName);

    // Room code should be 6 characters
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('room code is displayed in waiting room', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Creator');

    await mainMenu.goto();
    const roomCode = await mainMenu.createRoom(playerName);

    const waitingRoom = new WaitingRoomPage(page);
    const displayedCode = await waitingRoom.getRoomCode();

    expect(displayedCode).toBe(roomCode);
  });

  test('creator is shown as host in player list', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Host');

    await mainMenu.goto();
    await mainMenu.createRoom(playerName);

    const waitingRoom = new WaitingRoomPage(page);

    // Player name should be visible
    await expect(page.getByText(playerName)).toBeVisible();

    // Should show host indicator (exact match to avoid matching player name)
    await expect(page.getByText('Host', { exact: true })).toBeVisible();
  });

  test('share URL contains room code', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Creator');

    await mainMenu.goto();
    const roomCode = await mainMenu.createRoom(playerName);

    const waitingRoom = new WaitingRoomPage(page);
    const shareUrl = await waitingRoom.getShareUrl();

    expect(shareUrl).toContain(roomCode);
    expect(shareUrl).toContain('/games/wordtrace');
  });

  test('cannot create room without name', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);

    await mainMenu.goto();

    // Clear any existing name and try to create
    await mainMenu.nameInput.clear();
    await mainMenu.createRoomButton.click();

    // Should show error
    await expect(mainMenu.errorMessage).toBeVisible();
    await expect(mainMenu.errorMessage).toContainText(/name/i);

    // Should still be on main menu
    await expect(page).toHaveURL(/\/games\/wordtrace$/);
  });

  test('copy code button works', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Creator');

    await mainMenu.goto();
    const roomCode = await mainMenu.createRoom(playerName);

    const waitingRoom = new WaitingRoomPage(page);
    await waitingRoom.copyCode();

    // Check clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(roomCode);
  });
});
