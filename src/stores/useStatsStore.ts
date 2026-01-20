import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameRecord {
  id: string;
  date: string;
  score: number;
  wordCount: number;
  longestWord: string;
  gridSize: number;
  duration: number;
  isMultiplayer: boolean;
  won: boolean | null; // null for solo games
}

interface StatsState {
  // Lifetime stats
  gamesPlayed: number;
  totalScore: number;
  totalWordsFound: number;
  bestScore: number;
  longestWord: string;
  multiplayerWins: number;
  multiplayerLosses: number;

  // Recent games (last 20)
  recentGames: GameRecord[];

  // Actions
  recordGame: (game: Omit<GameRecord, 'id' | 'date'>) => void;
  resetStats: () => void;
}

const initialState = {
  gamesPlayed: 0,
  totalScore: 0,
  totalWordsFound: 0,
  bestScore: 0,
  longestWord: '',
  multiplayerWins: 0,
  multiplayerLosses: 0,
  recentGames: [] as GameRecord[],
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      ...initialState,

      recordGame: (game) =>
        set((state) => {
          const newRecord: GameRecord = {
            ...game,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
          };

          // Update lifetime stats
          const newGamesPlayed = state.gamesPlayed + 1;
          const newTotalScore = state.totalScore + game.score;
          const newTotalWordsFound = state.totalWordsFound + game.wordCount;
          const newBestScore = Math.max(state.bestScore, game.score);
          const newLongestWord =
            game.longestWord.length > state.longestWord.length
              ? game.longestWord
              : state.longestWord;

          // Update multiplayer stats
          let newWins = state.multiplayerWins;
          let newLosses = state.multiplayerLosses;
          if (game.isMultiplayer && game.won !== null) {
            if (game.won) {
              newWins++;
            } else {
              newLosses++;
            }
          }

          // Add to recent games (keep last 20)
          const newRecentGames = [newRecord, ...state.recentGames].slice(0, 20);

          return {
            gamesPlayed: newGamesPlayed,
            totalScore: newTotalScore,
            totalWordsFound: newTotalWordsFound,
            bestScore: newBestScore,
            longestWord: newLongestWord,
            multiplayerWins: newWins,
            multiplayerLosses: newLosses,
            recentGames: newRecentGames,
          };
        }),

      resetStats: () => set(initialState),
    }),
    {
      name: 'word-trace-stats',
    }
  )
);
