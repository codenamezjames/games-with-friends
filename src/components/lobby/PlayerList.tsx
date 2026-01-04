import type { Player } from '@/types';

interface PlayerListProps {
  players: Record<string, Player>;
}

export function PlayerList({ players }: PlayerListProps) {
  const playerEntries = Object.entries(players);

  if (playerEntries.length === 0) {
    return (
      <ul className="list-none p-0 m-0">
        <li className="flex items-center justify-between p-3 rounded-lg bg-bg-cell text-text-muted animate-pulse">
          Waiting for players...
        </li>
      </ul>
    );
  }

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-2">
      {playerEntries.map(([id, player]) => (
        <li
          key={id}
          className={`
            flex items-center justify-between p-3 rounded-lg bg-bg-cell
            ${player.isHost ? 'border-l-4 border-accent' : ''}
            ${player.isReady ? 'bg-success/10' : ''}
          `}
        >
          <span className="text-text-primary font-medium">{player.name}</span>
          <div className="flex gap-2">
            {player.isHost && (
              <span className="text-xs bg-accent text-bg-main px-2 py-1 rounded font-semibold">
                Host
              </span>
            )}
            {player.isReady && (
              <span className="text-xs bg-success text-white px-2 py-1 rounded font-semibold">
                Ready
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
