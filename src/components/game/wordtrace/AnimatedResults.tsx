import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/common/Button';
import { WordRevealCard } from './WordRevealCard';
import { prepareWordRevealSequence, getWordPoints } from '@/games/wordtrace/utils';
import type { GameResults, Player } from '@/types';

interface AnimatedResultsProps {
  results: GameResults;
  foundWords: Record<string, string[]>;
  players: Record<string, Player>;
  localPlayerId: string;
  isSpectator?: boolean;
  onAnimationComplete: () => void;
  onRematch: () => void;
  onBackToLobby: () => void;
}

interface FloatingPoint {
  id: number;
  playerId: string;
  points: number;
}

type AnimationPhase = 'revealing' | 'winner' | 'done';
type Speed = 'normal' | 'fast';

export function AnimatedResults({
  results,
  foundWords,
  players,
  localPlayerId,
  isSpectator = false,
  onAnimationComplete,
  onRematch,
  onBackToLobby,
}: AnimatedResultsProps) {
  const [phase, setPhase] = useState<AnimationPhase>('revealing');
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState<Speed>('normal');
  const [pulsingPlayers, setPulsingPlayers] = useState<Set<string>>(new Set());
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);

  const timerRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);

  // Prepare word sequence once
  const wordSequence = useMemo(() => {
    return prepareWordRevealSequence(foundWords);
  }, [foundWords]);

  // Calculate longest word
  const longestWord = useMemo(() => {
    const allWords = Object.values(foundWords).flat();
    if (allWords.length === 0) return null;
    return allWords.reduce((longest, word) =>
      word.length > longest.length ? word : longest
    );
  }, [foundWords]);

  // Initialize scores to 0
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    Object.keys(players).forEach((id) => {
      if (!players[id].isSpectator) {
        initialScores[id] = 0;
      }
    });
    setAnimatedScores(initialScores);
  }, [players]);

  // Get player name by ID
  const getPlayerName = useCallback((playerId: string) => {
    return players[playerId]?.name || `Player ${playerId.slice(0, 6)}`;
  }, [players]);

  // Award points to players
  const awardPoints = useCallback((word: { points: number; foundByPlayerIds: string[] }) => {
    // Update scores
    setAnimatedScores((prev) => {
      const updated = { ...prev };
      word.foundByPlayerIds.forEach((playerId) => {
        updated[playerId] = (updated[playerId] || 0) + word.points;
      });
      return updated;
    });

    // Trigger pulse animation
    setPulsingPlayers(new Set(word.foundByPlayerIds));
    setTimeout(() => {
      setPulsingPlayers(new Set());
    }, 400);

    // Add floating points
    word.foundByPlayerIds.forEach((playerId) => {
      const newId = idCounterRef.current++;
      setFloatingPoints((prev) => [
        ...prev,
        { id: newId, playerId, points: word.points },
      ]);

      setTimeout(() => {
        setFloatingPoints((prev) => prev.filter((fp) => fp.id !== newId));
      }, 800);
    });
  }, []);

  // Animation timer
  useEffect(() => {
    // Skip animation if no words
    if (wordSequence.length === 0) {
      setPhase('winner');
      return;
    }

    if (phase !== 'revealing') return;

    const delay = speed === 'fast' ? 500 : 1000;

    // Start with first word after a short delay
    const startTimer = setTimeout(() => {
      setCurrentWordIndex(0);
      awardPoints(wordSequence[0]);
    }, 500);

    timerRef.current = window.setInterval(() => {
      setCurrentWordIndex((prev) => {
        const next = prev + 1;
        if (next >= wordSequence.length) {
          // All words revealed
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimeout(() => setPhase('winner'), 1000);
          return prev;
        }
        // Award points for next word
        awardPoints(wordSequence[next]);
        return next;
      });
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, speed, wordSequence, awardPoints]);

  // Speed toggle restarts animation from current position
  const handleSpeedToggle = useCallback(() => {
    setSpeed((prev) => (prev === 'normal' ? 'fast' : 'normal'));
  }, []);

  // Current word being displayed
  const currentWord = currentWordIndex >= 0 && currentWordIndex < wordSequence.length
    ? wordSequence[currentWordIndex]
    : null;

  // Count shared vs unique
  const sharedCount = wordSequence.filter((w) => w.isShared).length;
  const uniqueCount = wordSequence.filter((w) => !w.isShared).length;

  // Progress within current category
  const currentIsShared = currentWord?.isShared ?? true;
  const progressInCategory = currentWord
    ? wordSequence
        .filter((w) => w.isShared === currentIsShared)
        .findIndex((w) => w.word === currentWord.word) + 1
    : 0;
  const categoryTotal = currentIsShared ? sharedCount : uniqueCount;

  // Sort players by animated score for display
  const sortedPlayers = useMemo(() => {
    return Object.entries(players)
      .filter(([, p]) => !p.isSpectator)
      .map(([id, p]) => ({
        id,
        name: p.name,
        score: animatedScores[id] || 0,
        isLocal: id === localPlayerId,
        foundCurrentWord: currentWord?.foundByPlayerIds.includes(id) ?? false,
      }))
      .sort((a, b) => b.score - a.score);
  }, [players, animatedScores, localPlayerId, currentWord]);

  // Winner info
  const winnerName = results.winner
    ? getPlayerName(results.winner)
    : null;

  // Render revealing phase
  if (phase === 'revealing') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-bg-card rounded-[var(--radius-lg)] p-6 max-w-md w-full shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">Word Reveal</h2>
            <button
              onClick={handleSpeedToggle}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                speed === 'fast'
                  ? 'bg-accent text-bg-main'
                  : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
              }`}
            >
              {speed === 'fast' ? 'Fast' : 'Normal'}
            </button>
          </div>

          {/* Category indicator */}
          <div className="text-center text-sm text-text-muted mb-2">
            {currentWord?.isShared ? 'Shared Words' : 'Unique Words'}
            {' '}&bull;{' '}
            {progressInCategory} of {categoryTotal}
          </div>

          {/* Current word */}
          {currentWord ? (
            <WordRevealCard
              word={currentWord.word}
              points={currentWord.points}
              isShared={currentWord.isShared}
              playerNames={currentWord.foundByPlayerIds.map(getPlayerName)}
              animationKey={currentWordIndex}
            />
          ) : (
            <div className="py-8 text-center text-text-muted">
              Starting...
            </div>
          )}

          {/* Player scores */}
          <div className="mt-4 space-y-2">
            {sortedPlayers.map((player, index) => {
              const playerFloatingPoints = floatingPoints.filter(
                (fp) => fp.playerId === player.id
              );
              const isPulsing = pulsingPlayers.has(player.id);

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    player.foundCurrentWord ? 'player-found-word' : ''
                  } ${
                    player.isLocal
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'bg-bg-cell'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-sm font-mono w-4">
                      {index + 1}.
                    </span>
                    <span className="font-medium text-text-primary">
                      {player.name}
                      {player.isLocal && (
                        <span className="text-xs text-text-muted ml-1">(You)</span>
                      )}
                    </span>
                  </div>
                  <div className="relative">
                    <span
                      className={`text-lg font-bold text-primary min-w-[2rem] text-right inline-block ${
                        isPulsing ? 'score-pulse' : ''
                      }`}
                    >
                      {player.score}
                    </span>
                    {playerFloatingPoints.map((fp) => (
                      <span
                        key={fp.id}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 text-success text-sm font-bold float-points"
                      >
                        +{fp.points}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-bg-cell rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentWordIndex + 1) / wordSequence.length) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Shared: {sharedCount}</span>
              <span>Unique: {uniqueCount}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render winner phase
  if (phase === 'winner') {
    const finalScores = sortedPlayers.map((p) => `${p.name}: ${p.score}`).join(' • ');

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-bg-card rounded-[var(--radius-lg)] p-8 max-w-md w-full shadow-2xl">
          {/* Winner announcement */}
          <div className="winner-announce text-center mb-6">
            <h2
              className={`text-4xl font-bold mb-2 ${
                results.isTie ? 'text-accent' : 'text-success'
              }`}
            >
              {results.isTie ? "It's a Tie!" : `${winnerName} Wins!`}
            </h2>
            <p className="text-text-secondary">{finalScores}</p>
          </div>

          {/* Longest word */}
          {longestWord && (
            <div className="bg-bg-cell rounded-lg p-4 mb-6 text-center">
              <div className="text-sm text-text-muted mb-1">Longest Word</div>
              <div className="text-2xl font-bold text-accent">{longestWord}</div>
              <div className="text-sm text-text-secondary">
                +{getWordPoints(longestWord)} points
              </div>
            </div>
          )}

          {/* Total words found */}
          <div className="text-center text-text-muted mb-6">
            {wordSequence.length} words found
            {sharedCount > 0 && ` (${sharedCount} shared)`}
          </div>

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
            <Button variant="secondary" onClick={onAnimationComplete} className="w-full">
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Done phase - shouldn't render, but just in case
  return null;
}
