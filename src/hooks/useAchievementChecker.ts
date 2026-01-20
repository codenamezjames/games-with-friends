import { useCallback } from 'react';
import { useAchievementsStore } from '@/stores/useAchievementsStore';
import { useStatsStore } from '@/stores/useStatsStore';

interface GameData {
  score: number;
  wordCount: number;
  longestWord: string;
  isMultiplayer: boolean;
  won: boolean | null;
}

export function useAchievementChecker() {
  const { unlockAchievement } = useAchievementsStore();
  const stats = useStatsStore();

  const checkAchievements = useCallback(
    (gameData: GameData): string[] => {
      const newlyUnlocked: string[] = [];

      // Calculate stats AFTER this game is recorded
      // (since we call this before recordGame, we need to add 1 to gamesPlayed)
      const gamesPlayedAfter = stats.gamesPlayed + 1;
      const totalWordsAfter = stats.totalWordsFound + gameData.wordCount;
      const multiplayerWinsAfter = stats.multiplayerWins + (gameData.isMultiplayer && gameData.won ? 1 : 0);

      // --- Easy Achievements ---

      // First Steps: Complete 1 game
      if (unlockAchievement('first_game')) {
        newlyUnlocked.push('first_game');
      }

      // Word Finder: Find 10 words in one game
      if (gameData.wordCount >= 10 && unlockAchievement('word_finder')) {
        newlyUnlocked.push('word_finder');
      }

      // Century Club: Score 100+ pts in one game
      if (gameData.score >= 100 && unlockAchievement('century')) {
        newlyUnlocked.push('century');
      }

      // Getting Hooked: Play 5 games
      if (gamesPlayedAfter >= 5 && unlockAchievement('five_games')) {
        newlyUnlocked.push('five_games');
      }

      // --- Medium Achievements ---

      // Linguist: Find a 7+ letter word
      if (gameData.longestWord.length >= 7 && unlockAchievement('long_word')) {
        newlyUnlocked.push('long_word');
      }

      // High Scorer: Score 200+ pts in one game
      if (gameData.score >= 200 && unlockAchievement('high_scorer')) {
        newlyUnlocked.push('high_scorer');
      }

      // Dedicated: Play 25 games
      if (gamesPlayedAfter >= 25 && unlockAchievement('dedicated')) {
        newlyUnlocked.push('dedicated');
      }

      // Victor: Win a multiplayer game
      if (gameData.isMultiplayer && gameData.won && unlockAchievement('first_win')) {
        newlyUnlocked.push('first_win');
      }

      // Vocabulary Master: Find 500 total words
      if (totalWordsAfter >= 500 && unlockAchievement('vocabulary')) {
        newlyUnlocked.push('vocabulary');
      }

      // --- Hard Achievements ---

      // Word Master: Find an 8+ letter word
      if (gameData.longestWord.length >= 8 && unlockAchievement('word_master')) {
        newlyUnlocked.push('word_master');
      }

      // Elite Player: Score 300+ pts in one game
      if (gameData.score >= 300 && unlockAchievement('elite')) {
        newlyUnlocked.push('elite');
      }

      // Champion: Win 10 multiplayer games
      if (multiplayerWinsAfter >= 10 && unlockAchievement('champion')) {
        newlyUnlocked.push('champion');
      }

      return newlyUnlocked;
    },
    [unlockAchievement, stats.gamesPlayed, stats.totalWordsFound, stats.multiplayerWins]
  );

  return { checkAchievements };
}
