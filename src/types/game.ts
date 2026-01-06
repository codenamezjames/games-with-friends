// Re-export core game types from the games module
export type {
  GamePhase,
  GameConfig,
  GameResults,
  PlayerResult,
  SerializableGameState,
  GameAction,
  ActionResult,
} from '@/games/types';

// Re-export Word Trace specific types (for backward compatibility)
export type {
  WordSubmission,
  ProcessResult,
  WordRevealItem,
} from '@/games/wordtrace/types';
