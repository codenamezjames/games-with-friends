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
import { useStatsStore } from '@/stores/useStatsStore';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { generateGrid, getWordPoints } from '@/games/wordtrace/utils';
import { getGamePaths } from '@/games/registry';
import { DICTIONARY } from '@/lib/dictionary';

const GRID_OPTIONS = [
  { value: 4, label: '4×4', description: 'Quick & Easy' },
  { value: 5, label: '5×5', description: 'Standard' },
  { value: 6, label: '6×6', description: 'Challenge' },
];

const TIME_OPTIONS = [
  { value: 60, label: '1:00', description: 'Sprint' },
  { value: 120, label: '2:00', description: 'Standard' },
  { value: 180, label: '3:00', description: 'Extended' },
];

const DEFAULT_DURATION = 120;
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
  const { recordGame } = useStatsStore();

  const initializedRef = useRef(false);
  const statsRecordedRef = useRef(false);
  const prevTimeRef = useRef(timeRemaining);

  const playerId = 'solo-player';

  // Setup state
  const [selectedGridSize, setSelectedGridSize] = useState(DEFAULT_GRID_SIZE);
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
  const [isSetup, setIsSetup] = useState(true);

  // Derive showCountdown from phase
  const showCountdown = phase === 'countdown' && startTime !== null;

  // Initialize to setup phase on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    resetGame();
    resetLocalGame();
    setIsSetup(true);
  }, [resetGame, resetLocalGame]);

  // Start game after setup
  const handleStartGame = useCallback(() => {
    setIsSetup(false);

    const newGrid = generateGrid(selectedGridSize);
    setGrid(newGrid);
    setGridSize(selectedGridSize);
    setDuration(selectedDuration);
    setTimeRemaining(selectedDuration);

    // Initialize player score
    updatePlayerScore(playerId, 0, 0);

    // Start countdown
    const countdownStart = Date.now() + 3000;
    setStartTime(countdownStart);
    setPhase('countdown');
  }, [
    selectedGridSize,
    selectedDuration,
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
    // Read actions from store inside callback to avoid stale closures
    const { setPhase } = useGameStore.getState();
    setPhase('playing');
    playSound('gameStart');
    vibrate('gameStart');

    // Start timer
    timerRef.current = window.setInterval(() => {
      // Read from store inside interval to avoid stale closures
      const { timeRemaining, setTimeRemaining, setPhase } = useGameStore.getState();

      // Guard: don't decrement if already at or below 0
      if (timeRemaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const newTime = timeRemaining - 1;
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
  }, [playSound, vibrate]);

  // Handle word submission
  const handleWordSubmit = useCallback(
    (word: string, _path: number[]) => {
      const myWords = foundWords[playerId] || [];

      // Check if already found
      if (myWords.includes(word)) {
        vibrate('wordInvalid');
        setFeedback({ message: 'Already found!', type: 'error' });
        return;
      }

      // Check minimum length
      if (word.length < 3) {
        vibrate('wordInvalid');
        setFeedback({ message: 'Too short', type: 'error' });
        return;
      }

      // Check dictionary
      if (!DICTIONARY.has(word)) {
        vibrate('wordInvalid');
        setFeedback({ message: 'Not a word', type: 'error' });
        return;
      }

      // Valid word!
      playSound('wordValid');
      vibrate('wordValid');
      addFoundWord(playerId, word);
      updatePlayerScore(
        playerId,
        scores[playerId] || 0,
        (wordCounts[playerId] || 0) + 1
      );
      setFeedback({
        message: 'Nice!',
        type: 'success',
      });
    },
    [foundWords, scores, wordCounts, addFoundWord, updatePlayerScore, setFeedback, playSound, vibrate]
  );

  // Handle play again - go back to setup or start immediately with same settings
  const handlePlayAgain = useCallback((withSetup = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset game state and stats tracking
    resetGame();
    resetLocalGame();
    statsRecordedRef.current = false;

    if (withSetup) {
      setIsSetup(true);
    } else {
      // Start immediately with same settings
      const newGrid = generateGrid(selectedGridSize);
      setGrid(newGrid);
      setGridSize(selectedGridSize);
      setDuration(selectedDuration);
      setTimeRemaining(selectedDuration);
      updatePlayerScore(playerId, 0, 0);

      const countdownStart = Date.now() + 3000;
      setStartTime(countdownStart);
      setPhase('countdown');
    }
  }, [resetGame, resetLocalGame, selectedGridSize, selectedDuration, setGrid, setGridSize, setDuration, setTimeRemaining, updatePlayerScore, setStartTime, setPhase]);

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

  // Trigger vignette flash when timer crosses from 11 to 10 seconds
  useEffect(() => {
    if (prevTimeRef.current > 10 && timeRemaining === 10) {
      setShowVignette(true);
      setTimeout(() => setShowVignette(false), 1000);
    }
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining]);

  // Calculate score from words
  const calculateScore = (words: string[]) => {
    return words.reduce((total, word) => total + getWordPoints(word), 0);
  };

  // Record stats when game finishes
  useEffect(() => {
    if (phase === 'finished' && !statsRecordedRef.current) {
      statsRecordedRef.current = true;
      const words = foundWords[playerId] || [];
      const longestWord = words.reduce(
        (longest, word) => (word.length > longest.length ? word : longest),
        ''
      );
      recordGame({
        score: calculateScore(words),
        wordCount: wordCounts[playerId] || 0,
        longestWord,
        gridSize: selectedGridSize,
        duration: selectedDuration,
        isMultiplayer: false,
        won: null,
      });
    }
  }, [phase, foundWords, wordCounts, selectedGridSize, selectedDuration, recordGame]);

  // Format timer (clamp to 0 to prevent negative display)
  const displayTime = Math.max(0, timeRemaining);
  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const myWords = foundWords[playerId] || [];
  const myWordCount = wordCounts[playerId] || 0;
  const myFinalScore = calculateScore(myWords);

  // Share functionality
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showVignette, setShowVignette] = useState(false);

  const handleShare = useCallback(async () => {
    const shareText = [
      '🎯 Word Trace Solo Practice 🎯',
      '',
      `Score: ${myFinalScore} pts (${myWordCount} words)`,
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
  }, [myFinalScore, myWordCount, myWords]);

  // Setup screen
  if (isSetup) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="bg-bg-card rounded-[var(--radius-default)] p-8 w-full max-w-md shadow-xl">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-br from-primary-light to-accent bg-clip-text text-transparent mb-2">
            Solo Practice
          </h1>
          <p className="text-center text-text-muted mb-8">Choose your settings</p>

          {/* Grid Size */}
          <div className="mb-6">
            <label className="block text-text-muted text-sm mb-3">Grid Size</label>
            <div className="grid grid-cols-3 gap-2">
              {GRID_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedGridSize(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedGridSize === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent bg-bg-cell text-text-secondary hover:bg-bg-cell/80'
                  }`}
                >
                  <div className="text-xl font-bold">{option.label}</div>
                  <div className="text-xs opacity-70">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="mb-8">
            <label className="block text-text-muted text-sm mb-3">Time Limit</label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedDuration === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent bg-bg-cell text-text-secondary hover:bg-bg-cell/80'
                  }`}
                >
                  <div className="text-xl font-bold">{option.label}</div>
                  <div className="text-xs opacity-70">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button onClick={handleStartGame} className="w-full text-lg py-3">
            Start Game
          </Button>

          {/* Back link */}
          <Button
            variant="link"
            className="w-full mt-4"
            onClick={handleBackToMenu}
          >
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header */}
      <header className="relative text-center mb-4">
        {/* Leave Button */}
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="absolute left-0 top-0 p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Leave game"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-primary mb-1">Solo Practice</h1>
        <div
          className={`text-4xl font-mono font-bold ${
            timeRemaining <= 10 ? 'text-error animate-pulse' : 'text-text-primary'
          }`}
        >
          {timerDisplay}
        </div>
      </header>

      {/* Word count display */}
      <div className="max-w-md mx-auto w-full mb-4">
        <div className="bg-bg-card rounded-[var(--radius-default)] p-3 flex items-center justify-between">
          <span className="font-medium text-text-primary">
            {playerName || 'Player'}
          </span>
          <span className="text-lg font-bold text-primary">
            {myWordCount} {myWordCount === 1 ? 'word' : 'words'}
          </span>
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
              <div className="text-6xl font-bold text-accent mb-2">{myFinalScore}</div>
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
                      {word}
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
                <Button onClick={() => handlePlayAgain(false)} className="flex-1">
                  Play Again
                </Button>
                <Button variant="secondary" onClick={() => handlePlayAgain(true)} className="flex-1">
                  Change Settings
                </Button>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleShare} className="flex-1">
                  {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share'}
                </Button>
                <Button variant="link" onClick={handleBackToMenu} className="flex-1">
                  Exit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-[var(--radius-default)] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-2">Leave Game?</h3>
            <p className="text-text-muted mb-6">
              Your progress won't be saved and this game won't count towards your stats.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1"
              >
                Keep Playing
              </Button>
              <Button
                variant="primary"
                onClick={handleBackToMenu}
                className="flex-1 !bg-error hover:!bg-error/90"
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10-second warning vignette */}
      {showVignette && <div className="warning-vignette" />}
    </div>
  );
}
