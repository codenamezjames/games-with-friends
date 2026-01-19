import { useEffect, useRef, useState } from 'react';
import { getWordPoints } from '@/games/wordtrace/utils';
import type { Player } from '@/types';

interface WordEntry {
  id: string;
  word: string;
  playerId: string;
  playerName: string;
  points: number;
  timestamp: number;
}

interface LiveWordFeedProps {
  foundWords: Record<string, string[]>;
  players: Record<string, Player>;
}

const FEED_DURATION = 3000; // How long each word stays visible (3 seconds)
const MAX_VISIBLE = 3; // Maximum number of words visible at once

export function LiveWordFeed({ foundWords, players }: LiveWordFeedProps) {
  const [visibleWords, setVisibleWords] = useState<WordEntry[]>([]);
  const prevWordsRef = useRef<Record<string, string[]>>({});
  const entryIdRef = useRef(0);

  // Detect new words and add them to the feed
  useEffect(() => {
    const prevWords = prevWordsRef.current;
    const newEntries: WordEntry[] = [];

    // Find newly added words
    Object.entries(foundWords).forEach(([playerId, words]) => {
      const prevPlayerWords = prevWords[playerId] || [];
      const player = players[playerId];
      const playerName = player?.name || `Player ${playerId.slice(0, 6)}`;

      // Find words that weren't in the previous list
      words.forEach((word) => {
        if (!prevPlayerWords.includes(word)) {
          newEntries.push({
            id: `${playerId}-${word}-${++entryIdRef.current}`,
            word,
            playerId,
            playerName,
            points: getWordPoints(word),
            timestamp: Date.now(),
          });
        }
      });
    });

    // Add new entries to visible words
    if (newEntries.length > 0) {
      setVisibleWords((prev) => {
        const combined = [...newEntries, ...prev];
        // Keep only the most recent entries
        return combined.slice(0, MAX_VISIBLE * 2);
      });
    }

    // Update ref for next comparison
    prevWordsRef.current = { ...foundWords };
  }, [foundWords, players]);

  // Remove old entries after duration
  useEffect(() => {
    if (visibleWords.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setVisibleWords((prev) =>
        prev.filter((entry) => now - entry.timestamp < FEED_DURATION)
      );
    }, 500);

    return () => clearInterval(timer);
  }, [visibleWords.length]);

  if (visibleWords.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {visibleWords.slice(0, MAX_VISIBLE).map((entry, index) => {
        const age = Date.now() - entry.timestamp;
        const progress = age / FEED_DURATION;
        const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

        return (
          <div
            key={entry.id}
            className="bg-bg-card/95 backdrop-blur border border-accent/30 rounded-lg px-4 py-2 shadow-lg animate-slide-down"
            style={{
              opacity: opacity * (1 - index * 0.15),
              transform: `scale(${1 - index * 0.05})`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-sm">{entry.playerName}</span>
              <span className="text-text-muted">found</span>
              <span className="font-bold text-lg text-accent">{entry.word}</span>
              <span className="text-success text-sm font-medium">
                +{entry.points}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
