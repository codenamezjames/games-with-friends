import { useEffect, useState, useRef } from 'react';
import { useLocalGameStore } from '@/stores/useLocalGameStore';

export function Feedback() {
  const { lastFeedback, setFeedback } = useLocalGameStore();
  const [visible, setVisible] = useState(false);
  const wasShownRef = useRef(false);

  // Show feedback when new feedback arrives
  useEffect(() => {
    if (!lastFeedback) return;
    wasShownRef.current = true;
    setVisible(true);
    const hideTimer = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(hideTimer);
  }, [lastFeedback]);

  // Clear feedback after fade out (only if it was actually shown)
  useEffect(() => {
    if (!visible && lastFeedback && wasShownRef.current) {
      wasShownRef.current = false;
      const clearTimer = setTimeout(() => setFeedback(null), 200);
      return () => clearTimeout(clearTimer);
    }
  }, [visible, lastFeedback, setFeedback]);

  if (!lastFeedback) return null;

  const colorClass =
    lastFeedback.type === 'success' ? 'text-success' : 'text-error';

  return (
    <div
      className={`
        h-8 flex items-center justify-center
        transition-opacity duration-200
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <span className={`text-lg font-semibold ${colorClass}`}>
        {lastFeedback.message}
      </span>
    </div>
  );
}
