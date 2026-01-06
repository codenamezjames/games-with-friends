import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { WordTraceBoard } from '@/games/wordtrace/components/WordTraceBoard';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useGameListeners } from '@/hooks/useGameListeners';
import { useRoom } from '@/hooks/useRoom';
import { usePresence } from '@/hooks/usePresence';
import { getGamePaths } from '@/games/registry';
import type { Player } from '@/types';

// Timeouts for defensive loading
const REJOIN_TIMEOUT_MS = 10000; // 10 seconds to rejoin
const GRID_LOAD_TIMEOUT_MS = 15000; // 15 seconds to receive grid data
const HOST_TRANSFER_DELAY_MS = 5000; // 5 seconds grace period for host transfer

export function GamePage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomCode, playerId, setPlayers, setIsHost, resetRoom } = useRoomStore();
  const { grid, phase, resetGame, gameType } = useGameStore();
  const { rejoinRoom, claimHost } = useRoom();
  const [isRejoining, setIsRejoining] = useState(true);
  const [rejoinFailed, setRejoinFailed] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const gridTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostTransferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedPlayersRef = useRef<Record<string, Player>>({});

  // Determine if we should become host based on deterministic selection
  const shouldBecomeHost = useCallback((players: Record<string, Player>, currentPlayerId: string | null) => {
    if (!currentPlayerId) return false;

    // Find all connected non-spectator players
    const connectedPlayers = Object.entries(players)
      .filter(([, p]) => p.isConnected !== false && !p.isSpectator)
      .sort(([idA], [idB]) => idA.localeCompare(idB)); // Sort by playerId for determinism

    if (connectedPlayers.length === 0) return false;

    // The first connected player (lowest playerId) should become host
    const [newHostId] = connectedPlayers[0];
    return newHostId === currentPlayerId;
  }, []);

  // Set up game listeners - this must run before checking grid
  // so guests can receive the game state from Firebase
  useGameListeners();

  // Set up presence heartbeat for connection tracking
  usePresence();

  // Listen for player updates during gameplay (includes host transfer logic)
  useEffect(() => {
    if (!roomCode) return;

    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const unsubscribe = onValue(
      playersRef,
      (snapshot) => {
        const players = snapshot.val() as Record<string, Player> | null;
        if (!players) {
          setPlayers({});
          return;
        }

        // Store players for reference in timeout callbacks
        cachedPlayersRef.current = players;

        // Find the current host
        const host = Object.values(players).find((p) => p.isHost);

        // Check if host is disconnected - handle host transfer
        if (host?.isConnected === false) {
          // Host is disconnected - start transfer timer if not already running
          if (!hostTransferTimerRef.current) {
            console.log('[GamePage] Host disconnected, starting transfer timer');
            hostTransferTimerRef.current = setTimeout(async () => {
              // Re-check if host is still disconnected
              const currentPlayers = cachedPlayersRef.current;
              const currentHost = Object.values(currentPlayers).find((p) => p.isHost);

              if (currentHost && currentHost.isConnected === false) {
                console.log('[GamePage] Host still disconnected after grace period');
                // Check if we should become the new host
                if (shouldBecomeHost(currentPlayers, playerId)) {
                  console.log('[GamePage] Claiming host role');
                  await claimHost();
                }
              }
              hostTransferTimerRef.current = null;
            }, HOST_TRANSFER_DELAY_MS);
          }
        } else {
          // Host is connected - cancel any pending transfer
          if (hostTransferTimerRef.current) {
            console.log('[GamePage] Host reconnected, canceling transfer');
            clearTimeout(hostTransferTimerRef.current);
            hostTransferTimerRef.current = null;
          }

          // Update our local isHost state if we became host
          if (playerId && players[playerId]?.isHost) {
            const currentIsHost = useRoomStore.getState().isHost;
            if (!currentIsHost) {
              setIsHost(true);
            }
          }
        }

        setPlayers(players);
      },
      (error) => {
        console.error('[GamePage] Players listener error:', error);
        setLoadingError('Connection lost. Please refresh.');
      }
    );

    return () => {
      unsubscribe();
      // Clear host transfer timer on cleanup
      if (hostTransferTimerRef.current) {
        clearTimeout(hostTransferTimerRef.current);
        hostTransferTimerRef.current = null;
      }
    };
  }, [roomCode, playerId, setPlayers, setIsHost, shouldBecomeHost, claimHost]);

  // Watch for phase changes to 'lobby' (host signaled back to lobby)
  useEffect(() => {
    // Don't redirect on initial load
    if (!hasInitializedRef.current && phase) {
      hasInitializedRef.current = true;
      return;
    }

    if (phase === 'lobby' && roomCode) {
      const paths = getGamePaths(gameType, roomCode);
      navigate(paths.room);
    }

    // Handle finished phase - redirect to results if we somehow missed it
    if (phase === 'finished' && grid.length > 0) {
      const paths = getGamePaths(gameType);
      navigate(paths.results);
    }
  }, [phase, roomCode, grid.length, navigate, gameType]);

  // Try to rejoin the room on mount (handles page refresh)
  useEffect(() => {
    let rejoinTimeout: ReturnType<typeof setTimeout>;

    const attemptRejoin = async () => {
      // Small delay to allow Zustand persist hydration to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Read fresh values from store (not from closure which may be stale)
      const { roomCode: currentRoomCode, playerId: currentPlayerId } = useRoomStore.getState();
      console.log('[GamePage] Attempting rejoin', { roomCode: currentRoomCode, playerId: currentPlayerId });

      // If no room code at all, fail fast
      if (!currentRoomCode && !urlRoomCode) {
        console.log('[GamePage] No room code available');
        setRejoinFailed(true);
        setIsRejoining(false);
        return;
      }

      // If we have persisted room state, try to rejoin with timeout
      if (currentRoomCode && currentPlayerId) {
        // Set a timeout to prevent hanging forever
        rejoinTimeout = setTimeout(() => {
          console.warn('[GamePage] Rejoin timeout exceeded');
          setLoadingError('Connection timeout. Please try again.');
          setIsRejoining(false);
        }, REJOIN_TIMEOUT_MS);

        try {
          // First check if the room still exists
          const roomRef = ref(db, `rooms/${currentRoomCode}`);
          const roomSnapshot = await get(roomRef);

          if (!roomSnapshot.exists()) {
            console.log('[GamePage] Room no longer exists');
            clearTimeout(rejoinTimeout);
            resetRoom();
            resetGame();
            setRejoinFailed(true);
            setIsRejoining(false);
            return;
          }

          // Check room status
          const roomData = roomSnapshot.val();
          const status = roomData?.metadata?.status;

          // If game is finished, redirect to results or home
          if (status === 'finished') {
            console.log('[GamePage] Game already finished');
            clearTimeout(rejoinTimeout);
            if (roomData?.gameState?.results) {
              // Apply the results state and go to results
              useGameStore.getState().applyStateFromFirebase(roomData.gameState);
              const paths = getGamePaths(useGameStore.getState().gameType);
              navigate(paths.results);
            } else {
              resetRoom();
              resetGame();
              setRejoinFailed(true);
            }
            setIsRejoining(false);
            return;
          }

          // If room is in waiting state, go back to lobby
          if (status === 'waiting') {
            console.log('[GamePage] Room is in waiting state, going to lobby');
            clearTimeout(rejoinTimeout);
            setIsRejoining(false);
            const paths = getGamePaths(useGameStore.getState().gameType, currentRoomCode);
            navigate(paths.room);
            return;
          }

          const success = await rejoinRoom();
          clearTimeout(rejoinTimeout);
          console.log('[GamePage] Rejoin result:', success);
          if (!success) {
            setRejoinFailed(true);
          }
        } catch (error) {
          clearTimeout(rejoinTimeout);
          console.error('[GamePage] Rejoin error:', error);
          setLoadingError('Failed to reconnect. Please try again.');
          setRejoinFailed(true);
        }
      }
      setIsRejoining(false);
    };

    attemptRejoin();

    return () => {
      if (rejoinTimeout) clearTimeout(rejoinTimeout);
    };
  }, []); // Only run on mount

  // Timeout for grid loading - if grid doesn't arrive within timeout, show error
  useEffect(() => {
    // Only start timeout if we're past rejoining and still waiting for grid
    if (!isRejoining && grid.length === 0 && !loadingError && !rejoinFailed) {
      console.log('[GamePage] Starting grid load timeout');
      gridTimeoutRef.current = setTimeout(() => {
        console.warn('[GamePage] Grid load timeout exceeded');
        setLoadingError('Failed to load game data. The game may have ended.');
      }, GRID_LOAD_TIMEOUT_MS);
    }

    // Clear timeout if grid arrives
    if (grid.length > 0 && gridTimeoutRef.current) {
      console.log('[GamePage] Grid received, clearing timeout');
      clearTimeout(gridTimeoutRef.current);
      gridTimeoutRef.current = null;
    }

    return () => {
      if (gridTimeoutRef.current) {
        clearTimeout(gridTimeoutRef.current);
      }
    };
  }, [isRejoining, grid.length, loadingError, rejoinFailed]);

  // Redirect if no room code or rejoin failed
  useEffect(() => {
    if (!isRejoining) {
      if ((!roomCode && !urlRoomCode) || rejoinFailed) {
        navigate('/');
      }
    }
  }, [roomCode, urlRoomCode, navigate, isRejoining, rejoinFailed]);

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

  // Show error state with actions
  if (loadingError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-error text-lg text-center">{loadingError}</div>
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

  // Show loading while rejoining or waiting for grid
  console.log('[GamePage] Render state', { isRejoining, gridLength: grid.length, roomCode });
  if (isRejoining || grid.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <div className="text-text-muted text-lg">
          {isRejoining ? 'Reconnecting...' : 'Loading game...'}
        </div>
        <div className="text-text-muted text-sm opacity-50">
          This should only take a moment
        </div>
        <div className="flex gap-3 mt-4">
          {roomCode && (
            <button
              onClick={() => {
                const paths = getGamePaths(gameType, roomCode);
                navigate(paths.room);
              }}
              className="px-4 py-2 bg-bg-cell text-text-primary rounded-lg font-medium hover:bg-bg-cell-hover"
            >
              Back to Lobby
            </button>
          )}
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-bg-cell text-text-primary rounded-lg font-medium hover:bg-bg-cell-hover"
          >
            Choose New Game
          </button>
        </div>
      </div>
    );
  }

  return <WordTraceBoard />;
}
