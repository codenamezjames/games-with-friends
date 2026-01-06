import { useEffect, useState, useRef, useCallback } from 'react';
import { ref, onValue, onChildRemoved } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useRoom } from '@/hooks/useRoom';
import type { Player, RoomStatus } from '@/types';

const HOST_TRANSFER_DELAY_MS = 5000; // 5 seconds grace period

export function useRoomListeners() {
  const navigate = useNavigate();
  const { roomCode, playerId, setPlayers, setRoomStatus, resetRoom, setIsHost } = useRoomStore();
  const { resetGame } = useGameStore();
  const { claimHost } = useRoom();
  const [connectionError, setConnectionError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!roomCode) return;

    setConnectionError(null);

    // Listen to players
    const playersDbRef = ref(db, `rooms/${roomCode}/players`);
    const unsubPlayers = onValue(
      playersDbRef,
      (snapshot) => {
        const players = snapshot.val() as Record<string, Player> | null;

        // If no players left, room was probably deleted
        if (!players || Object.keys(players).length === 0) {
          console.log('[useRoomListeners] Room appears to be empty or deleted');
          resetRoom();
          resetGame();
          navigate('/');
          return;
        }

        // Check if we got kicked from the room
        if (playerId && !players[playerId]) {
          console.log('[useRoomListeners] We were removed from the room');
          resetRoom();
          resetGame();
          navigate('/');
          return;
        }

        // Store players for reference in timeout callbacks
        cachedPlayersRef.current = players;

        // Find the current host
        const host = Object.values(players).find((p) => p.isHost);

        // Check if host is disconnected
        if (host?.isConnected === false) {
          // Host is disconnected - start transfer timer if not already running
          if (!hostTransferTimerRef.current) {
            console.log('[useRoomListeners] Host disconnected, starting transfer timer');
            hostTransferTimerRef.current = setTimeout(async () => {
              // Re-check if host is still disconnected
              const currentPlayers = cachedPlayersRef.current;
              const currentHost = Object.values(currentPlayers).find((p) => p.isHost);

              if (currentHost && currentHost.isConnected === false) {
                console.log('[useRoomListeners] Host still disconnected after grace period');
                // Check if we should become the new host
                if (shouldBecomeHost(currentPlayers, playerId)) {
                  console.log('[useRoomListeners] Claiming host role');
                  await claimHost();
                }
              }
              hostTransferTimerRef.current = null;
            }, HOST_TRANSFER_DELAY_MS);
          }
        } else {
          // Host is connected - cancel any pending transfer
          if (hostTransferTimerRef.current) {
            console.log('[useRoomListeners] Host reconnected, canceling transfer');
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
        console.error('[useRoomListeners] Players listener error:', error);
        setConnectionError('Lost connection to room');
      }
    );

    // Listen to player leaving (for logging)
    const unsubPlayerRemoved = onChildRemoved(playersDbRef, (snapshot) => {
      console.log('[useRoomListeners] Player left:', snapshot.key, snapshot.val());
    });

    // Listen to status changes
    const statusRef = ref(db, `rooms/${roomCode}/metadata/status`);
    const unsubStatus = onValue(
      statusRef,
      (snapshot) => {
        const status = snapshot.val() as RoomStatus | null;

        // If status is null, room might be deleted
        if (status === null) {
          console.log('[useRoomListeners] Room status is null, room may be deleted');
          // Don't immediately navigate - let the players listener handle it
          return;
        }

        setRoomStatus(status);

        // Navigate to game when status changes to countdown/playing
        // But not if game phase is 'lobby' (returning from game)
        const currentPhase = useGameStore.getState().phase;
        if ((status === 'countdown' || status === 'playing') && currentPhase !== 'lobby') {
          navigate(`/games/boggle/play/${roomCode}`);
        }

        // If room finished and we're still in waiting room, show message
        if (status === 'finished') {
          console.log('[useRoomListeners] Game finished while in lobby');
        }
      },
      (error) => {
        console.error('[useRoomListeners] Status listener error:', error);
        setConnectionError('Lost connection to room');
      }
    );

    return () => {
      unsubPlayers();
      unsubPlayerRemoved();
      unsubStatus();
      // Clear host transfer timer on cleanup
      if (hostTransferTimerRef.current) {
        clearTimeout(hostTransferTimerRef.current);
        hostTransferTimerRef.current = null;
      }
    };
  }, [roomCode, playerId, setPlayers, setRoomStatus, resetRoom, resetGame, navigate, shouldBecomeHost, claimHost, setIsHost]);

  return { connectionError };
}
