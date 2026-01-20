import { useState } from 'react';

interface WordListProps {
  words: string[];
}

export function WordList({ words }: WordListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (words.length === 0) {
    return null;
  }

  // Sort words by length (longest first), then alphabetically
  const sortedWords = [...words].sort((a, b) => {
    const lenDiff = b.length - a.length;
    if (lenDiff !== 0) return lenDiff;
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
            className="px-2 py-0.5 bg-bg-main rounded text-sm text-text-primary"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
