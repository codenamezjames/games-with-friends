import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useRoom } from './useRoom';

export function useGameTimer(onTimeUp: () => void) {
  const { isHost } = useRoomStore();
  const { phase, timeRemaining, setTimeRemaining } = useGameStore();
  const { updateGameStateFields } = useRoom();
  const intervalRef = useRef<number | null>(null);

  const tick = useCallback(async () => {
    const newTime = timeRemaining - 1;
    setTimeRemaining(newTime);

    // Sync to Firebase
    await updateGameStateFields({ timeRemaining: newTime });

    if (newTime <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onTimeUp();
    }
  }, [timeRemaining, setTimeRemaining, updateGameStateFields, onTimeUp]);

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
