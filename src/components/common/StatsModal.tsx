import { useState } from 'react';
import { useStatsStore, type GameRecord } from '@/stores/useStatsStore';

interface StatsModalProps {
  onClose: () => void;
}

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
  const {
    gamesPlayed,
    totalScore,
    totalWordsFound,
    bestScore,
    longestWord,
    multiplayerWins,
    multiplayerLosses,
    recentGames,
    resetStats,
  } = useStatsStore();

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
  const avgWords = gamesPlayed > 0 ? Math.round(totalWordsFound / gamesPlayed) : 0;
  const multiplayerGames = multiplayerWins + multiplayerLosses;
  const winRate = multiplayerGames > 0 ? Math.round((multiplayerWins / multiplayerGames) * 100) : 0;

  const handleReset = () => {
    resetStats();
    setShowConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
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

        {gamesPlayed === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted text-lg">No games played yet</p>
            <p className="text-text-muted text-sm mt-2">Play a game to start tracking your stats!</p>
          </div>
        ) : (
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
        )}

        {/* Reset Stats */}
        <div className="mt-6 pt-4 border-t border-bg-cell">
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
