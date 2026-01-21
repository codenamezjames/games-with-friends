import { useEffect, useCallback, useRef } from 'react';
import { ref, push, onChildAdded, remove, get, serverTimestamp, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import { useReactionsStore } from '@/stores/useReactionsStore';
import { REACTION_MAX_AGE_MS } from '@/components/reactions/constants';
import type { Reaction } from '@/types';

export function useReactions() {
  const { roomCode, playerId, playerName, isHost } = useRoomStore();
  const { addReaction } = useReactionsStore();
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Send a reaction
  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!roomCode || !playerId) return;

      const reactionsRef = ref(db, `rooms/${roomCode}/reactions`);
      await push(reactionsRef, {
        playerId,
        playerName: playerName || 'Anonymous',
        emoji,
        timestamp: serverTimestamp(),
      });
    },
    [roomCode, playerId, playerName]
  );

  // Listen for new reactions
  useEffect(() => {
    if (!roomCode) return;

    const reactionsRef = ref(db, `rooms/${roomCode}/reactions`);

    const handleChildAdded = (snapshot: { key: string | null; val: () => Omit<Reaction, 'id'> | null }) => {
      const key = snapshot.key;
      const data = snapshot.val();

      if (!key || !data) return;

      // Skip if already processed
      if (processedIdsRef.current.has(key)) return;
      processedIdsRef.current.add(key);

      const reaction: Reaction = {
        id: key,
        playerId: data.playerId,
        playerName: data.playerName,
        emoji: data.emoji,
        timestamp: data.timestamp || Date.now(),
      };

      addReaction(reaction);
    };

    onChildAdded(reactionsRef, handleChildAdded);

    return () => {
      off(reactionsRef, 'child_added', handleChildAdded);
    };
  }, [roomCode, addReaction]);

  // Host-only cleanup of old reactions
  useEffect(() => {
    if (!roomCode || !isHost) return;

    const cleanup = async () => {
      const reactionsRef = ref(db, `rooms/${roomCode}/reactions`);
      const snapshot = await get(reactionsRef);

      if (!snapshot.exists()) return;

      const reactions = snapshot.val();
      const now = Date.now();

      const promises = Object.entries(reactions).map(([key, reaction]) => {
        const r = reaction as { timestamp?: number };
        const age = now - (r.timestamp || 0);
        if (age > REACTION_MAX_AGE_MS) {
          return remove(ref(db, `rooms/${roomCode}/reactions/${key}`));
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
    };

    // Run cleanup every 10 seconds
    const intervalId = setInterval(cleanup, 10000);

    // Initial cleanup
    cleanup();

    return () => clearInterval(intervalId);
  }, [roomCode, isHost]);

  return { sendReaction };
}
