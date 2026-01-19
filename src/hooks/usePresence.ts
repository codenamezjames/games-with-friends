import { useEffect, useRef } from 'react';
import { ref, update, onDisconnect, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';

const HEARTBEAT_INTERVAL_MS = 3000; // 3 seconds

/**
 * Hook to manage player presence in a room.
 * - Sends heartbeat updates every 3 seconds
 * - Sets up onDisconnect to mark player as disconnected
 * - Should be used in WaitingRoom and GamePage components
 */
export function usePresence() {
  const { roomCode, playerId } = useRoomStore();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);

    // Set up presence immediately
    const setupPresence = async () => {
      // Mark as connected and update lastSeen
      await update(playerRef, {
        isConnected: true,
        lastSeen: serverTimestamp(),
      });

      // Set up onDisconnect to mark as disconnected (not remove)
      await onDisconnect(playerRef).update({ isConnected: false });
    };

    setupPresence();

    // Start heartbeat
    heartbeatRef.current = setInterval(async () => {
      try {
        await update(playerRef, {
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.error('[usePresence] Heartbeat failed:', error);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Cancel the onDisconnect handler to prevent accumulation
      onDisconnect(playerRef).cancel();
    };
  }, [roomCode, playerId]);
}
