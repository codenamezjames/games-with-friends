export type GamePhase = 'setup' | 'countdown' | 'playing' | 'finished';

export interface PlayerResult {
  playerId: string;
  name: string;
  score: number;
  wordCount: number;
  words: string[];
}

export interface GameResults {
  winner: string | null;
  isTie: boolean;
  rankings: PlayerResult[];
}

export interface SerializableGameState {
  grid: string[];
  gridSize: number;
  timeRemaining: number;
  duration: number;
  phase: GamePhase;
  startTime: number | null;
  scores: Record<string, number>;
  wordCounts: Record<string, number>;
  foundWords: Record<string, string[]>;
  results?: GameResults;
}

export interface WordSubmission {
  playerId: string;
  word: string;
  path: number[];
  timestamp: number;
}

export interface ProcessResult {
  success: boolean;
  playerId: string;
  word?: string;
  points?: number;
  newScore?: number;
  wordCount?: number;
  error?: string;
}

export interface GameConfig {
  gameId: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  defaultDuration: number;
}
