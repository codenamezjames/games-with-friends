import { useEffect, useRef, useState } from 'react';

interface PlayerPanelProps {
  name: string;
  score: number;
  wordCount: number;
  words: string[];
  isLocal: boolean;
}

export function PlayerPanel({
  name,
  wordCount,
  words,
  isLocal,
}: PlayerPanelProps) {
  const prevWordCountRef = useRef(wordCount);
  const prevWordsLengthRef = useRef(words.length);
  const [isPulsing, setIsPulsing] = useState(false);

  // Detect word count changes and trigger pulse animation
  useEffect(() => {
    if (wordCount > prevWordCountRef.current) {
      // Trigger pulse animation
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 400);
    }
    prevWordCountRef.current = wordCount;
  }, [wordCount]);

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
        <span
          className={`text-2xl font-bold text-primary inline-block ${isPulsing ? 'score-pulse' : ''}`}
        >
          {wordCount}
        </span>
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
                  className={`text-sm text-text-secondary ${
                    index >= prevWordsLengthRef.current - 1 && index === words.length - 1
                      ? 'word-item-new'
                      : ''
                  }`}
                >
                  {word}
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
