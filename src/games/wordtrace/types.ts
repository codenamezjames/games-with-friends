/**
 * Word Trace specific types
 * These types are specific to the Word Trace game implementation
 */

import type { GamePhase, GameResults } from '../types';

// ============================================================================
// Game State
// ============================================================================

/** Word Trace game state stored in Firebase */
export interface WordTraceGameState {
  phase: GamePhase;
  startTime: number | null;
  timeRemaining: number;
  duration: number;
  grid: string[];
  gridSize: number;
  scores: Record<string, number>;
  wordCounts: Record<string, number>;
  foundWords: Record<string, string[]>;
  results?: GameResults;
}

/** Player state during a Word Trace game */
export interface WordTracePlayer {
  id: string;
  name: string;
  score: number;
  wordCount: number;
}

/** Word Trace player result for rankings */
export interface WordTracePlayerResult {
  playerId: string;
  name: string;
  score: number;
  wordCount: number;
  words: string[];
}

// ============================================================================
// Actions & Submissions
// ============================================================================

/** Word submission from a player */
export interface WordSubmission {
  playerId: string;
  word: string;
  path: number[];
  timestamp: number;
}

/** Result of processing a word submission */
export interface ProcessResult {
  success: boolean;
  playerId: string;
  word?: string;
  points?: number;
  newScore?: number;
  wordCount?: number;
  error?: string;
}

// ============================================================================
// Results Display
// ============================================================================

/** Item in the word reveal sequence for results */
export interface WordRevealItem {
  word: string;
  points: number;
  foundByPlayerIds: string[];
  isShared: boolean;
}

// ============================================================================
// Settings
// ============================================================================

/** Word Trace game settings */
export interface WordTraceSettings {
  gridSize: number;
  duration: number;
}

/** Default settings for Word Trace */
export const DEFAULT_WORD_TRACE_SETTINGS: WordTraceSettings = {
  gridSize: 5,
  duration: 120,
};
