import { useCallback, useRef } from 'react';

type HapticType = 'tileSelect' | 'wordValid' | 'wordInvalid' | 'gameStart' | 'gameEnd';

// Check if vibration is supported
function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

// Vibration patterns (in milliseconds)
// Array format: [vibrate, pause, vibrate, pause, ...]
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  tileSelect: 10,              // Quick tap
  wordValid: [30, 50, 30],     // Double pulse (success)
  wordInvalid: [100, 30, 100], // Two longer buzzes (error)
  gameStart: [50, 100, 50, 100, 100], // Ascending pattern
  gameEnd: [200],              // Single long buzz
};

export function useHaptics() {
  const enabledRef = useRef(true);

  const vibrate = useCallback((type: HapticType) => {
    if (!enabledRef.current || !canVibrate()) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration not supported
      console.warn('Vibration failed:', e);
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  // Cancel any ongoing vibration
  const cancel = useCallback(() => {
    if (canVibrate()) {
      navigator.vibrate(0);
    }
  }, []);

  return { vibrate, setEnabled, cancel, isSupported: canVibrate() };
}
