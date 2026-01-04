import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  score: number;
  wordCount: number;
  isLocal: boolean;
}

interface GamePlayerListProps {
  players: Player[];
}

interface FloatingPoint {
  id: number;
  playerId: string;
  points: number;
}

export function GamePlayerList({ players }: GamePlayerListProps) {
  const prevScoresRef = useRef<Record<string, number>>({});
  const [pulsingPlayers, setPulsingPlayers] = useState<Set<string>>(new Set());
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const idCounterRef = useRef(0);

  // Detect score changes and trigger animations
  useEffect(() => {
    players.forEach((player) => {
      const prevScore = prevScoresRef.current[player.id] || 0;
      if (player.score > prevScore) {
        const pointsGained = player.score - prevScore;

        // Trigger pulse animation
        setPulsingPlayers((prev) => new Set(prev).add(player.id));
        setTimeout(() => {
          setPulsingPlayers((prev) => {
            const next = new Set(prev);
            next.delete(player.id);
            return next;
          });
        }, 400);

        // Add floating points
        const newId = idCounterRef.current++;
        setFloatingPoints((prev) => [
          ...prev,
          { id: newId, playerId: player.id, points: pointsGained },
        ]);

        // Remove floating point after animation
        setTimeout(() => {
          setFloatingPoints((prev) => prev.filter((fp) => fp.id !== newId));
        }, 800);
      }
      prevScoresRef.current[player.id] = player.score;
    });
  }, [players]);

  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-bg-card rounded-[var(--radius-default)] p-3">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        Players
      </h3>
      <ul className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const playerFloatingPoints = floatingPoints.filter(
            (fp) => fp.playerId === player.id
          );
          const isPulsing = pulsingPlayers.has(player.id);

          return (
            <li
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                player.isLocal
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'bg-bg-cell'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-text-muted text-sm font-mono w-4">
                  {index + 1}.
                </span>
                <span className="font-medium text-text-primary truncate">
                  {player.name}
                  {player.isLocal && (
                    <span className="text-xs text-text-muted ml-1">(You)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {player.wordCount} {player.wordCount === 1 ? 'word' : 'words'}
                </span>
                <div className="relative">
                  <span
                    className={`text-lg font-bold text-primary min-w-[2rem] text-right inline-block ${
                      isPulsing ? 'score-pulse' : ''
                    }`}
                  >
                    {player.score}
                  </span>
                  {playerFloatingPoints.map((fp) => (
                    <span
                      key={fp.id}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-success text-sm font-bold float-points"
                    >
                      +{fp.points}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
