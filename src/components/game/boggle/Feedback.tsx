import { useEffect, useState } from 'react';
import { useLocalGameStore } from '@/stores/useLocalGameStore';

export function Feedback() {
  const { lastFeedback, setFeedback } = useLocalGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastFeedback) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setFeedback(null), 200);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lastFeedback, setFeedback]);

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
