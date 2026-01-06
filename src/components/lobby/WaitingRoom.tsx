import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/common/Button';
import { PlayerList } from './PlayerList';
import { GameSettings } from './GameSettings';
import { useRoom } from '@/hooks/useRoom';
import { useRoomListeners } from '@/hooks/useRoomListeners';
import { usePresence } from '@/hooks/usePresence';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { generateGrid } from '@/games/wordtrace/utils';
import { getGamePaths } from '@/games/registry';

const JOIN_TIMEOUT_MS = 10000; // 10 seconds to join/rejoin

export function WaitingRoom() {
  const navigate = useNavigate();
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const { leaveRoom, setReady, startGame, updateGameState, rejoinRoom } = useRoom();
  const { roomCode, isHost, players, gameSettings, resetRoom } = useRoomStore();
  const { setGrid, setGridSize, setDuration, setPhase, setStartTime, setTimeRemaining, resetGame, gameType } =
    useGameStore();

  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up room listeners and presence heartbeat
  useRoomListeners();
  usePresence();

  // Handle joining/rejoining room on mount
  useEffect(() => {
    let joinTimeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const attemptJoin = async () => {
      // Small delay for Zustand hydration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const {
        roomCode: currentRoomCode,
        playerId: currentPlayerId,
        playerName: currentPlayerName,
      } = useRoomStore.getState();

      const targetRoomCode = currentRoomCode || urlRoomCode;

      console.log('[WaitingRoom] Attempting join/rejoin', {
        currentRoomCode,
        urlRoomCode,
        currentPlayerId,
        currentPlayerName,
      });

      // No room code at all
      if (!targetRoomCode) {
        console.log('[WaitingRoom] No room code');
        if (!cancelled) {
          setError('No room code provided');
          setIsJoining(false);
        }
        return;
      }

      // No player ID (not authenticated)
      if (!currentPlayerId) {
        console.log('[WaitingRoom] No player ID, waiting for auth...');
        // Wait a bit longer for auth
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { playerId: retryPlayerId } = useRoomStore.getState();
        if (!retryPlayerId) {
          if (!cancelled) {
            setError('Authentication failed. Please refresh.');
            setIsJoining(false);
          }
          return;
        }
      }

      // Set timeout to prevent hanging
      joinTimeout = setTimeout(() => {
        if (!cancelled) {
          setError('Connection timeout. Please try again.');
          setIsJoining(false);
        }
      }, JOIN_TIMEOUT_MS);

      try {
        // Check if room exists
        const roomRef = ref(db, `rooms/${targetRoomCode}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          console.log('[WaitingRoom] Room does not exist');
          clearTimeout(joinTimeout);
          if (!cancelled) {
            setError('Room not found. It may have been closed.');
            setIsJoining(false);
          }
          return;
        }

        const roomData = roomSnapshot.val();
        const status = roomData?.metadata?.status;

        // Check if we're in this room in Firebase (check early for rematch flow)
        const roomPlayers = roomData?.players || {};
        const { playerId: currentPlayerId } = useRoomStore.getState();
        const isInRoom = currentPlayerId && roomPlayers[currentPlayerId];

        // If we're already in the room (just joined via MainMenu, refreshing, or rematch), we're good
        // This handles the rematch flow where status might still be 'finished' briefly
        if (currentRoomCode === targetRoomCode && isInRoom) {
          console.log('[WaitingRoom] Already in room, showing waiting room', { status });
          clearTimeout(joinTimeout);
          if (!cancelled) {
            setIsJoining(false);
          }
          return;
        }

        // If game is in progress, redirect to game page
        if (status === 'countdown' || status === 'playing') {
          console.log('[WaitingRoom] Game in progress, redirecting to game');
          clearTimeout(joinTimeout);
          if (!cancelled) {
            const currentGameType = useGameStore.getState().gameType;
            const paths = getGamePaths(currentGameType, targetRoomCode);
            navigate(paths.play);
          }
          return;
        }

        // If game is finished and we're NOT in the room, show error (new players can't join finished games)
        if (status === 'finished') {
          console.log('[WaitingRoom] Game finished and not in room');
          clearTimeout(joinTimeout);
          if (!cancelled) {
            setError('This game has already ended.');
            setIsJoining(false);
          }
          return;
        }

        // If we have the room code but aren't in Firebase, try to rejoin (handles refresh)
        if (currentRoomCode === targetRoomCode && !isInRoom) {
          console.log('[WaitingRoom] Have room code but not in Firebase, attempting rejoin');
          const success = await rejoinRoom();
          clearTimeout(joinTimeout);
          if (!cancelled) {
            if (!success) {
              // Rejoin failed - need to join fresh
              console.log('[WaitingRoom] Rejoin failed, redirecting to join page');
              const currentGameType = useGameStore.getState().gameType;
              const paths = getGamePaths(currentGameType);
              navigate(`${paths.lobby}?room=${targetRoomCode}`);
            }
            setIsJoining(false);
          }
          return;
        }

        // We have a URL room code but no current room - need to join
        // Redirect to main menu where they can enter their name
        console.log('[WaitingRoom] Need to join room, redirecting to main menu');
        clearTimeout(joinTimeout);
        if (!cancelled) {
          const currentGameType = useGameStore.getState().gameType;
          const paths = getGamePaths(currentGameType);
          navigate(`${paths.lobby}?room=${targetRoomCode}`);
        }
      } catch (err) {
        clearTimeout(joinTimeout);
        console.error('[WaitingRoom] Join error:', err);
        if (!cancelled) {
          setError('Failed to connect. Please try again.');
          setIsJoining(false);
        }
      }
    };

    attemptJoin();

    return () => {
      cancelled = true;
      if (joinTimeout) clearTimeout(joinTimeout);
    };
  }, [urlRoomCode, rejoinRoom, navigate, gameType]);

  // Generate share URL
  const gamePaths = getGamePaths(gameType);
  const shareUrl = `${window.location.origin}${gamePaths.lobby}?room=${roomCode || urlRoomCode}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode || urlRoomCode || '');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/');
  };

  const handleReadyToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await setReady(e.target.checked);
    } catch (err) {
      console.error('Failed to set ready state:', err);
    }
  };

  const handleStartGame = async () => {
    const playerCount = Object.keys(players).length;
    const allReady = Object.values(players).every((p) => p.isReady);

    if (playerCount < 2 || !allReady) return;

    setIsStarting(true);

    try {
      // Generate grid with settings
      const { duration, gridSize } = gameSettings;
      const grid = generateGrid(gridSize);
      const startTime = Date.now() + 3000; // 3 second countdown

      // Set local state
      setGrid(grid);
      setGridSize(gridSize);
      setDuration(duration);
      setTimeRemaining(duration);
      setPhase('countdown');
      setStartTime(startTime);

      // Initialize scores for all players (excluding spectators)
      const scores: Record<string, number> = {};
      const wordCounts: Record<string, number> = {};
      const foundWords: Record<string, string[]> = {};

      Object.entries(players).forEach(([playerId, player]) => {
        if (!player.isSpectator) {
          scores[playerId] = 0;
          wordCounts[playerId] = 0;
          foundWords[playerId] = [];
        }
      });

      const initialState = {
        grid,
        gridSize,
        timeRemaining: duration,
        duration,
        phase: 'countdown',
        startTime,
        scores,
        wordCounts,
        foundWords,
      };

      await startGame(initialState);
      await updateGameState(initialState);
    } catch (err) {
      console.error('Failed to start game:', err);
      setIsStarting(false);
    }
  };

  // Handle going home
  const handleGoHome = useCallback(() => {
    resetRoom();
    resetGame();
    navigate('/');
  }, [resetRoom, resetGame, navigate]);

  // Handle retry
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-error text-lg text-center">{error}</div>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-bg-main rounded-lg font-medium hover:bg-primary/90"
          >
            Retry
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-bg-cell text-text-primary rounded-lg font-medium hover:bg-bg-cell-hover"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while joining
  if (isJoining) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <div className="text-text-muted text-lg">Joining room...</div>
        <div className="text-text-muted text-sm opacity-50">
          This should only take a moment
        </div>
        <button
          onClick={handleGoHome}
          className="mt-4 px-4 py-2 bg-bg-cell text-text-primary rounded-lg font-medium hover:bg-bg-cell-hover"
        >
          Choose New Game
        </button>
      </div>
    );
  }

  // Check if we can start
  const playerCount = Object.keys(players).length;
  const allReady = Object.values(players).every((p) => p.isReady);
  const canStart = playerCount >= 2 && allReady;

  const startHint =
    playerCount < 2
      ? 'Waiting for opponent to join...'
      : !allReady
        ? 'Waiting for everyone to ready up...'
        : 'Ready to start!';

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-bg-card rounded-[var(--radius-default)] p-10 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-center text-text-primary mb-6">
          Waiting Room
        </h2>

        {/* Room Code */}
        <div className="text-center mb-6">
          <span className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Room Code
          </span>
          <span className="block text-4xl font-mono font-bold text-primary tracking-widest mb-2">
            {roomCode || urlRoomCode}
          </span>
          <Button variant="link" onClick={copyCode}>
            Copy Code
          </Button>
        </div>

        {/* Share Link */}
        <div className="mb-6 pt-4 border-t border-white/10">
          <span className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Share Link
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-bg-cell border-none rounded-lg text-text-primary text-sm focus:outline-none"
            />
            <Button variant="secondary" onClick={copyLink}>
              Copy
            </Button>
          </div>
        </div>

        {/* Players */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Players
          </h3>
          <PlayerList players={players} />
        </div>

        {/* Game Settings - Host only */}
        {isHost && <GameSettings />}

        {/* Actions */}
        {isHost ? (
          <>
            <Button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className="w-full mb-2"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </Button>
            <p className="text-center text-text-muted text-sm">{startHint}</p>
          </>
        ) : (
          <div className="text-center mb-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                onChange={handleReadyToggle}
                className="w-5 h-5 accent-primary"
              />
              <span className="text-text-primary font-medium">I'm Ready!</span>
            </label>
            <p className="text-text-muted text-sm mt-2">
              Toggle ready when you're set to play
            </p>
          </div>
        )}

        <Button variant="link" onClick={handleLeave} className="w-full mt-4">
          Leave Room
        </Button>
      </div>
    </div>
  );
}
