import { useCallback } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

type HapticType = 'tileSelect' | 'wordValid' | 'wordInvalid' | 'gameStart' | 'gameEnd';

// Check if vibration is supported
function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

// Vibration patterns (in milliseconds)
// Array format: [vibrate, pause, vibrate, pause, ...]
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  tileSelect: 3,               // Very light tap
  wordValid: [8, 30, 8],       // Light double pulse (success)
  wordInvalid: [15, 20, 15],   // Light double buzz (error)
  gameStart: [10, 50, 10],     // Light start pattern
  gameEnd: [20],               // Light single buzz
};

export function useHaptics() {
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);

  const vibrate = useCallback((type: HapticType) => {
    if (!hapticsEnabled || !canVibrate()) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration not supported
      console.warn('Vibration failed:', e);
    }
  }, [hapticsEnabled]);

  // Cancel any ongoing vibration
  const cancel = useCallback(() => {
    if (canVibrate()) {
      navigator.vibrate(0);
    }
  }, []);

  return { vibrate, cancel, isSupported: canVibrate() };
}
