import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from './Grid';
import { GamePlayerList } from './GamePlayerList';
import { WordList } from './WordList';
import { SpectatorBanner } from './SpectatorBanner';
import { SpectatorWordList } from './SpectatorWordList';
import { LiveWordFeed } from './LiveWordFeed';
import { Feedback } from './Feedback';
import { Countdown } from '@/components/common/Countdown';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useRoom } from '@/hooks/useRoom';
import { useHostSubmissionListener } from '@/hooks/useGameListeners';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHaptics } from '@/hooks/useHaptics';
import { getGamePaths } from '@/games/registry';
import { WordTraceGame } from '@/games/wordtrace/WordTraceGame';
import { getWordPoints } from '@/games/wordtrace/utils';
import { DICTIONARY } from '@/lib/dictionary';

export function WordTraceBoard() {
  const navigate = useNavigate();
  const gameRef = useRef<WordTraceGame | null>(null);
  const timerRef = useRef<number | null>(null);
  const hasEndedRef = useRef(false);
  const countdownJustCompletedRef = useRef(false);

  const { playerId, isHost, isSpectator, players } = useRoomStore();
  const {
    phase,
    startTime,
    grid,
    gridSize,
    timeRemaining,
    scores,
    wordCounts,
    foundWords,
    gameType,
    setPhase,
    setTimeRemaining,
    setResults,
    updatePlayerScore,
    addFoundWord,
  } = useGameStore();
  const { setFeedback } = useLocalGameStore();
  const { updateGameState, updateGameStateFields, submitWord, deleteSubmission } =
    useRoom();
  const { play: playSound } = useSoundEffects();
  const { vibrate } = useHaptics();

  const [showCountdown, setShowCountdown] = useState(false);

  // Initialize game instance for host
  useEffect(() => {
    if (isHost && (phase === 'countdown' || phase === 'playing') && !gameRef.current) {
      gameRef.current = new WordTraceGame();
      const playerData: Record<string, { name: string }> = {};
      Object.entries(players).forEach(([id, p]) => {
        playerData[id] = { name: p.name };
      });
      gameRef.current.initialize(playerData);

      // Use applyState to restore all game state
      gameRef.current.applyState({
        grid,
        gridSize,
        timeRemaining,
        duration: useGameStore.getState().duration,
        phase,
        startTime,
        scores,
        wordCounts,
        foundWords,
      });
    }
  }, [isHost, phase, players, grid, gridSize, startTime, timeRemaining, foundWords, scores, wordCounts]);

  // Keep game instance grid in sync with store grid
  useEffect(() => {
    if (gameRef.current && grid.length > 0) {
      gameRef.current.grid = grid;
      gameRef.current.gridSize = gridSize;
    }
  }, [grid, gridSize]);

  // Show countdown when phase changes to countdown
  useEffect(() => {
    if (phase === 'countdown' && startTime) {
      setShowCountdown(true);
    }
  }, [phase, startTime]);

  // Handle game end - defined first since other callbacks use it
  const handleGameEnd = useCallback(async () => {
    if (!gameRef.current || hasEndedRef.current) return;
    hasEndedRef.current = true;

    playSound('gameEnd');
    vibrate('gameEnd');
    gameRef.current.phase = 'finished';
    const gameResults = gameRef.current.calculateResults();

    setPhase('finished');
    setResults(gameResults);

    const finalState = gameRef.current.getSerializableState();
    finalState.phase = 'finished';
    finalState.results = gameResults;
    await updateGameState(finalState);

    // Navigate to results page
    const paths = getGamePaths(gameType);
    navigate(paths.results);
  }, [setPhase, setResults, updateGameState, playSound, vibrate, navigate, gameType]);

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setPhase('playing');
    playSound('gameStart');
    vibrate('gameStart');

    // Mark that countdown just completed - prevents useEffect from also starting timer
    countdownJustCompletedRef.current = true;

    // Guard: don't start another timer if one is already running
    if (isHost && gameRef.current && !timerRef.current) {
      gameRef.current.phase = 'playing';
      updateGameStateFields({ phase: 'playing' });

      // Start timer
      timerRef.current = window.setInterval(async () => {
        const newTime = useGameStore.getState().timeRemaining - 1;
        setTimeRemaining(newTime);

        if (gameRef.current) {
          gameRef.current.timeRemaining = newTime;
        }

        await updateGameStateFields({ timeRemaining: newTime });

        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleGameEnd();
        }
      }, 1000);
    }
  }, [isHost, setPhase, setTimeRemaining, updateGameStateFields, playSound, vibrate, handleGameEnd]);

  // Resume timer for host rejoining mid-game or taking over from disconnected host
  // This runs when isHost becomes true during an active game
  useEffect(() => {
    // Skip if countdown just completed - handleCountdownComplete already started the timer
    if (countdownJustCompletedRef.current) {
      countdownJustCompletedRef.current = false;
      return;
    }

    // Clear any existing timer first to prevent duplicates
    if (timerRef.current) {
      console.log('[WordTraceBoard] Clearing existing timer before resume check');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only resume if:
    // 1. We're the host
    // 2. Phase is 'playing' (not countdown)
    // 3. There's time left
    // 4. We're not showing countdown (meaning we didn't just come from countdown)
    const currentTimeRemaining = useGameStore.getState().timeRemaining;
    if (isHost && phase === 'playing' && currentTimeRemaining > 0 && !showCountdown) {
      console.log('[WordTraceBoard] Starting timer for host, timeRemaining:', currentTimeRemaining);

      timerRef.current = window.setInterval(async () => {
        const newTime = useGameStore.getState().timeRemaining - 1;

        // Safety check: don't go below 0
        if (newTime < 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        setTimeRemaining(newTime);

        // Update game instance if available
        if (gameRef.current) {
          gameRef.current.timeRemaining = newTime;
        }

        await updateGameStateFields({ timeRemaining: newTime });

        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleGameEnd();
        }
      }, 1000);
    }

    // Cleanup: clear timer when effect re-runs or component unmounts
    return () => {
      if (timerRef.current) {
        console.log('[WordTraceBoard] Cleanup: clearing timer');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, showCountdown]);

  // Guest fallback: navigate to results if game should have ended but host hasn't triggered it
  // This handles the case where host disconnects during gameplay
  const guestFallbackRef = useRef<number | null>(null);
  useEffect(() => {
    // Only for non-hosts during 'playing' phase
    if (isHost || phase !== 'playing') {
      if (guestFallbackRef.current) {
        clearTimeout(guestFallbackRef.current);
        guestFallbackRef.current = null;
      }
      return;
    }

    // When timer reaches 0, start grace period
    if (timeRemaining <= 0 && !hasEndedRef.current) {
      console.log('[WordTraceBoard] Guest detected timer at 0, starting fallback timer');

      // Wait 5 seconds for host to end the game
      guestFallbackRef.current = window.setTimeout(() => {
        const currentPhase = useGameStore.getState().phase;
        if (currentPhase === 'playing' && !hasEndedRef.current) {
          console.log('[WordTraceBoard] Guest fallback: host did not end game, navigating to results');
          hasEndedRef.current = true;
          playSound('gameEnd');
          const paths = getGamePaths(gameType);
          navigate(paths.results);
        }
      }, 5000);
    }

    return () => {
      if (guestFallbackRef.current) {
        clearTimeout(guestFallbackRef.current);
        guestFallbackRef.current = null;
      }
    };
  }, [isHost, phase, timeRemaining, navigate, gameType, playSound]);

  // Handle word submission
  const handleWordSubmit = useCallback(
    async (word: string, path: number[]) => {
      if (!playerId) return;

      if (isHost && gameRef.current) {
        // Host processes locally
        const result = gameRef.current.processWord(playerId, word, path);

        if (result.success) {
          playSound('wordValid');
          vibrate('wordValid');
          addFoundWord(playerId, word);
          updatePlayerScore(playerId, result.newScore!, result.wordCount!);
          setFeedback({
            message: `+${result.points} point${result.points! > 1 ? 's' : ''}!`,
            type: 'success',
          });

          // Sync to Firebase
          await updateGameState(gameRef.current.getSerializableState());
        } else {
          playSound('wordInvalid');
          vibrate('wordInvalid');
          const messages: Record<string, string> = {
            ALREADY_FOUND: 'Already found!',
            NOT_IN_DICTIONARY: 'Not a word',
            TOO_SHORT: 'Too short',
            INVALID_PATH: 'Invalid path',
            PATH_MISMATCH: 'Path mismatch',
            PLAYER_NOT_FOUND: 'Player error',
          };
          setFeedback({
            message: messages[result.error!] || 'Error',
            type: 'error',
          });
        }
      } else {
        // Guest submits to Firebase
        // First do local validation for immediate feedback
        const myWords = foundWords[playerId] || [];
        if (myWords.includes(word)) {
          playSound('wordInvalid');
          vibrate('wordInvalid');
          setFeedback({ message: 'Already found!', type: 'error' });
          return;
        }
        if (word.length < 3) {
          playSound('wordInvalid');
          vibrate('wordInvalid');
          setFeedback({ message: 'Too short', type: 'error' });
          return;
        }
        if (!DICTIONARY.has(word)) {
          playSound('wordInvalid');
          vibrate('wordInvalid');
          setFeedback({ message: 'Not a word', type: 'error' });
          return;
        }

        // Optimistic UI update
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

        // Submit to host via Firebase
        await submitWord(word, path);
      }
    },
    [
      playerId,
      isHost,
      foundWords,
      scores,
      wordCounts,
      addFoundWord,
      updatePlayerScore,
      setFeedback,
      updateGameState,
      submitWord,
      playSound,
      vibrate,
    ]
  );

  // Host submission listener
  const handleSubmissionReceived = useCallback(
    async (submission: { key: string; playerId: string; word: string; path: number[] }) => {
      if (!gameRef.current) return;

      const result = gameRef.current.processWord(
        submission.playerId,
        submission.word,
        submission.path
      );

      if (result.success) {
        addFoundWord(submission.playerId, submission.word);
        updatePlayerScore(
          submission.playerId,
          result.newScore!,
          result.wordCount!
        );
      }

      // Sync state
      await updateGameState(gameRef.current.getSerializableState());

      // Delete processed submission
      await deleteSubmission(submission.key);
    },
    [addFoundWord, updatePlayerScore, updateGameState, deleteSubmission]
  );

  useHostSubmissionListener(handleSubmissionReceived);

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

  // Get player data for the list
  const playerList = Object.entries(players).map(([id, player]) => ({
    id,
    name: player.name || `Player ${id.slice(0, 6)}`,
    score: scores[id] || 0,
    wordCount: wordCounts[id] || 0,
    isLocal: id === playerId,
    isSpectator: player.isSpectator || false,
    isConnected: player.isConnected !== false,
  }));

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header */}
      <header className="text-center mb-4">
        <h1 className="text-2xl font-bold text-primary mb-1">Word Trace</h1>
        <div
          className={`text-4xl font-mono font-bold ${
            timeRemaining <= 10 ? 'text-error animate-pulse' : 'text-text-primary'
          }`}
        >
          {timerDisplay}
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Spectator Banner and Live Feed */}
        {isSpectator && (
          <>
            <SpectatorBanner timeRemaining={timeRemaining} />
            <LiveWordFeed foundWords={foundWords} players={players} />
          </>
        )}

        {/* Grid */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-sm">
            {showCountdown && startTime && (
              <Countdown
                startTime={startTime}
                onComplete={handleCountdownComplete}
              />
            )}
            <Grid onWordSubmit={handleWordSubmit} disabled={isSpectator} isSpectator={isSpectator} />
            {!isSpectator && <Feedback />}
          </div>
        </div>

        {/* Player List */}
        <GamePlayerList players={playerList} />

        {/* Word List - Show all players' words for spectators, own words for players */}
        {isSpectator ? (
          <SpectatorWordList foundWords={foundWords} players={players} />
        ) : (
          playerId && <WordList words={foundWords[playerId] || []} />
        )}
      </main>

    </div>
  );
}
