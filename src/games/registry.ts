import type { GameModule, GameConfig } from './types';

// ============================================================================
// Game Registry
// ============================================================================

const gameRegistry = new Map<string, GameModule>();

/**
 * Register a game module with the registry.
 * Called by each game's index.ts on app initialization.
 */
export function registerGame(module: GameModule): void {
  if (gameRegistry.has(module.config.id)) {
    console.warn(`[GameRegistry] Game "${module.config.id}" is already registered`);
    return;
  }
  gameRegistry.set(module.config.id, module);
  console.log(`[GameRegistry] Registered game: ${module.config.id}`);
}

/**
 * Get a game module by ID.
 */
export function getGame(gameId: string): GameModule | undefined {
  return gameRegistry.get(gameId);
}

/**
 * Get all available (released) games.
 */
export function getAvailableGames(): GameConfig[] {
  return Array.from(gameRegistry.values())
    .map((m) => m.config)
    .filter((c) => c.available);
}

/**
 * Get all registered games (including unavailable/coming soon).
 */
export function getAllGames(): GameConfig[] {
  return Array.from(gameRegistry.values()).map((m) => m.config);
}

/**
 * Check if a game is registered.
 */
export function hasGame(gameId: string): boolean {
  return gameRegistry.has(gameId);
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
