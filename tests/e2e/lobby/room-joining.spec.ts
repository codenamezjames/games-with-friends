import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

test.describe('Room Joining', () => {
  test('user can join existing room with valid code', async ({ browser }) => {
    // Create two browser contexts
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);

      // Guest joins room
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);

      // Guest should be in waiting room
      await expect(guestPage).toHaveURL(/\/games\/wordtrace\/room\/[A-Z0-9]{6}/);

      const guestWaitingRoom = new WaitingRoomPage(guestPage);
      await guestWaitingRoom.expectVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('joining with invalid code shows error', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Joiner');

    await mainMenu.goto();
    await mainMenu.enterName(playerName);
    await mainMenu.roomCodeInput.fill('XXXXXX'); // Invalid code
    await mainMenu.joinButton.click();

    // Should show error
    await expect(mainMenu.errorMessage).toBeVisible();
    await expect(mainMenu.errorMessage).toContainText(/not found|invalid/i);

    // Should still be on main menu
    await expect(page).toHaveURL(/\/games\/wordtrace/);
  });

  test('joining with short code shows error', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const playerName = generateTestPlayerName('Joiner');

    await mainMenu.goto();
    await mainMenu.enterName(playerName);
    await mainMenu.roomCodeInput.fill('ABC'); // Too short
    await mainMenu.joinButton.click();

    // Should show error about code length
    await expect(mainMenu.errorMessage).toBeVisible();
  });

  test('cannot join without name', async ({ browser }) => {
    // Host creates room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostMenu = new MainMenuPage(hostPage);
    await hostMenu.goto();
    const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));

    try {
      // Guest tries to join without name
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.nameInput.clear();
      await guestMenu.roomCodeInput.fill(roomCode);
      await guestMenu.joinButton.click();

      // Should show error
      await expect(guestMenu.errorMessage).toBeVisible();
      await expect(guestMenu.errorMessage).toContainText(/name/i);

      await guestContext.close();
    } finally {
      await hostContext.close();
    }
  });

  test('joining player appears in host player list', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      const hostName = generateTestPlayerName('Host');
      const guestName = generateTestPlayerName('Guest');

      // Host creates room
      const hostMenu = new MainMenuPage(hostPage);
      await hostMenu.goto();
      const roomCode = await hostMenu.createRoom(hostName);
      const hostWaitingRoom = new WaitingRoomPage(hostPage);

      // Guest joins room
      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.goto();
      await guestMenu.joinRoom(guestName, roomCode);

      // Wait for Firebase sync
      await waitForFirebaseSync(1000);

      // Host should see guest in player list
      await expect(hostPage.getByText(guestName)).toBeVisible({ timeout: 5000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('URL prefill auto-fills room code', async ({ browser }) => {
    // Host creates room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostMenu = new MainMenuPage(hostPage);
    await hostMenu.goto();
    const roomCode = await hostMenu.createRoom(generateTestPlayerName('Host'));

    try {
      // Guest navigates with room code in URL
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();

      const guestMenu = new MainMenuPage(guestPage);
      await guestMenu.gotoWithRoomCode(roomCode);

      // Should show focused join view with room code displayed
      await expect(guestPage.getByText(roomCode)).toBeVisible();

      // Should show "Join Game" button instead of separate join section
      await expect(guestPage.getByRole('button', { name: /join game/i })).toBeVisible();

      await guestContext.close();
    } finally {
      await hostContext.close();
    }
  });

  test('room code input converts to uppercase', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);

    await mainMenu.goto();
    await mainMenu.roomCodeInput.fill('abcdef');

    // Should be converted to uppercase
    const value = await mainMenu.roomCodeInput.inputValue();
    expect(value).toBe('ABCDEF');
  });
});
