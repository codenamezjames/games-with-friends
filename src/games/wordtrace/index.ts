/**
 * Word Trace Game Module
 *
 * This module exports everything needed for the Word Trace game.
 * Full game registry integration will happen in Phase 2.
 */

import { WordTraceGame } from './WordTraceGame';
import { generateGrid } from './utils';
import { DEFAULT_WORD_TRACE_SETTINGS } from './types';

// Re-export types and utilities for convenience
export * from './types';
export { WordTraceGame } from './WordTraceGame';
export * from './utils';

// Game configuration (matches GameConfig interface shape)
export const wordTraceConfig = {
  id: 'wordtrace',
  displayName: 'Word Trace',
  description: 'Find words by tracing paths through a grid of letters',
  icon: '📝',
  minPlayers: 2,
  maxPlayers: 8,
  defaultDuration: 120,
  durationOptions: [
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 180, label: '3 minutes' },
  ],
  supportsSolo: true,
  available: true,
  defaultSettings: DEFAULT_WORD_TRACE_SETTINGS,
} as const;

// Generate initial game state for multiplayer
export function generateInitialState(
  players: Record<string, { name: string }>,
  settings?: { gridSize?: number; duration?: number }
) {
  const gridSize = settings?.gridSize ?? DEFAULT_WORD_TRACE_SETTINGS.gridSize;
  const duration = settings?.duration ?? DEFAULT_WORD_TRACE_SETTINGS.duration;

  const scores: Record<string, number> = {};
  const wordCounts: Record<string, number> = {};
  const foundWords: Record<string, string[]> = {};

  for (const playerId of Object.keys(players)) {
    scores[playerId] = 0;
    wordCounts[playerId] = 0;
    foundWords[playerId] = [];
  }

  return {
    grid: generateGrid(gridSize),
    gridSize,
    phase: 'countdown' as const,
    startTime: Date.now() + 3000, // 3 second countdown
    timeRemaining: duration,
    duration,
    scores,
    wordCounts,
    foundWords,
  };
}

// Factory function for creating game instances
export function createWordTraceGame(): WordTraceGame {
  return new WordTraceGame();
}
