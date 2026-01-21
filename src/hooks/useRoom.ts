import { useCallback } from 'react';
import {
  ref,
  set,
  get,
  update,
  remove,
  push,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import { useReactionsStore } from '@/stores/useReactionsStore';

// Characters that look distinct (avoiding O, 0, I, 1, L)
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export interface JoinResult {
  isSpectator: boolean;
}

export function useRoom() {
  const {
    setRoomCode,
    setIsHost,
    setIsSpectator,
    setPlayerName,
    setGameType,
    resetRoom,
  } = useRoomStore();

  const createRoom = useCallback(
    async (gameType: string, playerName: string): Promise<string> => {
      let currentPlayerId = useRoomStore.getState().playerId;

      // If playerId is missing, try to get from Firebase auth or re-authenticate
      if (!currentPlayerId) {
        // Check if Firebase auth has a user
        if (auth.currentUser) {
          currentPlayerId = auth.currentUser.uid;
          useRoomStore.getState().setPlayerId(currentPlayerId);
        } else {
          // Re-authenticate
          const userCredential = await signInAnonymously(auth);
          currentPlayerId = userCredential.user.uid;
          useRoomStore.getState().setPlayerId(currentPlayerId);
        }
      }

      if (!currentPlayerId) throw new Error('Not authenticated');

      // Generate unique room code with collision check
      let roomCode = generateRoomCode();
      let roomRef = ref(db, `rooms/${roomCode}`);
      let snapshot = await get(roomRef);

      // Retry with new codes if collision (up to 10 attempts)
      let attempts = 0;
      while (snapshot.exists() && attempts < 10) {
        roomCode = generateRoomCode();
        roomRef = ref(db, `rooms/${roomCode}`);
        snapshot = await get(roomRef);
        attempts++;
      }

      if (snapshot.exists()) {
        throw new Error('Failed to generate unique room code');
      }

      // Get current game settings to initialize the room with
      const { gameSettings } = useRoomStore.getState();

      // Create room
      await set(roomRef, {
        metadata: {
          gameType,
          hostId: currentPlayerId,
          status: 'waiting',
          createdAt: serverTimestamp(),
          gameSettings: gameSettings,
        },
        players: {
          [currentPlayerId]: {
            name: playerName,
            isHost: true,
            isReady: true,
            joinedAt: serverTimestamp(),
            isConnected: true,
            lastSeen: serverTimestamp(),
          },
        },
        gameState: null,
        submissions: null,
      });

      // Set up presence - mark as disconnected instead of removing
      const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
      await onDisconnect(playerRef).update({ isConnected: false });

      // Update store
      setRoomCode(roomCode);
      setIsHost(true);
      setPlayerName(playerName);
      setGameType(gameType);

      return roomCode;
    },
    [setRoomCode, setIsHost, setPlayerName, setGameType]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string): Promise<JoinResult> => {
      let currentPlayerId = useRoomStore.getState().playerId;

      // If playerId is missing, try to get from Firebase auth or re-authenticate
      if (!currentPlayerId) {
        if (auth.currentUser) {
          currentPlayerId = auth.currentUser.uid;
          useRoomStore.getState().setPlayerId(currentPlayerId);
        } else {
          const userCredential = await signInAnonymously(auth);
          currentPlayerId = userCredential.user.uid;
          useRoomStore.getState().setPlayerId(currentPlayerId);
        }
      }

      if (!currentPlayerId) throw new Error('Not authenticated');

      roomCode = roomCode.toUpperCase();
      const roomRef = ref(db, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        throw new Error('Room not found');
      }

      const roomData = snapshot.val();
      const status = roomData.metadata.status;

      // Check if game is finished
      if (status === 'finished') {
        throw new Error('Game has ended');
      }

      const playerCount = Object.keys(roomData.players || {}).length;
      if (playerCount >= 20) {
        throw new Error('Room is full');
      }

      // Determine if joining as spectator (game in progress)
      const isSpectator = status === 'countdown' || status === 'playing';

      // Join room
      const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
      await set(playerRef, {
        name: playerName,
        isHost: false,
        isReady: false, // Players need to ready up (spectators also start not ready)
        joinedAt: serverTimestamp(),
        isSpectator,
        isConnected: true,
        lastSeen: serverTimestamp(),
      });

      // Set up presence - mark as disconnected instead of removing
      await onDisconnect(playerRef).update({ isConnected: false });

      // Update store
      setRoomCode(roomCode);
      setIsHost(false);
      setIsSpectator(isSpectator);
      setPlayerName(playerName);
      setGameType(roomData.metadata.gameType);

      return { isSpectator };
    },
    [setRoomCode, setIsHost, setIsSpectator, setPlayerName, setGameType]
  );

  const leaveRoom = useCallback(async (): Promise<void> => {
    const { roomCode, isHost, playerId: currentPlayerId } = useRoomStore.getState();
    if (!roomCode || !currentPlayerId) return;

    // If we're the host, transfer to another player before leaving
    if (isHost) {
      const playersRef = ref(db, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val() || {};

      // Find another connected non-spectator player to become host
      const otherPlayers = Object.entries(players)
        .filter(([id, p]) => {
          const player = p as { isConnected?: boolean; isSpectator?: boolean };
          return id !== currentPlayerId && player.isConnected !== false && !player.isSpectator;
        })
        .sort(([idA], [idB]) => idA.localeCompare(idB)); // Sort for determinism

      if (otherPlayers.length > 0) {
        // Transfer host to first available player
        const [newHostId] = otherPlayers[0];
        const roomRef = ref(db, `rooms/${roomCode}`);
        await update(roomRef, {
          'metadata/hostId': newHostId,
          [`players/${currentPlayerId}/isHost`]: false,
          [`players/${newHostId}/isHost`]: true,
        });
        // console.log('[useRoom] Transferred host to', newHostId);
      }
    }

    // Remove player
    const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
    await remove(playerRef);

    // If room is now empty, delete it
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const snapshot = await get(playersRef);
    if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
      await remove(ref(db, `rooms/${roomCode}`));
    }

    resetRoom();
    useReactionsStore.getState().clearReactions();
  }, [resetRoom]);

  const rejoinRoom = useCallback(async (): Promise<boolean> => {
    const { roomCode, playerId: currentPlayerId, playerName, isHost } =
      useRoomStore.getState();
    if (!roomCode || !currentPlayerId || !playerName) return false;

    const roomRef = ref(db, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      // Room no longer exists
      resetRoom();
      return false;
    }

    const roomData = snapshot.val();
    const players = roomData.players || {};
    const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);

    // Check if we're already in the room
    if (players[currentPlayerId]) {
      // Already in room, just mark as connected and set up presence again
      await update(playerRef, {
        isConnected: true,
        lastSeen: serverTimestamp(),
      });
      await onDisconnect(playerRef).update({ isConnected: false });
      setGameType(roomData.metadata.gameType);

      // Restore isHost from Firebase if it differs from local state
      const wasHost = players[currentPlayerId].isHost;
      if (wasHost !== isHost) {
        setIsHost(wasHost);
      }
      return true;
    }

    // Not in room - check if we were the original host
    const wasOriginalHost = roomData.metadata.hostId === currentPlayerId;
    const shouldBeHost = wasOriginalHost || isHost;

    // Check if player was previously a spectator (from stored state)
    const wasSpectator = useRoomStore.getState().isSpectator;

    // Re-add player to the room (works for both waiting and in-progress states)
    await set(playerRef, {
      name: playerName,
      isHost: shouldBeHost,
      isReady: roomData.metadata.status !== 'waiting',
      joinedAt: serverTimestamp(),
      isConnected: true,
      lastSeen: serverTimestamp(),
      isSpectator: wasSpectator,
    });

    // Set up presence - mark as disconnected instead of removing
    await onDisconnect(playerRef).update({ isConnected: false });
    setGameType(roomData.metadata.gameType);
    setIsHost(shouldBeHost);

    return true;
  }, [resetRoom, setGameType, setIsHost]);

  const setReady = useCallback(
    async (isReady: boolean): Promise<void> => {
      const { roomCode, playerId: currentPlayerId } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId) return;

      const readyRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}/isReady`);
      await set(readyRef, isReady);
    },
    []
  );

  const setReadyForRematch = useCallback(
    async (isReady: boolean): Promise<void> => {
      const { roomCode, playerId: currentPlayerId, isSpectator } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId) return;

      // If spectator marks ready, also clear their spectator status (they're joining the next game)
      if (isReady && isSpectator) {
        const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
        await update(playerRef, {
          readyForRematch: true,
          isSpectator: false,
        });
        // Local state will be synced via useRoomListeners
      } else {
        const readyRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}/readyForRematch`);
        await set(readyRef, isReady);
      }
    },
    []
  );

  const clearRematchReady = useCallback(async (): Promise<void> => {
    const { roomCode, isHost } = useRoomStore.getState();
    if (!roomCode || !isHost) return;

    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const snapshot = await get(playersRef);
    if (!snapshot.exists()) return;

    const players = snapshot.val();
    const updates: Record<string, boolean | null> = {};
    Object.keys(players).forEach((playerId) => {
      updates[`${playerId}/readyForRematch`] = null;
    });
    await update(playersRef, updates);
  }, []);

  const startGame = useCallback(
    async (initialState: object): Promise<void> => {
      const { roomCode, isHost } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      // Check all non-spectator players are ready
      const playersRef = ref(db, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val();

      const allReady = Object.values(players).every(
        (p) => {
          const player = p as { isReady: boolean; isSpectator?: boolean };
          // Spectators don't need to be ready
          if (player.isSpectator) return true;
          return player.isReady;
        }
      );
      if (!allReady) {
        throw new Error('Not all players are ready');
      }

      // Set game state and status
      const roomRef = ref(db, `rooms/${roomCode}`);
      await update(roomRef, {
        'metadata/status': 'countdown',
        gameState: initialState,
      });
    },
    []
  );

  const updateGameState = useCallback(async (state: object): Promise<void> => {
    const { roomCode, isHost } = useRoomStore.getState();
    if (!roomCode || !isHost) return;

    const gameStateRef = ref(db, `rooms/${roomCode}/gameState`);
    await set(gameStateRef, state);
  }, []);

  const updateGameStateFields = useCallback(
    async (updates: object): Promise<void> => {
      const { roomCode, isHost } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      const gameStateRef = ref(db, `rooms/${roomCode}/gameState`);
      await update(gameStateRef, updates);
    },
    []
  );

  /**
   * Submit a generic game action.
   * Used by games to submit player actions (word submissions, card plays, etc.)
   */
  const submitAction = useCallback(
    async (actionType: string, payload: Record<string, unknown>): Promise<void> => {
      const { roomCode, playerId: currentPlayerId, isSpectator } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId || isSpectator) return; // Block spectators

      const submissionsRef = ref(db, `rooms/${roomCode}/submissions`);
      await push(submissionsRef, {
        type: actionType,
        playerId: currentPlayerId,
        payload,
        timestamp: serverTimestamp(),
      });
    },
    []
  );

  /**
   * Submit a word in Word Trace game.
   * @deprecated Use submitAction('word', { word, path }) instead
   */
  const submitWord = useCallback(
    async (word: string, path: number[]): Promise<void> => {
      const { roomCode, playerId: currentPlayerId, isSpectator } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId || isSpectator) return; // Block spectators

      const submissionsRef = ref(db, `rooms/${roomCode}/submissions`);
      await push(submissionsRef, {
        playerId: currentPlayerId,
        word,
        path,
        timestamp: serverTimestamp(),
      });
    },
    []
  );

  const deleteSubmission = useCallback(async (key: string): Promise<void> => {
    const { roomCode, isHost } = useRoomStore.getState();
    if (!roomCode || !isHost) return;

    const submissionRef = ref(db, `rooms/${roomCode}/submissions/${key}`);
    await remove(submissionRef);
  }, []);

  const setRoomStatus = useCallback(
    async (status: 'waiting' | 'countdown' | 'playing'): Promise<void> => {
      const { roomCode, isHost } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      const statusRef = ref(db, `rooms/${roomCode}/metadata/status`);
      await set(statusRef, status);
    },
    []
  );

  const updateGameSettings = useCallback(
    async (settings: { duration?: number; gridSize?: number }): Promise<void> => {
      const { roomCode, isHost, gameSettings } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      // Merge with current settings and write the full object
      const newSettings = { ...gameSettings, ...settings };
      const settingsRef = ref(db, `rooms/${roomCode}/metadata/gameSettings`);
      await set(settingsRef, newSettings);
    },
    []
  );

  const updateResultsSpeed = useCallback(
    async (speed: 'normal' | 'fast'): Promise<void> => {
      const { roomCode, isHost } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      const speedRef = ref(db, `rooms/${roomCode}/metadata/resultsSpeed`);
      await set(speedRef, speed);
    },
    []
  );

  // Transfer host to another player
  const transferHost = useCallback(
    async (newHostId: string): Promise<void> => {
      const { roomCode, playerId: currentPlayerId } = useRoomStore.getState();
      if (!roomCode) return;

      const roomRef = ref(db, `rooms/${roomCode}`);

      // Update metadata.hostId and player host flags atomically
      await update(roomRef, {
        'metadata/hostId': newHostId,
        [`players/${currentPlayerId}/isHost`]: false,
        [`players/${newHostId}/isHost`]: true,
      });

      // Update local state if we were the old host
      if (currentPlayerId !== newHostId) {
        setIsHost(false);
      }
    },
    [setIsHost]
  );

  // Claim host role (used when host disconnects and we're taking over)
  const claimHost = useCallback(async (): Promise<void> => {
    const { roomCode, playerId: currentPlayerId } = useRoomStore.getState();
    if (!roomCode || !currentPlayerId) return;

    const roomRef = ref(db, `rooms/${roomCode}`);

    // First, get the current host to clear their isHost flag
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;

    const roomData = snapshot.val();
    const oldHostId = roomData.metadata?.hostId;

    // Build updates: set new host, clear old host's flag
    const updates: Record<string, unknown> = {
      'metadata/hostId': currentPlayerId,
      [`players/${currentPlayerId}/isHost`]: true,
    };

    // Clear old host's isHost flag if they exist and are different
    if (oldHostId && oldHostId !== currentPlayerId && roomData.players?.[oldHostId]) {
      updates[`players/${oldHostId}/isHost`] = false;
    }

    await update(roomRef, updates);
    setIsHost(true);
  }, [setIsHost]);

  return {
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    setReady,
    setReadyForRematch,
    clearRematchReady,
    startGame,
    updateGameState,
    updateGameStateFields,
    submitAction,
    submitWord, // @deprecated - use submitAction instead
    deleteSubmission,
    setRoomStatus,
    updateGameSettings,
    updateResultsSpeed,
    transferHost,
    claimHost,
  };
}
