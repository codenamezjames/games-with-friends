import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/common/Button';
import { ReadyCheckPanel } from '@/components/common/ReadyCheckPanel';
import { Confetti } from '@/games/wordtrace/components/Confetti';
import { ResultsGrid } from '@/games/wordtrace/components/ResultsGrid';
import { prepareWordRevealSequence, getWordPoints, findWordPath, generateGrid } from '@/games/wordtrace/utils';
import { useGameStore } from '@/stores/useGameStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { useRoom } from '@/hooks/useRoom';
import { useGameListeners } from '@/hooks/useGameListeners';
import { useRoomListeners } from '@/hooks/useRoomListeners';
import { getGamePaths } from '@/games/registry';

interface FloatingPoint {
  id: number;
  playerId: string;
  points: number;
}

type AnimationPhase = 'revealing' | 'winner';
type Speed = 'normal' | 'fast';

export function ResultsPage() {
  const navigate = useNavigate();
  const { results, foundWords, grid, gridSize, resetGame, setGrid, setGridSize, setDuration, setPhase: setGamePhase, setStartTime, setTimeRemaining, phase: gamePhase } = useGameStore();
  const { players, playerId: localPlayerId, isHost, isSpectator, roomCode, gameSettings } = useRoomStore();
  const { setReadyForRematch, clearRematchReady, startGame, updateGameState } = useRoom();

  // Enable game state listeners for guests to receive rematch navigation
  useGameListeners();
  // Enable room listeners to keep players synced for ready check
  useRoomListeners();

  const [animPhase, setAnimPhase] = useState<AnimationPhase>('revealing');
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState<Speed>('normal');
  const [pulsingPlayers, setPulsingPlayers] = useState<Set<string>>(new Set());
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const timerRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const speedRef = useRef<Speed>(speed);
  const isLeavingRef = useRef(false);

  // Keep speedRef in sync with speed state
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Redirect if no results (unless intentionally leaving via Play Again or a rematch is starting)
  useEffect(() => {
    // Don't redirect if:
    // - We have results
    // - We're intentionally leaving (Play Again clicked)
    // - A rematch is starting (phase is countdown/playing) - useGameListeners will handle navigation
    const isRematchStarting = gamePhase === 'countdown' || gamePhase === 'playing';
    if (!results && !isLeavingRef.current && !isRematchStarting) {
      navigate('/');
    }
  }, [results, navigate, gamePhase]);

  // Prepare word sequence
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
    setAnimatedScores((prev) => {
      const updated = { ...prev };
      word.foundByPlayerIds.forEach((pid) => {
        updated[pid] = (updated[pid] || 0) + word.points;
      });
      return updated;
    });

    setPulsingPlayers(new Set(word.foundByPlayerIds));
    setTimeout(() => setPulsingPlayers(new Set()), 400);

    word.foundByPlayerIds.forEach((pid) => {
      const newId = idCounterRef.current++;
      setFloatingPoints((prev) => [...prev, { id: newId, playerId: pid, points: word.points }]);
      setTimeout(() => {
        setFloatingPoints((prev) => prev.filter((fp) => fp.id !== newId));
      }, 800);
    });
  }, []);

  // Animation timer - uses recursive setTimeout to respect speed changes
  useEffect(() => {
    if (wordSequence.length === 0) {
      setAnimPhase('winner');
      setShowConfetti(true);
      return;
    }

    if (animPhase !== 'revealing') return;

    const scheduleNext = (index: number) => {
      const delay = speedRef.current === 'fast' ? 500 : 1000;
      timerRef.current = window.setTimeout(() => {
        const next = index + 1;
        if (next >= wordSequence.length) {
          timerRef.current = window.setTimeout(() => {
            setAnimPhase('winner');
            setShowConfetti(true);
          }, 1000);
          return;
        }
        setCurrentWordIndex(next);
        awardPoints(wordSequence[next]);
        scheduleNext(next);
      }, delay);
    };

    // Initial delay before starting
    const startTimer = setTimeout(() => {
      setCurrentWordIndex(0);
      awardPoints(wordSequence[0]);
      scheduleNext(0);
    }, 500);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [animPhase, wordSequence, awardPoints]);

  // Handlers
  const handleSpeedToggle = useCallback(() => {
    setSpeed((prev) => (prev === 'normal' ? 'fast' : 'normal'));
  }, []);

  // Handle ready check toggle
  const handleReadyChange = useCallback(async (isReady: boolean) => {
    await setReadyForRematch(isReady);
  }, [setReadyForRematch]);

  // Handle starting the rematch game (host only)
  const handleStartRematch = useCallback(async (markUnreadyAsSpectators: boolean) => {
    const currentRoomCode = useRoomStore.getState().roomCode;
    const currentIsHost = useRoomStore.getState().isHost;
    const currentPlayers = useRoomStore.getState().players;

    if (!currentIsHost || !currentRoomCode) return;

    console.log('[ResultsPage] handleStartRematch called', { markUnreadyAsSpectators });
    isLeavingRef.current = true;

    try {
      // Build update object for player status
      const playerUpdates: Record<string, boolean> = {};
      const currentPlayerId = useRoomStore.getState().playerId;

      Object.entries(currentPlayers).forEach(([playerId, player]) => {
        if (player.isSpectator) return; // Skip existing spectators

        // Never mark the host (who is starting the game) as spectator
        const isCurrentPlayer = playerId === currentPlayerId;

        if (markUnreadyAsSpectators && !player.readyForRematch && !isCurrentPlayer) {
          // Mark unready players as spectators (except the host who clicked Start Anyway)
          playerUpdates[`players/${playerId}/isSpectator`] = true;
        } else {
          // Set isReady to true for all players who will play (for startGame check)
          playerUpdates[`players/${playerId}/isReady`] = true;
        }
      });

      if (Object.keys(playerUpdates).length > 0) {
        await update(ref(db, `rooms/${currentRoomCode}`), playerUpdates);
      }

      // Clear rematch ready flags
      await clearRematchReady();

      // Generate new grid with current settings
      const { duration, gridSize: settingsGridSize } = gameSettings;
      const newGrid = generateGrid(settingsGridSize);
      const newStartTime = Date.now() + 3000; // 3 second countdown

      // Set local state
      setGrid(newGrid);
      setGridSize(settingsGridSize);
      setDuration(duration);
      setTimeRemaining(duration);
      setGamePhase('countdown');
      setStartTime(newStartTime);

      // Get updated players list (after spectator update)
      const playersSnapshot = useRoomStore.getState().players;

      // Initialize scores for all active players
      const scores: Record<string, number> = {};
      const wordCounts: Record<string, number> = {};
      const foundWords: Record<string, string[]> = {};

      Object.entries(playersSnapshot).forEach(([playerId, player]) => {
        // Skip spectators (existing and newly marked)
        const wasMarkedSpectator = markUnreadyAsSpectators && !player.isSpectator && !player.readyForRematch;
        if (!player.isSpectator && !wasMarkedSpectator) {
          scores[playerId] = 0;
          wordCounts[playerId] = 0;
          foundWords[playerId] = [];
        }
      });

      const initialState = {
        grid: newGrid,
        gridSize: settingsGridSize,
        timeRemaining: duration,
        duration,
        phase: 'countdown',
        startTime: newStartTime,
        scores,
        wordCounts,
        foundWords,
        results: null,
      };

      await startGame(initialState);
      await updateGameState(initialState);

      // Navigate to game page
      const currentGameType = useGameStore.getState().gameType;
      const paths = getGamePaths(currentGameType, currentRoomCode);
      navigate(paths.play);
    } catch (err) {
      console.error('[ResultsPage] Failed to start rematch:', err);
      isLeavingRef.current = false;
    }
  }, [clearRematchReady, gameSettings, setGrid, setGridSize, setDuration, setTimeRemaining, setGamePhase, setStartTime, startGame, updateGameState, navigate]);

  const handleBackToLobby = useCallback(() => {
    resetGame();
    navigate('/');
  }, [resetGame, navigate]);

  // Current word
  const currentWord = currentWordIndex >= 0 && currentWordIndex < wordSequence.length
    ? wordSequence[currentWordIndex]
    : null;

  // Find path for current word in grid
  const currentWordPath = useMemo(() => {
    if (!currentWord || grid.length === 0) return [];
    return findWordPath(grid, currentWord.word, gridSize) || [];
  }, [currentWord, grid, gridSize]);

  // Counts
  const sharedCount = wordSequence.filter((w) => w.isShared).length;
  const uniqueCount = wordSequence.filter((w) => !w.isShared).length;

  // Sorted players
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
  const winnerName = results?.winner ? getPlayerName(results.winner) : null;

  if (!results) return null;

  // REVEALING PHASE - Full Page
  if (animPhase === 'revealing') {
    return (
      <div className="min-h-screen animated-gradient flex flex-col">
        {/* Header */}
        <header className="p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Word Reveal</h1>
          <button
            onClick={handleSpeedToggle}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              speed === 'fast'
                ? 'bg-accent text-bg-main scale-110'
                : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
            }`}
          >
            {speed === 'fast' ? '2x' : '1x'}
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          {/* Current word display */}
          {currentWord ? (
            <div
              key={currentWordIndex}
              className={`text-center ${currentWordIndex % 2 === 0 ? 'slide-in-left' : 'slide-in-right'}`}
            >
              <div className="text-text-muted text-sm mb-1">
                {currentWord.isShared ? 'Shared Word' : 'Unique Word'}
              </div>
              <div className="text-5xl md:text-6xl font-black text-text-primary tracking-wider mb-2 glow-text">
                {currentWord.word}
              </div>
              <div className="inline-block bg-primary/30 text-primary px-4 py-1 rounded-full text-xl font-bold">
                +{currentWord.points} {currentWord.points === 1 ? 'point' : 'points'}
              </div>
            </div>
          ) : (
            <div className="text-4xl text-text-muted animate-pulse">Starting...</div>
          )}

          {/* Grid with highlighted path */}
          {grid.length > 0 && (
            <div className="w-full max-w-xs">
              <ResultsGrid
                grid={grid}
                gridSize={gridSize}
                highlightedPath={currentWordPath}
              />
            </div>
          )}
        </main>

        {/* Bottom score bar */}
        <footer className="bg-bg-card/80 backdrop-blur p-4">
          {/* Progress */}
          <div className="max-w-md mx-auto mb-3">
            <div className="h-2 bg-bg-cell rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentWordIndex + 1) / wordSequence.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{currentWordIndex + 1} of {wordSequence.length}</span>
              <span>Shared: {sharedCount} • Unique: {uniqueCount}</span>
            </div>
          </div>

          {/* Player scores */}
          <div className="flex justify-center gap-4 flex-wrap">
            {sortedPlayers.map((player, index) => {
              const playerFloatingPoints = floatingPoints.filter((fp) => fp.playerId === player.id);
              const isPulsing = pulsingPlayers.has(player.id);

              return (
                <div
                  key={player.id}
                  className={`text-center px-4 py-2 rounded-lg transition-all ${
                    player.foundCurrentWord ? 'player-found-word' : ''
                  } ${player.isLocal ? 'bg-primary/20 ring-1 ring-primary' : 'bg-bg-cell/50'}`}
                >
                  <div className="text-xs text-text-muted mb-1">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''} {player.name}
                  </div>
                  <div className="relative inline-block">
                    <span className={`text-2xl font-bold text-primary ${isPulsing ? 'score-pop' : ''}`}>
                      {player.score}
                    </span>
                    {playerFloatingPoints.map((fp) => (
                      <span
                        key={fp.id}
                        className="absolute -top-4 left-1/2 -translate-x-1/2 text-success text-sm font-bold float-points"
                      >
                        +{fp.points}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </footer>
      </div>
    );
  }

  // WINNER PHASE - Full Page
  return (
    <div className="min-h-screen animated-gradient flex flex-col items-center justify-center p-4">
      {showConfetti && <Confetti />}

      {/* Trophy */}
      <div className="text-8xl mb-4 trophy-bounce">
        {results.isTie ? '🤝' : '🏆'}
      </div>

      {/* Winner announcement */}
      <div className="winner-announce text-center mb-8">
        <h1 className={`text-5xl md:text-7xl font-black mb-4 ${results.isTie ? '' : 'glow-text'}`}>
          {results.isTie ? "It's a Tie!" : `${winnerName} Wins!`}
        </h1>
      </div>

      {/* Final scores */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`text-center p-4 rounded-xl ${
              index === 0 && !results.isTie
                ? 'bg-accent/20 ring-2 ring-accent scale-110'
                : 'bg-bg-cell/50'
            }`}
          >
            <div className="text-3xl mb-1">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
            </div>
            <div className="text-lg font-medium text-text-secondary mb-1">
              {player.name}
              {player.isLocal && <span className="text-xs text-text-muted ml-1">(You)</span>}
            </div>
            <div className="text-3xl font-black text-primary">{player.score}</div>
          </div>
        ))}
      </div>

      {/* Longest word */}
      {longestWord && (
        <div className="bg-bg-card/50 backdrop-blur rounded-xl p-6 mb-8 text-center max-w-sm w-full">
          <div className="text-sm text-text-muted mb-2">Longest Word</div>
          <div className="text-4xl font-black text-accent mb-1">{longestWord}</div>
          <div className="text-text-secondary">+{getWordPoints(longestWord)} points</div>
        </div>
      )}

      {/* Stats */}
      <div className="text-text-muted mb-8">
        {wordSequence.length} words found
        {sharedCount > 0 && <span> • {sharedCount} shared</span>}
      </div>

      {/* Ready Check Panel (multiplayer) or Home button (test mode) */}
      {roomCode ? (
        <ReadyCheckPanel
          players={players}
          localPlayerId={localPlayerId || ''}
          isHost={isHost}
          isSpectator={isSpectator}
          onReadyChange={handleReadyChange}
          onStartGame={handleStartRematch}
        />
      ) : (
        <div className="flex gap-4 w-full max-w-sm">
          <Button onClick={handleBackToLobby} className="flex-1 text-lg py-3">
            Home
          </Button>
        </div>
      )}

      {/* Home button (always show for multiplayer) */}
      {roomCode && (
        <Button variant="link" onClick={handleBackToLobby} className="mt-4">
          Leave Room
        </Button>
      )}
    </div>
  );
}
