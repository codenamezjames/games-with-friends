import { useState, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import type { GameResults } from '@/types';

interface ResultsModalProps {
  results: GameResults;
  localPlayerId: string;
  isSpectator?: boolean;
  onRematch: () => void;
  onBackToLobby: () => void;
}

export function ResultsModal({
  results,
  localPlayerId,
  isSpectator = false,
  onRematch,
  onBackToLobby,
}: ResultsModalProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const rankings = results.rankings || [];
  const isWinner = results.winner === localPlayerId;
  const myResult = rankings.find((r) => r.playerId === localPlayerId);
  const opponentResult = rankings.find((r) => r.playerId !== localPlayerId);

  const title = isSpectator
    ? 'Game Over!'
    : results.isTie
      ? "It's a Tie!"
      : isWinner
        ? 'You Win!'
        : 'You Lose!';

  const generateShareText = useCallback(() => {
    const resultEmoji = results.isTie ? '🤝' : isWinner ? '🏆' : '😅';
    const lines = [
      `${resultEmoji} Word Trace Results ${resultEmoji}`,
      '',
    ];

    // Add all player scores
    rankings.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      lines.push(`${medal} ${player.name}: ${player.score} pts (${player.wordCount} words)`);
    });

    if (myResult?.words?.length) {
      lines.push('');
      lines.push(`My best words: ${myResult.words.slice(0, 5).join(', ')}`);
    }

    lines.push('');
    lines.push('Play at: games-with-friends-1.web.app');

    return lines.join('\n');
  }, [results, rankings, myResult, isWinner]);

  const handleShare = useCallback(async () => {
    const shareText = generateShareText();

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Word Trace Results',
          text: shareText,
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 2000);
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Clipboard failed - could show error but likely won't happen
    }
  }, [generateShareText]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-[var(--radius-lg)] p-8 max-w-md w-full shadow-2xl">
        {/* Title */}
        <h2
          className={`text-4xl font-bold text-center mb-6 ${
            isSpectator
              ? 'text-accent'
              : results.isTie
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

        {/* My Words or Spectator Message */}
        {isSpectator ? (
          <div className="mb-6 text-center">
            <div className="bg-accent/20 rounded-lg p-4">
              <p className="text-accent font-medium mb-1">
                Great game to watch!
              </p>
              <p className="text-text-muted text-sm">
                You'll be playing in the next round
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Your Words
            </h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {myResult?.words?.length ? (
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
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isSpectator ? (
            <p className="text-center text-text-muted text-sm mb-2">
              Waiting for host to start next game...
            </p>
          ) : (
            <div className="flex gap-3">
              <Button onClick={onRematch} className="flex-1">
                Rematch
              </Button>
              <Button variant="secondary" onClick={onBackToLobby} className="flex-1">
                Back to Lobby
              </Button>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleShare}
            className="w-full"
          >
            {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share Results'}
          </Button>
        </div>
      </div>
    </div>
  );
}
