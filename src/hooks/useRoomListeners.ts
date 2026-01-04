import { useEffect } from 'react';
import { ref, onValue, onChildRemoved } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import type { Player, RoomStatus } from '@/types';

export function useRoomListeners() {
  const navigate = useNavigate();
  const { roomCode, setPlayers, setRoomStatus } = useRoomStore();

  useEffect(() => {
    if (!roomCode) return;

    // Listen to players
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const unsubPlayers = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() as Record<string, Player> | null;
      setPlayers(players || {});
    });

    // Listen to player leaving
    const unsubPlayerRemoved = onChildRemoved(playersRef, (snapshot) => {
      console.log('Player left:', snapshot.key, snapshot.val());
    });

    // Listen to status changes
    const statusRef = ref(db, `rooms/${roomCode}/metadata/status`);
    const unsubStatus = onValue(statusRef, (snapshot) => {
      const status = snapshot.val() as RoomStatus | null;
      setRoomStatus(status);

      // Navigate to game when status changes to countdown/playing
      if (status === 'countdown' || status === 'playing') {
        navigate(`/game/${roomCode}`);
      }
    });

    return () => {
      unsubPlayers();
      unsubPlayerRemoved();
      unsubStatus();
    };
  }, [roomCode, setPlayers, setRoomStatus, navigate]);
}
