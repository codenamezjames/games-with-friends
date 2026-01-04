import { useEffect, useRef } from 'react';
import { ref, onValue, onChildAdded } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import type { SerializableGameState, WordSubmission } from '@/types';

export function useGameListeners() {
  const { roomCode, isHost } = useRoomStore();
  const { applyStateFromFirebase } = useGameStore();
  const hasLoadedInitialState = useRef(false);

  useEffect(() => {
    if (!roomCode) return;

    // Reset on roomCode change
    hasLoadedInitialState.current = false;

    // Listen to game state changes
    const gameStateRef = ref(db, `rooms/${roomCode}/gameState`);
    const unsubGameState = onValue(gameStateRef, (snapshot) => {
      const state = snapshot.val() as SerializableGameState | null;
      console.log('[useGameListeners] Firebase state received:', { state, isHost, hasLoaded: hasLoadedInitialState.current });
      if (!state) return;

      // Always apply on first load (handles refresh for both host and guest)
      // After that, only guest applies updates (host is the authority)
      if (!hasLoadedInitialState.current) {
        hasLoadedInitialState.current = true;
        console.log('[useGameListeners] Applying initial state, grid length:', state.grid?.length);
        applyStateFromFirebase(state);
      } else if (!isHost) {
        applyStateFromFirebase(state);
      }
    });

    return () => {
      unsubGameState();
    };
  }, [roomCode, isHost, applyStateFromFirebase]);
}

interface SubmissionWithKey extends WordSubmission {
  key: string;
}

export function useHostSubmissionListener(
  onSubmission: (submission: SubmissionWithKey) => void
) {
  const { roomCode, isHost } = useRoomStore();

  useEffect(() => {
    if (!roomCode || !isHost) return;

    const submissionsRef = ref(db, `rooms/${roomCode}/submissions`);
    const unsubSubmissions = onChildAdded(submissionsRef, (snapshot) => {
      const submission = {
        key: snapshot.key!,
        ...(snapshot.val() as WordSubmission),
      };
      onSubmission(submission);
    });

    return () => {
      unsubSubmissions();
    };
  }, [roomCode, isHost, onSubmission]);
}
