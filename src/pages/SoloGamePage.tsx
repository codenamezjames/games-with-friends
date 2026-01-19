import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from '@/games/wordtrace/components/Grid';
import { Feedback } from '@/games/wordtrace/components/Feedback';
import { WordList } from '@/games/wordtrace/components/WordList';
import { Countdown } from '@/components/common/Countdown';
import { Button } from '@/components/common/Button';
import { useGameStore } from '@/stores/useGameStore';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { generateGrid, getWordPoints } from '@/games/wordtrace/utils';
import { getGamePaths } from '@/games/registry';
import { DICTIONARY } from '@/lib/dictionary';

// Use shorter duration on localhost for testing
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const DEFAULT_DURATION = isLocalhost ? 10 : 120;
const DEFAULT_GRID_SIZE = 5;

export function SoloGamePage() {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const { play: playSound } = useSoundEffects();
  const { vibrate } = useHaptics();

  const { playerName } = useRoomStore();
  const {
    phase,
    grid,
    timeRemaining,
    startTime,
    scores,
    wordCounts,
    foundWords,
    gameType,
    setGrid,
    setGridSize,
    setDuration,
    setPhase,
    setStartTime,
    setTimeRemaining,
    updatePlayerScore,
    addFoundWord,
    resetGame,
  } = useGameStore();
  const { setFeedback, reset: resetLocalGame } = useLocalGameStore();

  const initializedRef = useRef(false);

  const playerId = 'solo-player';

  // Derive showCountdown from phase
  const showCountdown = phase === 'countdown' && startTime !== null;

  // Initialize solo game on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    resetGame();
    resetLocalGame();

    const newGrid = generateGrid(DEFAULT_GRID_SIZE);
    setGrid(newGrid);
    setGridSize(DEFAULT_GRID_SIZE);
    setDuration(DEFAULT_DURATION);
    setTimeRemaining(DEFAULT_DURATION);

    // Initialize player score
    updatePlayerScore(playerId, 0, 0);

    // Start countdown
    const countdownStart = Date.now() + 3000;
    setStartTime(countdownStart);
    setPhase('countdown');
  }, [
    resetGame,
    resetLocalGame,
    setGrid,
    setGridSize,
    setDuration,
    setTimeRemaining,
    setStartTime,
    setPhase,
    updatePlayerScore,
  ]);

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setPhase('playing');
    playSound('gameStart');
    vibrate('gameStart');

    // Start timer
    timerRef.current = window.setInterval(() => {
      const newTime = useGameStore.getState().timeRemaining - 1;
      setTimeRemaining(newTime);

      if (newTime <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        playSound('gameEnd');
        vibrate('gameEnd');
        setPhase('finished');
      }
    }, 1000);
  }, [setPhase, setTimeRemaining, playSound, vibrate]);

  // Handle word submission
  const handleWordSubmit = useCallback(
    (word: string, _path: number[]) => {
      const myWords = foundWords[playerId] || [];

      // Check if already found
      if (myWords.includes(word)) {
        playSound('wordInvalid');
        vibrate('wordInvalid');
        setFeedback({ message: 'Already found!', type: 'error' });
        return;
      }

      // Check minimum length
      if (word.length < 3) {
        playSound('wordInvalid');
        vibrate('wordInvalid');
        setFeedback({ message: 'Too short', type: 'error' });
        return;
      }

      // Check dictionary
      if (!DICTIONARY.has(word)) {
        playSound('wordInvalid');
        vibrate('wordInvalid');
        setFeedback({ message: 'Not a word', type: 'error' });
        return;
      }

      // Valid word!
      playSound('wordValid');
      vibrate('wordValid');
      const points = getWordPoints(word);
      addFoundWord(playerId, word);
      updatePlayerScore(
        playerId,
        (scores[playerId] || 0) + points,
        (wordCounts[playerId] || 0) + 1
      );
      setFeedback({
        message: `+${points} point${points > 1 ? 's' : ''}!`,
        type: 'success',
      });
    },
    [foundWords, scores, wordCounts, addFoundWord, updatePlayerScore, setFeedback, playSound, vibrate]
  );

  // Handle play again - reinitialize the game
  const handlePlayAgain = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset and start new game
    resetGame();
    resetLocalGame();

    const newGrid = generateGrid(DEFAULT_GRID_SIZE);
    setGrid(newGrid);
    setGridSize(DEFAULT_GRID_SIZE);
    setDuration(DEFAULT_DURATION);
    setTimeRemaining(DEFAULT_DURATION);
    updatePlayerScore(playerId, 0, 0);

    const countdownStart = Date.now() + 3000;
    setStartTime(countdownStart);
    setPhase('countdown');
  }, [resetGame, resetLocalGame, setGrid, setGridSize, setDuration, setTimeRemaining, updatePlayerScore, setStartTime, setPhase]);

  // Handle back to menu
  const handleBackToMenu = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    resetGame();
    resetLocalGame();
    const paths = getGamePaths(gameType);
    navigate(paths.lobby);
  }, [resetGame, resetLocalGame, navigate, gameType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format timer
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const myWords = foundWords[playerId] || [];
  const myScore = scores[playerId] || 0;
  const myWordCount = wordCounts[playerId] || 0;

  // Share functionality
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const handleShare = useCallback(async () => {
    const shareText = [
      '🎯 Word Trace Solo Practice 🎯',
      '',
      `Score: ${myScore} pts (${myWordCount} words)`,
      '',
      myWords.length > 0 ? `Best words: ${myWords.slice(0, 5).join(', ')}` : '',
      '',
      'Play at: games-with-friends-1.web.app',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Word Trace Results', text: shareText });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 2000);
        return;
      } catch {
        // Fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Clipboard failed
    }
  }, [myScore, myWordCount, myWords]);

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header */}
      <header className="text-center mb-4">
        <h1 className="text-2xl font-bold text-primary mb-1">Solo Practice</h1>
        <div
          className={`text-4xl font-mono font-bold ${
            timeRemaining <= 10 ? 'text-error animate-pulse' : 'text-text-primary'
          }`}
        >
          {timerDisplay}
        </div>
      </header>

      {/* Score display */}
      <div className="max-w-md mx-auto w-full mb-4">
        <div className="bg-bg-card rounded-[var(--radius-default)] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">
              {playerName || 'Player'}
            </span>
            <span className="text-xs text-text-muted">
              {myWordCount} {myWordCount === 1 ? 'word' : 'words'}
            </span>
          </div>
          <span className="text-2xl font-bold text-primary">{myScore}</span>
        </div>
      </div>

      {/* Main game area */}
      <main className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Grid */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-sm">
            {showCountdown && startTime && (
              <Countdown
                startTime={startTime}
                onComplete={handleCountdownComplete}
              />
            )}
            {grid.length > 0 && <Grid onWordSubmit={handleWordSubmit} />}
            <Feedback />
          </div>
        </div>

        {/* Word List */}
        <WordList words={myWords} />
      </main>

      {/* Results Modal */}
      {phase === 'finished' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-[var(--radius-lg)] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-4xl font-bold text-center mb-2 text-primary">
              Game Over!
            </h2>
            <p className="text-center text-text-muted mb-6">
              Great practice session!
            </p>

            {/* Final Score */}
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-accent mb-2">{myScore}</div>
              <div className="text-text-secondary">
                {myWordCount} {myWordCount === 1 ? 'word' : 'words'} found
              </div>
            </div>

            {/* Words Found */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                Words Found
              </h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {myWords.length ? (
                  myWords.map((word, index) => (
                    <span
                      key={index}
                      className="bg-bg-cell px-3 py-1 rounded-full text-sm text-text-secondary"
                    >
                      {word} (+{getWordPoints(word)})
                    </span>
                  ))
                ) : (
                  <span className="text-text-muted italic">No words found</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button onClick={handlePlayAgain} className="flex-1">
                  Play Again
                </Button>
                <Button variant="secondary" onClick={handleBackToMenu} className="flex-1">
                  Back to Menu
                </Button>
              </div>
              <Button variant="secondary" onClick={handleShare} className="w-full">
                {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share Results'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
