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
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';

// Characters that look distinct (avoiding O, 0, I, 1, L)
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function useRoom() {
  const {
    setRoomCode,
    setIsHost,
    setPlayerName,
    setGameType,
    resetRoom,
  } = useRoomStore();

  const createRoom = useCallback(
    async (gameType: string, playerName: string): Promise<string> => {
      const currentPlayerId = useRoomStore.getState().playerId;
      if (!currentPlayerId) throw new Error('Not authenticated');

      let roomCode = generateRoomCode();
      let roomRef = ref(db, `rooms/${roomCode}`);

      // Check for collision
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        return createRoom(gameType, playerName); // Retry
      }

      // Create room
      await set(roomRef, {
        metadata: {
          gameType,
          hostId: currentPlayerId,
          status: 'waiting',
          createdAt: serverTimestamp(),
        },
        players: {
          [currentPlayerId]: {
            name: playerName,
            isHost: true,
            isReady: true,
            joinedAt: serverTimestamp(),
          },
        },
        gameState: null,
        submissions: null,
      });

      // Set up presence (remove player on disconnect)
      const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
      await onDisconnect(playerRef).remove();

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
    async (roomCode: string, playerName: string): Promise<void> => {
      const currentPlayerId = useRoomStore.getState().playerId;
      if (!currentPlayerId) throw new Error('Not authenticated');

      roomCode = roomCode.toUpperCase();
      const roomRef = ref(db, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        throw new Error('Room not found');
      }

      const roomData = snapshot.val();

      if (roomData.metadata.status !== 'waiting') {
        throw new Error('Game already in progress');
      }

      const playerCount = Object.keys(roomData.players || {}).length;
      if (playerCount >= 2) {
        throw new Error('Room is full');
      }

      // Join room
      const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
      await set(playerRef, {
        name: playerName,
        isHost: false,
        isReady: false,
        joinedAt: serverTimestamp(),
      });

      // Set up presence
      await onDisconnect(playerRef).remove();

      // Update store
      setRoomCode(roomCode);
      setIsHost(false);
      setPlayerName(playerName);
      setGameType(roomData.metadata.gameType);
    },
    [setRoomCode, setIsHost, setPlayerName, setGameType]
  );

  const leaveRoom = useCallback(async (): Promise<void> => {
    const { roomCode, isHost, playerId: currentPlayerId } = useRoomStore.getState();
    if (!roomCode || !currentPlayerId) return;

    // Remove player
    const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
    await remove(playerRef);

    // If host and room is empty, delete room
    if (isHost) {
      const playersRef = ref(db, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      if (!snapshot.exists()) {
        await remove(ref(db, `rooms/${roomCode}`));
      }
    }

    resetRoom();
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

    // Check if we're already in the room
    if (players[currentPlayerId]) {
      // Already in room, just set up presence again
      const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
      await onDisconnect(playerRef).remove();
      setGameType(roomData.metadata.gameType);
      return true;
    }

    // Not in room, try to rejoin
    // Only allow rejoin if game is still in progress (not waiting)
    if (roomData.metadata.status === 'waiting') {
      // Room is in waiting state, player needs to join properly
      resetRoom();
      return false;
    }

    // Re-add player to the room
    const playerRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}`);
    await set(playerRef, {
      name: playerName,
      isHost,
      isReady: true,
      joinedAt: serverTimestamp(),
    });

    // Set up presence
    await onDisconnect(playerRef).remove();
    setGameType(roomData.metadata.gameType);

    return true;
  }, [resetRoom, setGameType]);

  const setReady = useCallback(
    async (isReady: boolean): Promise<void> => {
      const { roomCode, playerId: currentPlayerId } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId) return;

      const readyRef = ref(db, `rooms/${roomCode}/players/${currentPlayerId}/isReady`);
      await set(readyRef, isReady);
    },
    []
  );

  const startGame = useCallback(
    async (initialState: object): Promise<void> => {
      const { roomCode, isHost } = useRoomStore.getState();
      if (!roomCode || !isHost) return;

      // Check all players are ready
      const playersRef = ref(db, `rooms/${roomCode}/players`);
      const snapshot = await get(playersRef);
      const players = snapshot.val();

      const allReady = Object.values(players).every(
        (p) => (p as { isReady: boolean }).isReady
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

  const submitWord = useCallback(
    async (word: string, path: number[]): Promise<void> => {
      const { roomCode, playerId: currentPlayerId } = useRoomStore.getState();
      if (!roomCode || !currentPlayerId) return;

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

  return {
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    setReady,
    startGame,
    updateGameState,
    updateGameStateFields,
    submitWord,
    deleteSubmission,
  };
}
