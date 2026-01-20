import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const ACHIEVEMENTS: Achievement[] = [
  // Easy
  { id: 'first_game', name: 'First Steps', emoji: '🎯', description: 'Complete 1 game', difficulty: 'easy' },
  { id: 'word_finder', name: 'Word Finder', emoji: '🔍', description: 'Find 10 words in one game', difficulty: 'easy' },
  { id: 'century', name: 'Century Club', emoji: '💯', description: 'Score 100+ pts in one game', difficulty: 'easy' },
  { id: 'five_games', name: 'Getting Hooked', emoji: '🎮', description: 'Play 5 games', difficulty: 'easy' },
  // Medium
  { id: 'long_word', name: 'Linguist', emoji: '📚', description: 'Find a 7+ letter word', difficulty: 'medium' },
  { id: 'high_scorer', name: 'High Scorer', emoji: '⭐', description: 'Score 200+ pts in one game', difficulty: 'medium' },
  { id: 'dedicated', name: 'Dedicated', emoji: '🏅', description: 'Play 25 games', difficulty: 'medium' },
  { id: 'first_win', name: 'Victor', emoji: '🏆', description: 'Win a multiplayer game', difficulty: 'medium' },
  { id: 'vocabulary', name: 'Vocabulary Master', emoji: '📖', description: 'Find 500 total words', difficulty: 'medium' },
  // Hard
  { id: 'word_master', name: 'Word Master', emoji: '🧠', description: 'Find an 8+ letter word', difficulty: 'hard' },
  { id: 'elite', name: 'Elite Player', emoji: '👑', description: 'Score 300+ pts in one game', difficulty: 'hard' },
  { id: 'champion', name: 'Champion', emoji: '🥇', description: 'Win 10 multiplayer games', difficulty: 'hard' },
];

interface AchievementsState {
  // Unlocked achievements: id -> timestamp
  unlockedAchievements: Record<string, number>;
  // Queue of achievements to show notifications for
  pendingNotifications: string[];

  // Actions
  unlockAchievement: (id: string) => boolean; // Returns true if newly unlocked
  consumeNotification: () => string | null;
  isUnlocked: (id: string) => boolean;
  getUnlockedCount: () => number;
  resetAchievements: () => void;
}

const initialState = {
  unlockedAchievements: {} as Record<string, number>,
  pendingNotifications: [] as string[],
};

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      unlockAchievement: (id: string) => {
        const state = get();
        // Already unlocked
        if (state.unlockedAchievements[id]) {
          return false;
        }

        set((state) => ({
          unlockedAchievements: {
            ...state.unlockedAchievements,
            [id]: Date.now(),
          },
          pendingNotifications: [...state.pendingNotifications, id],
        }));

        return true;
      },

      consumeNotification: () => {
        const state = get();
        if (state.pendingNotifications.length === 0) {
          return null;
        }

        const [first, ...rest] = state.pendingNotifications;
        set({ pendingNotifications: rest });
        return first;
      },

      isUnlocked: (id: string) => {
        return !!get().unlockedAchievements[id];
      },

      getUnlockedCount: () => {
        return Object.keys(get().unlockedAchievements).length;
      },

      resetAchievements: () => set(initialState),
    }),
    {
      name: 'word-trace-achievements',
    }
  )
);
