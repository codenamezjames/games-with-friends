import { test, expect } from '@playwright/test';
import { MainMenuPage, WaitingRoomPage, GamePage } from '../pages';
import { generateTestPlayerName, waitForFirebaseSync } from '../helpers';

test.describe('Word Submission and Scoring', () => {
  test('tracing shows current word', async ({ browser }) => {
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

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Get first two adjacent cells
      const firstCell = hostGame.getCell(0);
      const secondCell = hostGame.getCell(1);

      // Start tracing
      const box1 = await firstCell.boundingBox();
      const box2 = await secondCell.boundingBox();
      if (!box1 || !box2) throw new Error('Could not get cell bounding boxes');

      await hostPage.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
      await hostPage.mouse.down();

      // Move to second cell
      await hostPage.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);

      // Current word should be displayed (2 letters or more, e.g., "AB" or "QUA")
      const currentWord = await hostGame.getCurrentWord();
      expect(currentWord.length).toBeGreaterThanOrEqual(2);
      // Word should only contain letters
      expect(currentWord).toMatch(/^[A-Z]+$/i);

      await hostPage.mouse.up();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('tracing too short word does not submit', async ({ browser }) => {
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

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Trace only 2 cells (word length 2, too short to submit)
      await hostGame.traceWord([0, 1]);

      // Wait a moment
      await hostPage.waitForTimeout(500);

      // No feedback should appear - word is silently ignored for being too short
      const hasSuccess = await hostGame.feedbackSuccess.isVisible().catch(() => false);
      const hasError = await hostGame.feedbackError.isVisible().catch(() => false);

      // Neither success nor error should be shown for too-short words
      expect(hasSuccess || hasError).toBe(false);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('cells highlight when selected', async ({ browser }) => {
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

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Get first cell
      const firstCell = hostGame.getCell(0);
      const box = await firstCell.boundingBox();
      if (!box) throw new Error('Could not get cell bounding box');

      // Start tracing
      await hostPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await hostPage.mouse.down();

      // Cell should now be selected (has primary background color class)
      await expect(firstCell).toHaveClass(/bg-primary/);

      await hostPage.mouse.up();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('tracing non-adjacent cells does not select them', async ({ browser }) => {
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

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Get letters to verify word length
      const letters = await hostGame.getGridLetters();

      // Trace cells 0, 2 (not adjacent in 5x5 grid - cell 2 is 2 columns away)
      const cell0 = hostGame.getCell(0);
      const cell2 = hostGame.getCell(2);
      const box0 = await cell0.boundingBox();
      const box2 = await cell2.boundingBox();
      if (!box0 || !box2) throw new Error('Could not get cell bounding boxes');

      // Start at cell 0
      await hostPage.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
      await hostPage.mouse.down();

      // Try to move to cell 2 (not adjacent)
      await hostPage.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);

      // Cell 2 should NOT be selected (only cell 0 should be selected)
      await expect(cell0).toHaveClass(/bg-primary/);
      await expect(cell2).not.toHaveClass(/bg-primary/);

      // Current word should only be the first letter
      const currentWord = await hostGame.getCurrentWord();
      expect(currentWord.toUpperCase()).toBe(letters[0].toUpperCase());

      await hostPage.mouse.up();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('word submission shows feedback message', async ({ browser }) => {
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

      const hostGame = new GamePage(hostPage);
      await hostGame.waitForGameStart();

      // Trace 3+ adjacent cells
      await hostGame.traceWord([0, 1, 2]);

      // Wait for feedback to appear (either success or error)
      const hasFeedback = await hostGame.waitForAnyFeedback(3000);

      // Should show some feedback
      expect(hasFeedback).toBe(true);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('player scores start at zero', async ({ browser }) => {
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

      // Both players should be visible in player list
      await expect(hostPage.getByText(hostName)).toBeVisible();
      await expect(hostPage.getByText(guestName)).toBeVisible();

      // Initial scores should be 0
      const hostScore = await hostGame.getPlayerScore(hostName);
      const guestScore = await hostGame.getPlayerScore(guestName);
      expect(hostScore).toBe(0);
      expect(guestScore).toBe(0);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
