import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from './Grid';
import { PlayerPanel } from './PlayerPanel';
import { Feedback } from './Feedback';
import { ResultsModal } from './ResultsModal';
import { Countdown } from '@/components/common/Countdown';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useRoom } from '@/hooks/useRoom';
import { useHostSubmissionListener } from '@/hooks/useGameListeners';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { BoggleGame } from '@/games/boggle/BoggleGame';
import { getWordPoints, generateGrid } from '@/games/boggle/utils';
import { DICTIONARY } from '@/lib/dictionary';

export function BoggleBoard() {
  const navigate = useNavigate();
  const gameRef = useRef<BoggleGame | null>(null);
  const timerRef = useRef<number | null>(null);

  const { playerId, isHost, players, gameSettings } = useRoomStore();
  const {
    phase,
    startTime,
    grid,
    gridSize,
    timeRemaining,
    scores,
    wordCounts,
    foundWords,
    results,
    setPhase,
    setTimeRemaining,
    setResults,
    updatePlayerScore,
    addFoundWord,
    resetGame,
  } = useGameStore();
  const { setFeedback, reset: resetLocalGame } = useLocalGameStore();
  const { updateGameState, updateGameStateFields, submitWord, deleteSubmission } =
    useRoom();
  const { play: playSound } = useSoundEffects();

  const [showCountdown, setShowCountdown] = useState(false);

  // Initialize game instance for host
  useEffect(() => {
    if (isHost && (phase === 'countdown' || phase === 'playing') && !gameRef.current) {
      gameRef.current = new BoggleGame();
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
    if (!gameRef.current) return;

    playSound('gameEnd');
    gameRef.current.phase = 'finished';
    const gameResults = gameRef.current.calculateResults();

    setPhase('finished');
    setResults(gameResults);

    const finalState = gameRef.current.getSerializableState();
    finalState.phase = 'finished';
    finalState.results = gameResults;
    await updateGameState(finalState);
  }, [setPhase, setResults, updateGameState, playSound]);

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setPhase('playing');
    playSound('gameStart');

    if (isHost && gameRef.current) {
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
  }, [isHost, setPhase, setTimeRemaining, updateGameStateFields, playSound, handleGameEnd]);

  // Resume timer for host rejoining mid-game
  useEffect(() => {
    if (isHost && phase === 'playing' && !timerRef.current && gameRef.current && timeRemaining > 0) {
      console.log('[BoggleBoard] Resuming timer for host rejoin, timeRemaining:', timeRemaining);

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
  }, [isHost, phase, timeRemaining, setTimeRemaining, updateGameStateFields, handleGameEnd]);

  // Handle word submission
  const handleWordSubmit = useCallback(
    async (word: string, path: number[]) => {
      if (!playerId) return;

      if (isHost && gameRef.current) {
        // Host processes locally
        const result = gameRef.current.processWord(playerId, word, path);

        if (result.success) {
          playSound('wordValid');
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
          setFeedback({ message: 'Already found!', type: 'error' });
          return;
        }
        if (word.length < 3) {
          playSound('wordInvalid');
          setFeedback({ message: 'Too short', type: 'error' });
          return;
        }
        if (!DICTIONARY.has(word)) {
          playSound('wordInvalid');
          setFeedback({ message: 'Not a word', type: 'error' });
          return;
        }

        // Optimistic UI update
        playSound('wordValid');
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

  // Handle rematch
  const handleRematch = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gameRef.current = null;
    resetGame();
    resetLocalGame();

    if (isHost) {
      // Use settings for new game
      const { duration, gridSize } = gameSettings;

      // Create new game state
      const newGame = new BoggleGame();
      const playerData: Record<string, { name: string }> = {};
      Object.entries(players).forEach(([id, p]) => {
        playerData[id] = { name: p.name };
      });
      newGame.initialize(playerData);

      // Set grid and settings
      newGame.grid = generateGrid(gridSize);
      newGame.gridSize = gridSize;
      newGame.duration = duration;
      newGame.timeRemaining = duration;
      newGame.phase = 'countdown';
      newGame.startTime = Date.now() + 3000;
      gameRef.current = newGame;

      const state = newGame.getSerializableState();

      // Apply state locally for host (don't rely on Firebase sync)
      useGameStore.getState().applyStateFromFirebase(state);

      await updateGameState(state);
    }
  }, [isHost, players, gameSettings, resetGame, resetLocalGame, updateGameState]);

  // Handle back to lobby
  const handleBackToLobby = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gameRef.current = null;
    resetGame();
    resetLocalGame();
    navigate('/');
  }, [resetGame, resetLocalGame, navigate]);

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

  // Get player data
  const localPlayer = players[playerId || ''];
  const opponentEntry = Object.entries(players).find(([id]) => id !== playerId);
  const opponentId = opponentEntry?.[0];
  const opponent = opponentEntry?.[1];

  const myWords = playerId ? foundWords[playerId] || [] : [];
  const opponentWords = opponentId ? foundWords[opponentId] || [] : [];

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
      <main className="flex-1 flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto w-full">
        {/* My Panel */}
        <div className="lg:w-64 order-2 lg:order-1">
          <PlayerPanel
            name={localPlayer?.name || 'You'}
            score={playerId ? scores[playerId] || 0 : 0}
            wordCount={playerId ? wordCounts[playerId] || 0 : 0}
            words={myWords}
            isLocal={true}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 order-1 lg:order-2 flex flex-col items-center">
          <div className="relative w-full max-w-sm">
            {showCountdown && startTime && (
              <Countdown
                startTime={startTime}
                onComplete={handleCountdownComplete}
              />
            )}
            <Grid onWordSubmit={handleWordSubmit} />
            <Feedback />
          </div>
        </div>

        {/* Opponent Panel */}
        <div className="lg:w-64 order-3">
          <PlayerPanel
            name={opponent?.name || 'Opponent'}
            score={opponentId ? scores[opponentId] || 0 : 0}
            wordCount={opponentId ? wordCounts[opponentId] || 0 : 0}
            words={opponentWords}
            isLocal={false}
          />
        </div>
      </main>

      {/* Results Modal */}
      {phase === 'finished' && results && playerId && (
        <ResultsModal
          results={results}
          localPlayerId={playerId}
          onRematch={handleRematch}
          onBackToLobby={handleBackToLobby}
        />
      )}
    </div>
  );
}
