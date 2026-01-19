import { useEffect, useState, useRef } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface CountdownProps {
  startTime: number;
  onComplete: () => void;
}

export function Countdown({ startTime, onComplete }: CountdownProps) {
  const [display, setDisplay] = useState<string>('3');
  const [isVisible, setIsVisible] = useState(true);
  const lastBeepRef = useRef<number>(0);
  const hasCompletedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const { play } = useSoundEffects();

  useEffect(() => {
    hasCompletedRef.current = false;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.ceil((startTime - now) / 1000);

      if (remaining > 0) {
        // Play beep on each second change
        if (remaining !== lastBeepRef.current && remaining <= 3) {
          lastBeepRef.current = remaining;
          play('countdown');
        }
        setDisplay(remaining.toString());
        rafRef.current = requestAnimationFrame(updateCountdown);
      } else if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (remaining === 0) {
          setDisplay('GO!');
          setTimeout(() => {
            setIsVisible(false);
            onComplete();
          }, 500);
        } else {
          setIsVisible(false);
          onComplete();
        }
      }
    };

    rafRef.current = requestAnimationFrame(updateCountdown);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startTime, onComplete, play]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg-main/90 z-50 rounded-lg">
      <span
        className="text-8xl font-bold text-accent animate-pulse"
        style={{
          textShadow: '0 0 40px var(--color-accent-glow)',
        }}
      >
        {display}
      </span>
    </div>
  );
}
