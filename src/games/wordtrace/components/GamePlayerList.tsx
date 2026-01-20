import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  score: number;
  wordCount: number;
  isLocal: boolean;
  isSpectator?: boolean;
  isConnected?: boolean;
}

interface GamePlayerListProps {
  players: Player[];
}

export function GamePlayerList({ players }: GamePlayerListProps) {
  const prevWordCountsRef = useRef<Record<string, number>>({});
  const [pulsingPlayers, setPulsingPlayers] = useState<Set<string>>(new Set());

  // Detect word count changes and trigger pulse animations
  useEffect(() => {
    players.forEach((player) => {
      const prevWordCount = prevWordCountsRef.current[player.id] || 0;
      if (player.wordCount > prevWordCount) {
        // Trigger pulse animation
        setPulsingPlayers((prev) => new Set(prev).add(player.id));
        setTimeout(() => {
          setPulsingPlayers((prev) => {
            const next = new Set(prev);
            next.delete(player.id);
            return next;
          });
        }, 400);
      }
      prevWordCountsRef.current[player.id] = player.wordCount;
    });
  }, [players]);

  // Sort players by word count descending
  const sortedPlayers = [...players].sort((a, b) => b.wordCount - a.wordCount);

  return (
    <div className="bg-bg-card rounded-[var(--radius-default)] p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        Players
      </h3>
      <ul className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const isPulsing = pulsingPlayers.has(player.id);
          const isDisconnected = player.isConnected === false;

          return (
            <li
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                player.isLocal
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'bg-bg-cell'
              } ${isDisconnected ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-text-muted text-sm font-mono w-4">
                  {index + 1}.
                </span>
                {/* Connection status indicator */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isDisconnected ? 'bg-text-muted' : 'bg-success'
                  }`}
                  title={isDisconnected ? 'Disconnected' : 'Connected'}
                />
                <span className={`font-medium truncate ${isDisconnected ? 'text-text-muted' : 'text-text-primary'}`}>
                  {player.name}
                  {player.isLocal && (
                    <span className="text-xs text-text-muted ml-1">(You)</span>
                  )}
                  {player.isSpectator && (
                    <span className="text-xs text-accent ml-1">(Watching)</span>
                  )}
                  {isDisconnected && (
                    <span className="text-xs text-text-muted ml-1 italic">(offline)</span>
                  )}
                </span>
              </div>
              <span
                className={`text-lg font-bold text-primary min-w-[2rem] text-right inline-block ${
                  isPulsing ? 'score-pulse' : ''
                }`}
              >
                {player.wordCount}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
