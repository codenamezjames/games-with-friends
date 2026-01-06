/**
 * [GAME_NAME] Game Module
 *
 * This is a template for creating new games. To use:
 * 1. Copy this folder and rename it (e.g., "trivia", "cardgame")
 * 2. Update the config, types, and components for your game
 * 3. Import your module in App.tsx to register it
 *
 * See /docs/adding-new-games.md for detailed instructions.
 */

// @ts-expect-error - registerGame is intentionally unused in template
import { registerGame } from '../registry';
import type { GameConfig, SerializableGameState } from '../types';

// Re-export types for convenience
export * from './types';

// ============================================================================
// Game Configuration
// ============================================================================

export const gameConfig: GameConfig = {
  id: 'template', // CHANGE: unique game identifier (lowercase, no spaces)
  displayName: 'Template Game', // CHANGE: display name shown in UI
  description: 'A template for creating new games', // CHANGE: brief description
  icon: '🎮', // CHANGE: emoji icon for the game

  // Player limits
  minPlayers: 2,
  maxPlayers: 8,

  // Time settings
  defaultDuration: 120, // seconds
  durationOptions: [
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 180, label: '3 minutes' },
  ],

  // Feature flags
  supportsSolo: false, // Set to true if game has solo mode
  available: false, // Set to true when ready for release

  // Default game-specific settings
  defaultSettings: {
    // Add your game's configurable settings here
  },
};

// ============================================================================
// Initial State Generator
// ============================================================================

/**
 * Generate the initial game state when host starts the game.
 * Called once when transitioning from lobby to gameplay.
 */
export function generateInitialState(
  players: Record<string, { name: string }>,
  settings?: Record<string, unknown>
): SerializableGameState {
  // Initialize scores for all players
  const scores: Record<string, number> = {};
  for (const playerId of Object.keys(players)) {
    scores[playerId] = 0;
  }

  const duration = (settings?.duration as number) ?? gameConfig.defaultDuration;

  return {
    phase: 'countdown',
    startTime: Date.now() + 3000, // 3 second countdown
    timeRemaining: duration,
    duration,
    scores,
    // Add your game-specific initial state here
  };
}

// ============================================================================
// Registration
// ============================================================================

// Uncomment to register this game (requires available: true in config)
// registerGame(gameConfig);

// To register during development with available: false:
// registerGame({ ...gameConfig, available: true });
