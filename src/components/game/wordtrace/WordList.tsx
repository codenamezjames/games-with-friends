import { useState } from 'react';
import { getWordPoints } from '@/games/wordtrace/utils';

interface WordListProps {
  words: string[];
}

export function WordList({ words }: WordListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (words.length === 0) {
    return null;
  }

  // Sort words by points (highest first), then alphabetically
  const sortedWords = [...words].sort((a, b) => {
    const pointsDiff = getWordPoints(b) - getWordPoints(a);
    if (pointsDiff !== 0) return pointsDiff;
    return a.localeCompare(b);
  });

  const displayWords = isExpanded ? sortedWords : sortedWords.slice(0, 3);
  const hasMore = sortedWords.length > 3;

  return (
    <div className="bg-bg-card rounded-lg p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <span>Your Words ({words.length})</span>
        {hasMore && (
          <span className="flex items-center gap-1">
            {isExpanded ? (
              <span>Show less ▲</span>
            ) : (
              <span>+{sortedWords.length - 3} more ▼</span>
            )}
          </span>
        )}
      </button>

      <div className={`mt-2 flex flex-wrap gap-1.5 ${isExpanded ? 'max-h-32 overflow-y-auto' : ''}`}>
        {displayWords.map((word) => (
          <span
            key={word}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-main rounded text-sm"
          >
            <span className="text-text-primary">{word}</span>
            <span className="text-accent text-xs">+{getWordPoints(word)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
