import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useRoom } from './useRoom';

export function useGameTimer(onTimeUp: () => void) {
  const { updateGameStateFields } = useRoom();
  const intervalRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Subscribe to phase/isHost to trigger effect re-run when they change
  const phase = useGameStore((state) => state.phase);
  const isHost = useRoomStore((state) => state.isHost);
  const timeRemaining = useGameStore((state) => state.timeRemaining);

  // Keep onTimeUp ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const tick = useCallback(async () => {
    // Read from store inside callback to avoid stale closures
    const { timeRemaining, setTimeRemaining } = useGameStore.getState();

    const newTime = timeRemaining - 1;
    setTimeRemaining(newTime);

    // Sync to Firebase
    await updateGameStateFields({ timeRemaining: newTime });

    if (newTime <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onTimeUpRef.current();
    }
  }, [updateGameStateFields]);

  useEffect(() => {
    if (!isHost || phase !== 'playing') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHost, phase, tick]);

  return { timeRemaining };
}
