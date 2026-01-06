import type { ComponentType } from 'react';

// ============================================================================
// Core Game Types
// ============================================================================

export type GamePhase = 'setup' | 'countdown' | 'playing' | 'finished' | 'lobby';

export interface PlayerResult {
  playerId: string;
  name: string;
  score: number;
  wordCount?: number; // Word Trace specific
  words?: string[]; // Word Trace specific
}

export interface GameResults {
  winner: string | null;
  isTie: boolean;
  rankings: PlayerResult[];
}

/**
 * Serializable game state stored in Firebase.
 * Currently includes Word Trace specific fields - these can be moved
 * to a game-specific type when adding new games.
 */
export interface SerializableGameState {
  phase: GamePhase;
  startTime: number | null;
  timeRemaining: number;
  duration: number;
  scores: Record<string, number>;
  results?: GameResults;

  // Word Trace specific fields (TODO: move to WordTraceGameState when adding new games)
  grid?: string[];
  gridSize?: number;
  wordCounts?: Record<string, number>;
  foundWords?: Record<string, string[]>;
}

// ============================================================================
// Game Actions
// ============================================================================

// Generic action - games define their own action types
export interface GameAction {
  type: string;
  playerId: string;
  timestamp: number;
  payload: unknown;
}

export interface ActionResult {
  success: boolean;
  playerId: string;
  error?: string;
  stateUpdate?: Partial<SerializableGameState>;
}

// ============================================================================
// Game Configuration
// ============================================================================

export interface DurationOption {
  value: number;
  label: string;
}

export interface GameConfig {
  id: string;
  displayName: string;
  description: string;
  icon: string;

  // Player constraints
  minPlayers: number;
  maxPlayers: number;

  // Time settings
  defaultDuration: number;
  durationOptions?: DurationOption[];

  // Feature flags
  supportsSolo: boolean;
  available: boolean;

  // Default game-specific settings
  defaultSettings?: Record<string, unknown>;
}

// ============================================================================
// Game Instance (runtime game logic)
// ============================================================================

export interface GameInstance {
  // Process a player action (returns result for Firebase sync)
  processAction: (playerId: string, action: GameAction) => ActionResult;

  // Calculate final results
  calculateResults: () => GameResults;

  // State serialization
  getSerializableState: () => SerializableGameState;
  applyState: (state: SerializableGameState) => void;
}

// ============================================================================
// Game Module (exported by each game)
// ============================================================================

export interface GameModule {
  config: GameConfig;

  // Page components
  GamePage: ComponentType;
  ResultsPage: ComponentType;
  SoloGamePage?: ComponentType;

  // Game logic factory
  createGame: () => GameInstance;

  // Initial state generator (called by host when starting game)
  generateInitialState: (
    players: Record<string, { name: string }>,
    settings: Record<string, unknown>
  ) => SerializableGameState;

  // Optional settings component for lobby
  SettingsPanel?: ComponentType<{
    settings: Record<string, unknown>;
    onChange: (settings: Record<string, unknown>) => void;
  }>;
}
