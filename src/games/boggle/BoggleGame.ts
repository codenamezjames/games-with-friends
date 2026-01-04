import { DICTIONARY } from '@/lib/dictionary';
import {
  isValidPath,
  getWordPoints,
  generateGrid,
  getWordFromPath,
} from './utils';
import type { ProcessResult, GameResults, SerializableGameState, GamePhase } from '@/types';

export interface BogglePlayer {
  id: string;
  name: string;
  score: number;
  wordCount: number;
}

/**
 * BoggleGame - Handles game logic for the host
 * This class is used by the host to validate words and manage game state
 */
export class BoggleGame {
  static GAME_ID = 'boggle';
  static DISPLAY_NAME = 'Word Trace';
  static MIN_PLAYERS = 2;
  static MAX_PLAYERS = 2;
  static DEFAULT_DURATION = 120;
  static DEFAULT_GRID_SIZE = 5;

  grid: string[] = [];
  gridSize: number = BoggleGame.DEFAULT_GRID_SIZE;
  foundWords: Map<string, Set<string>> = new Map();
  players: Map<string, BogglePlayer> = new Map();
  timeRemaining: number = BoggleGame.DEFAULT_DURATION;
  duration: number = BoggleGame.DEFAULT_DURATION;
  phase: GamePhase = 'setup';
  startTime: number | null = null;

  /**
   * Initialize the game with players
   */
  initialize(playerData: Record<string, { name: string }>): void {
    this.grid = generateGrid();
    this.timeRemaining = BoggleGame.DEFAULT_DURATION;
    this.foundWords.clear();
    this.players.clear();

    for (const [playerId, data] of Object.entries(playerData)) {
      this.players.set(playerId, {
        id: playerId,
        name: data.name,
        score: 0,
        wordCount: 0,
      });
      this.foundWords.set(playerId, new Set());
    }
  }

  /**
   * Process a word submission (host only)
   */
  processWord(playerId: string, word: string, path: number[]): ProcessResult {
    const playerWords = this.foundWords.get(playerId);
    const player = this.players.get(playerId);

    if (!playerWords || !player) {
      return { success: false, playerId, error: 'PLAYER_NOT_FOUND' };
    }

    // Validate path
    if (!isValidPath(path, this.gridSize)) {
      return { success: false, playerId, error: 'INVALID_PATH' };
    }

    // Verify path matches word
    const pathWord = getWordFromPath(this.grid, path);
    if (pathWord !== word) {
      return { success: false, playerId, error: 'PATH_MISMATCH' };
    }

    // Check minimum length
    if (word.length < 3) {
      return { success: false, playerId, error: 'TOO_SHORT' };
    }

    // Check if already found
    if (playerWords.has(word)) {
      return { success: false, playerId, error: 'ALREADY_FOUND' };
    }

    // Check dictionary
    if (!DICTIONARY.has(word)) {
      return { success: false, playerId, error: 'NOT_IN_DICTIONARY' };
    }

    // Valid word found!
    const points = getWordPoints(word);
    playerWords.add(word);
    player.score += points;
    player.wordCount = playerWords.size;

    return {
      success: true,
      playerId,
      word,
      points,
      newScore: player.score,
      wordCount: player.wordCount,
    };
  }

  /**
   * Calculate final results
   */
  calculateResults(): GameResults {
    const results: GameResults['rankings'] = [];

    for (const [playerId, player] of this.players) {
      const words = this.foundWords.get(playerId);
      results.push({
        playerId,
        name: player.name,
        score: player.score,
        wordCount: words ? words.size : 0,
        words: words ? Array.from(words) : [],
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const winner = results.length > 0 ? results[0] : null;
    const isTie = results.length > 1 && results[0].score === results[1].score;

    return {
      winner: isTie ? null : winner?.playerId || null,
      isTie,
      rankings: results,
    };
  }

  /**
   * Get state for Firebase sync
   */
  getSerializableState(): SerializableGameState {
    const foundWordsObj: Record<string, string[]> = {};
    const scores: Record<string, number> = {};
    const wordCounts: Record<string, number> = {};

    for (const [playerId, words] of this.foundWords) {
      foundWordsObj[playerId] = Array.from(words);
    }

    for (const [playerId, player] of this.players) {
      scores[playerId] = player.score;
      wordCounts[playerId] = player.wordCount;
    }

    return {
      grid: this.grid,
      gridSize: this.gridSize,
      timeRemaining: this.timeRemaining,
      duration: this.duration,
      phase: this.phase,
      startTime: this.startTime,
      scores,
      wordCounts,
      foundWords: foundWordsObj,
    };
  }

  /**
   * Apply state from Firebase (for restoring state)
   */
  applyState(state: SerializableGameState): void {
    this.grid = state.grid;
    this.gridSize = state.gridSize ?? BoggleGame.DEFAULT_GRID_SIZE;
    this.timeRemaining = state.timeRemaining;
    this.duration = state.duration;
    this.phase = state.phase;
    this.startTime = state.startTime;

    if (state.scores) {
      for (const [playerId, score] of Object.entries(state.scores)) {
        const player = this.players.get(playerId);
        if (player) {
          player.score = score;
        }
      }
    }

    if (state.wordCounts) {
      for (const [playerId, count] of Object.entries(state.wordCounts)) {
        const player = this.players.get(playerId);
        if (player) {
          player.wordCount = count;
        }
      }
    }

    if (state.foundWords) {
      for (const [playerId, words] of Object.entries(state.foundWords)) {
        this.foundWords.set(playerId, new Set(words));
      }
    }
  }
}
