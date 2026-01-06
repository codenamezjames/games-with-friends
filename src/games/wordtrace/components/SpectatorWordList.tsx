import { getWordPoints } from '@/games/wordtrace/utils';
import type { Player } from '@/types';

interface SpectatorWordListProps {
  foundWords: Record<string, string[]>;
  players: Record<string, Player>;
}

export function SpectatorWordList({ foundWords, players }: SpectatorWordListProps) {
  // Filter out spectators from display (they have no words)
  const activePlayers = Object.entries(players).filter(
    ([, player]) => !player.isSpectator
  );

  if (activePlayers.length === 0) {
    return (
      <div className="bg-bg-card rounded-[var(--radius-default)] p-3">
        <p className="text-text-muted text-sm text-center">
          Waiting for players...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-[var(--radius-default)] p-3 space-y-4">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Words Found
      </h3>
      {activePlayers.map(([playerId, player]) => {
        const words = foundWords[playerId] || [];
        // Sort by points descending
        const sortedWords = [...words].sort(
          (a, b) => getWordPoints(b) - getWordPoints(a)
        );
        // Show last 8 words (most recent)
        const recentWords = sortedWords.slice(0, 8);

        return (
          <div
            key={playerId}
            className="border-t border-white/10 pt-3 first:border-0 first:pt-0"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-text-primary">
                {player.name || `Player ${playerId.slice(0, 6)}`}
              </span>
              <span className="text-xs text-text-muted">
                {words.length} {words.length === 1 ? 'word' : 'words'}
              </span>
            </div>
            {recentWords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {recentWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-main rounded text-sm"
                  >
                    <span className="text-text-primary">{word}</span>
                    <span className="text-accent text-xs">+{getWordPoints(word)}</span>
                  </span>
                ))}
                {words.length > 8 && (
                  <span className="text-xs text-text-muted self-center">
                    +{words.length - 8} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No words yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
