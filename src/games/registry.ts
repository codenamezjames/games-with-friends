import type { GameConfig } from './types';

// ============================================================================
// Game Registry
// ============================================================================

// Store just game configs - page components remain shared infrastructure
const gameConfigs = new Map<string, GameConfig>();

/**
 * Register a game config with the registry.
 * Called by each game's index.ts on app initialization.
 */
export function registerGame(config: GameConfig): void {
  if (gameConfigs.has(config.id)) {
    console.warn(`[GameRegistry] Game "${config.id}" is already registered`);
    return;
  }
  gameConfigs.set(config.id, config);
  // Game registered successfully
}

/**
 * Get a game config by ID.
 */
export function getGame(gameId: string): GameConfig | undefined {
  return gameConfigs.get(gameId);
}

/**
 * Get all available (released) games.
 */
export function getAvailableGames(): GameConfig[] {
  return Array.from(gameConfigs.values()).filter((c) => c.available);
}

/**
 * Get all registered games (including unavailable/coming soon).
 */
export function getAllGames(): GameConfig[] {
  return Array.from(gameConfigs.values());
}

/**
 * Check if a game is registered.
 */
export function hasGame(gameId: string): boolean {
  return gameConfigs.has(gameId);
}

/**
 * Get the route base path for a game.
 */
export function getGameRoute(gameId: string): string {
  return `/games/${gameId}`;
}

/**
 * Get all route paths for a game.
 */
export function getGameRoutes(gameId: string) {
  const base = getGameRoute(gameId);
  return {
    lobby: base,
    room: `${base}/room/:roomCode`,
    play: `${base}/play/:roomCode`,
    solo: `${base}/solo`,
    results: `${base}/results`,
  };
}

/**
 * Generate navigation paths for a specific room.
 */
export function getGamePaths(gameId: string, roomCode?: string) {
  const base = getGameRoute(gameId);
  return {
    lobby: base,
    room: roomCode ? `${base}/room/${roomCode}` : base,
    play: roomCode ? `${base}/play/${roomCode}` : base,
    solo: `${base}/solo`,
    results: `${base}/results`,
    joinWithCode: (code: string) => `${base}?room=${code}`,
  };
}
