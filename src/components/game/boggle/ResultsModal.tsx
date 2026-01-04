import { Button } from '@/components/common/Button';
import type { GameResults } from '@/types';

interface ResultsModalProps {
  results: GameResults;
  localPlayerId: string;
  onRematch: () => void;
  onBackToLobby: () => void;
}

export function ResultsModal({
  results,
  localPlayerId,
  onRematch,
  onBackToLobby,
}: ResultsModalProps) {
  const rankings = results.rankings || [];
  const isWinner = results.winner === localPlayerId;
  const myResult = rankings.find((r) => r.playerId === localPlayerId);
  const opponentResult = rankings.find((r) => r.playerId !== localPlayerId);

  const title = results.isTie
    ? "It's a Tie!"
    : isWinner
      ? 'You Win!'
      : 'You Lose!';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-[var(--radius-lg)] p-8 max-w-md w-full shadow-2xl">
        {/* Title */}
        <h2
          className={`text-4xl font-bold text-center mb-6 ${
            results.isTie
              ? 'text-accent'
              : isWinner
                ? 'text-success'
                : 'text-error'
          }`}
        >
          {title}
        </h2>

        {/* Scores */}
        <div className="flex justify-center items-center gap-6 mb-8">
          {/* My Score */}
          <div
            className={`text-center p-4 rounded-lg ${isWinner && !results.isTie ? 'bg-success/20' : ''}`}
          >
            <div className="text-text-secondary mb-1">
              {myResult?.name || 'You'}
            </div>
            <div className="text-4xl font-bold text-text-primary">
              {myResult?.score || 0}
            </div>
            <div className="text-text-muted text-sm">
              {myResult?.wordCount || 0} words
            </div>
          </div>

          {/* VS */}
          <div className="text-2xl font-bold text-text-muted">VS</div>

          {/* Opponent Score */}
          <div
            className={`text-center p-4 rounded-lg ${!isWinner && !results.isTie ? 'bg-error/20' : ''}`}
          >
            <div className="text-text-secondary mb-1">
              {opponentResult?.name || 'Opponent'}
            </div>
            <div className="text-4xl font-bold text-text-primary">
              {opponentResult?.score || 0}
            </div>
            <div className="text-text-muted text-sm">
              {opponentResult?.wordCount || 0} words
            </div>
          </div>
        </div>

        {/* My Words */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Your Words
          </h3>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {myResult?.words.length ? (
              myResult.words.map((word, index) => (
                <span
                  key={index}
                  className="bg-bg-cell px-3 py-1 rounded-full text-sm text-text-secondary"
                >
                  {word}
                </span>
              ))
            ) : (
              <span className="text-text-muted italic">No words found</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onRematch} className="flex-1">
            Rematch
          </Button>
          <Button variant="secondary" onClick={onBackToLobby} className="flex-1">
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
