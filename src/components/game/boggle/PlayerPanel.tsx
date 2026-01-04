import { useEffect, useRef, useState } from 'react';
import { getWordPoints } from '@/games/boggle/utils';

interface PlayerPanelProps {
  name: string;
  score: number;
  wordCount: number;
  words: string[];
  isLocal: boolean;
}

interface FloatingPoint {
  id: number;
  points: number;
}

export function PlayerPanel({
  name,
  score,
  wordCount,
  words,
  isLocal,
}: PlayerPanelProps) {
  const prevScoreRef = useRef(score);
  const prevWordsLengthRef = useRef(words.length);
  const [isPulsing, setIsPulsing] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const idCounterRef = useRef(0);

  // Detect score changes and trigger animations
  useEffect(() => {
    if (score > prevScoreRef.current) {
      const pointsGained = score - prevScoreRef.current;

      // Trigger pulse animation
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 400);

      // Add floating points
      const newId = idCounterRef.current++;
      setFloatingPoints((prev) => [...prev, { id: newId, points: pointsGained }]);

      // Remove floating point after animation
      setTimeout(() => {
        setFloatingPoints((prev) => prev.filter((fp) => fp.id !== newId));
      }, 800);
    }
    prevScoreRef.current = score;
  }, [score]);

  // Track new words for slide-in animation
  useEffect(() => {
    prevWordsLengthRef.current = words.length;
  }, [words.length]);

  return (
    <div
      className={`
        bg-bg-card rounded-[var(--radius-default)] p-4 flex flex-col
        ${isLocal ? 'border-l-4 border-primary' : 'border-l-4 border-accent'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-text-primary truncate">
          {name}
          {isLocal && (
            <span className="text-xs text-text-muted ml-2">(You)</span>
          )}
        </span>
        <div className="relative">
          <span
            className={`text-2xl font-bold text-primary inline-block ${isPulsing ? 'score-pulse' : ''}`}
          >
            {score}
          </span>
          {/* Floating points */}
          {floatingPoints.map((fp) => (
            <span
              key={fp.id}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-success font-bold float-points"
            >
              +{fp.points}
            </span>
          ))}
        </div>
      </div>

      {/* Word list or word count */}
      {isLocal ? (
        <div className="flex-1 overflow-y-auto max-h-48">
          {words.length === 0 ? (
            <p className="text-text-muted text-sm italic">
              Trace letters to find words
            </p>
          ) : (
            <ul className="space-y-1">
              {words.map((word, index) => (
                <li
                  key={index}
                  className={`text-sm text-text-secondary flex justify-between ${
                    index >= prevWordsLengthRef.current - 1 && index === words.length - 1
                      ? 'word-item-new'
                      : ''
                  }`}
                >
                  <span>{word}</span>
                  <span className="text-success">+{getWordPoints(word)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <span
            className={`text-3xl font-bold text-text-primary inline-block ${isPulsing ? 'score-pulse' : ''}`}
          >
            {wordCount}
          </span>
          <span className="block text-text-muted text-sm">words found</span>
        </div>
      )}
    </div>
  );
}
