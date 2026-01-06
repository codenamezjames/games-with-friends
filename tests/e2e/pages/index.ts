/**
 * Page Object Models for e2e tests.
 *
 * Usage:
 * ```typescript
 * import { MainMenuPage, WaitingRoomPage } from './pages';
 *
 * test('example', async ({ page }) => {
 *   const mainMenu = new MainMenuPage(page);
 *   await mainMenu.goto();
 *   const roomCode = await mainMenu.createRoom('Player1');
 * });
 * ```
 */

export { BasePage } from './BasePage';
export { MainMenuPage } from './MainMenuPage';
export { WaitingRoomPage } from './WaitingRoomPage';
export { GamePage } from './GamePage';
export { ResultsPage } from './ResultsPage';
export { SoloGamePage } from './SoloGamePage';
