import { create } from 'zustand';
import type { GamePhase, GameResults, SerializableGameState } from '@/types';

interface GameState {
  // State
  phase: GamePhase;
  startTime: number | null;
  grid: string[];
  gridSize: number;
  timeRemaining: number;
  duration: number;
  scores: Record<string, number>;
  wordCounts: Record<string, number>;
  foundWords: Record<string, string[]>;
  results: GameResults | null;
  testMode: boolean;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setStartTime: (time: number | null) => void;
  setGrid: (grid: string[]) => void;
  setGridSize: (size: number) => void;
  setTimeRemaining: (time: number) => void;
  setDuration: (duration: number) => void;
  updatePlayerScore: (playerId: string, score: number, wordCount: number) => void;
  addFoundWord: (playerId: string, word: string) => void;
  setResults: (results: GameResults | null) => void;
  applyStateFromFirebase: (state: SerializableGameState) => void;
  resetGame: () => void;
}

const initialState = {
  phase: 'setup' as GamePhase,
  startTime: null,
  grid: [],
  gridSize: 5,
  timeRemaining: 120,
  duration: 120,
  scores: {},
  wordCounts: {},
  foundWords: {},
  results: null,
  testMode: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setStartTime: (time) => set({ startTime: time }),
  setGrid: (grid) => set({ grid }),
  setGridSize: (size) => set({ gridSize: size }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setDuration: (duration) => set({ duration }),

  updatePlayerScore: (playerId, score, wordCount) =>
    set((state) => ({
      scores: { ...state.scores, [playerId]: score },
      wordCounts: { ...state.wordCounts, [playerId]: wordCount },
    })),

  addFoundWord: (playerId, word) =>
    set((state) => ({
      foundWords: {
        ...state.foundWords,
        [playerId]: [...(state.foundWords[playerId] || []), word],
      },
    })),

  setResults: (results) => set({ results }),

  applyStateFromFirebase: (state) =>
    set({
      grid: state.grid || [],
      gridSize: state.gridSize ?? 5,
      timeRemaining: state.timeRemaining ?? 120,
      duration: state.duration ?? 120,
      phase: state.phase || 'setup',
      startTime: state.startTime ?? null,
      scores: state.scores || {},
      wordCounts: state.wordCounts || {},
      foundWords: state.foundWords || {},
      results: state.results || null,
    }),

  resetGame: () => set(initialState),
}));
