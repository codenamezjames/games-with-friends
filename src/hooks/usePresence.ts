import { useEffect, useRef } from 'react';
import { ref, update, onDisconnect, serverTimestamp, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';

const HEARTBEAT_INTERVAL_MS = 3000; // 3 seconds

/**
 * Hook to manage player presence in a room.
 * - Sends heartbeat updates every 3 seconds
 * - Sets up onDisconnect to mark player as disconnected
 * - Listens for connection restoration and re-marks player as connected
 * - Should be used in WaitingRoom and GamePage components
 */
export function usePresence() {
  const { roomCode, playerId } = useRoomStore();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
    const connectedRef = ref(db, '.info/connected');

    // Function to mark player as connected
    const markConnected = async () => {
      await update(playerRef, {
        isConnected: true,
        lastSeen: serverTimestamp(),
      });
      // Re-register onDisconnect handler
      await onDisconnect(playerRef).update({ isConnected: false });
    };

    // Set up presence immediately
    markConnected();

    // Listen for connection state changes to handle reconnection
    const unsubscribeConnection = onValue(connectedRef, (snap) => {
      const isConnected = snap.val() === true;

      if (isConnected && wasDisconnectedRef.current) {
        // We just reconnected - update presence
        markConnected();
      }

      wasDisconnectedRef.current = !isConnected;
    });

    // Start heartbeat
    heartbeatRef.current = setInterval(async () => {
      try {
        await update(playerRef, {
          lastSeen: serverTimestamp(),
        });
      } catch {
        // Heartbeat failed - likely disconnected
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup
    return () => {
      unsubscribeConnection();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Cancel the onDisconnect handler to prevent accumulation
      onDisconnect(playerRef).cancel();
    };
  }, [roomCode, playerId]);
}
