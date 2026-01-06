/**
 * [GAME_NAME] Game Types
 *
 * Define all types specific to your game here.
 * Generic types like GamePhase and GameResults are in ../types.ts
 */

import type { GamePhase, GameResults } from '../types';

// ============================================================================
// Game State
// ============================================================================

/**
 * Your game's state stored in Firebase.
 * Should be JSON-serializable (no functions, classes, or circular refs).
 */
export interface TemplateGameState {
  phase: GamePhase;
  startTime: number | null;
  timeRemaining: number;
  duration: number;
  scores: Record<string, number>;
  results?: GameResults;

  // Add your game-specific state fields here:
  // currentRound?: number;
  // deck?: Card[];
  // currentQuestion?: Question;
}

// ============================================================================
// Player State
// ============================================================================

/**
 * Per-player state during gameplay.
 */
export interface TemplatePlayer {
  id: string;
  name: string;
  score: number;
  // Add player-specific fields:
  // hand?: Card[];
  // hasAnswered?: boolean;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Actions players can take during the game.
 * Sent to Firebase and processed by the host.
 */
export interface TemplateAction {
  type: 'example_action'; // | 'play_card' | 'submit_answer' | etc.
  playerId: string;
  timestamp: number;
  payload: {
    // Action-specific data
  };
}

/**
 * Result of processing a player action.
 */
export interface TemplateActionResult {
  success: boolean;
  playerId: string;
  error?: string;
  // Action-specific result data:
  // pointsAwarded?: number;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Game-specific settings configurable in the lobby.
 */
export interface TemplateSettings {
  duration: number;
  // Add your settings:
  // difficulty?: 'easy' | 'medium' | 'hard';
  // categoryId?: string;
}

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  duration: 120,
};
