import { useState } from 'react';
import { useStatsStore, type GameRecord } from '@/stores/useStatsStore';
import { useAchievementsStore, ACHIEVEMENTS } from '@/stores/useAchievementsStore';

interface StatsModalProps {
  onClose: () => void;
}

type GameTab = 'wordtrace' | 'achievements';

const GAME_TABS: { id: GameTab; name: string; icon: string }[] = [
  { id: 'wordtrace', name: 'Word Trace', icon: 'W' },
  { id: 'achievements', name: 'Achievements', icon: '🏆' },
];

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StatsModal({ onClose }: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('wordtrace');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const { resetStats } = useStatsStore();

  const handleReset = () => {
    resetStats();
    setShowConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-xl max-w-md w-full shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-2xl font-bold text-text-primary">Your Stats</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close stats"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex gap-2 border-b border-bg-cell">
            {GAME_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                <span className="w-6 h-6 rounded bg-bg-cell flex items-center justify-center text-xs font-bold">
                  {tab.icon}
                </span>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {activeTab === 'wordtrace' && <WordTraceStats />}
          {activeTab === 'achievements' && <AchievementsTab />}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          {/* Reset Stats */}
          <div className="pt-4 border-t border-bg-cell">
            {showConfirmReset ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Reset all stats?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-sm bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-2 text-sm text-text-muted hover:text-error transition-colors"
              >
                Reset Stats
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function WordTraceStats() {
  const {
    gamesPlayed,
    totalScore,
    totalWordsFound,
    bestScore,
    longestWord,
    multiplayerWins,
    multiplayerLosses,
    recentGames,
  } = useStatsStore();

  const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
  const avgWords = gamesPlayed > 0 ? Math.round(totalWordsFound / gamesPlayed) : 0;
  const multiplayerGames = multiplayerWins + multiplayerLosses;
  const winRate = multiplayerGames > 0 ? Math.round((multiplayerWins / multiplayerGames) * 100) : 0;

  if (gamesPlayed === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-lg">No games played yet</p>
        <p className="text-text-muted text-sm mt-2">Play Word Trace to start tracking your stats!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lifetime Stats */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide">Lifetime Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Games Played" value={gamesPlayed} />
          <StatCard label="Total Score" value={totalScore.toLocaleString()} />
          <StatCard label="Avg Score" value={avgScore} />
          <StatCard label="Best Score" value={bestScore} highlight />
          <StatCard label="Words Found" value={totalWordsFound.toLocaleString()} />
          <StatCard label="Avg Words/Game" value={avgWords} />
        </div>
        {longestWord && (
          <div className="mt-3 bg-bg-cell rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide">Longest Word</p>
            <p className="text-xl font-bold text-accent">{longestWord}</p>
          </div>
        )}
      </div>

      {/* Multiplayer Stats */}
      {multiplayerGames > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide">Multiplayer</h3>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Wins" value={multiplayerWins} highlight />
            <StatCard label="Losses" value={multiplayerLosses} />
            <StatCard label="Win Rate" value={`${winRate}%`} />
          </div>
        </div>
      )}

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide">
            Recent Games ({recentGames.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentGames.map((game) => (
              <GameRecordItem key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-bg-cell rounded-lg p-3 text-center">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function GameRecordItem({ game }: { game: GameRecord }) {
  return (
    <div className="bg-bg-cell rounded-lg p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {game.score} pts
          </span>
          {game.isMultiplayer && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${game.won ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
              {game.won ? 'W' : 'L'}
            </span>
          )}
          {!game.isMultiplayer && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              Solo
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">
          {game.wordCount} words · {game.gridSize}x{game.gridSize} · {formatDuration(game.duration)}
        </p>
      </div>
      <div className="text-xs text-text-muted text-right shrink-0 ml-2">
        {formatDate(game.date)}
      </div>
    </div>
  );
}

function AchievementsTab() {
  const { unlockedAchievements, getUnlockedCount } = useAchievementsStore();
  const unlockedCount = getUnlockedCount();
  const totalCount = ACHIEVEMENTS.length;

  // Group achievements by difficulty
  const easyAchievements = ACHIEVEMENTS.filter((a) => a.difficulty === 'easy');
  const mediumAchievements = ACHIEVEMENTS.filter((a) => a.difficulty === 'medium');
  const hardAchievements = ACHIEVEMENTS.filter((a) => a.difficulty === 'hard');

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="text-center">
        <div className="text-4xl font-bold text-primary mb-1">
          {unlockedCount} / {totalCount}
        </div>
        <p className="text-text-muted text-sm">Achievements Unlocked</p>
        <div className="mt-3 h-2 bg-bg-cell rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievement Groups */}
      <AchievementGroup title="Easy" achievements={easyAchievements} unlockedAchievements={unlockedAchievements} />
      <AchievementGroup title="Medium" achievements={mediumAchievements} unlockedAchievements={unlockedAchievements} />
      <AchievementGroup title="Hard" achievements={hardAchievements} unlockedAchievements={unlockedAchievements} />
    </div>
  );
}

function AchievementGroup({
  title,
  achievements,
  unlockedAchievements,
}: {
  title: string;
  achievements: typeof ACHIEVEMENTS;
  unlockedAchievements: Record<string, number>;
}) {
  const unlockedInGroup = achievements.filter((a) => unlockedAchievements[a.id]).length;

  return (
    <div>
      <h3 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wide flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs">
          {unlockedInGroup}/{achievements.length}
        </span>
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {achievements.map((achievement) => {
          const isUnlocked = !!unlockedAchievements[achievement.id];
          return (
            <div
              key={achievement.id}
              className={`rounded-lg p-3 transition-all ${
                isUnlocked
                  ? 'bg-bg-cell'
                  : 'bg-bg-cell/30 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xl ${isUnlocked ? '' : 'grayscale'}`}>
                  {achievement.emoji}
                </span>
                <span className={`text-sm font-medium ${isUnlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                  {achievement.name}
                </span>
              </div>
              <p className="text-xs text-text-muted">{achievement.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
