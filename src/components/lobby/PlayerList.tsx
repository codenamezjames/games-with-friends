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
      {playerEntries.map(([id, player]) => {
        const isDisconnected = player.isConnected === false;

        return (
          <li
            key={id}
            className={`
              flex items-center justify-between p-3 rounded-lg bg-bg-cell
              ${player.isHost ? 'border-l-4 border-accent' : ''}
              ${player.isReady && !isDisconnected ? 'bg-success/10' : ''}
              ${isDisconnected ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              <span
                className={`w-2 h-2 rounded-full ${
                  isDisconnected ? 'bg-text-muted' : 'bg-success'
                }`}
                title={isDisconnected ? 'Disconnected' : 'Connected'}
              />
              <span className={`font-medium ${isDisconnected ? 'text-text-muted' : 'text-text-primary'}`}>
                {player.name || `Player ${id.slice(0, 6)}`}
              </span>
              {isDisconnected && (
                <span className="text-xs text-text-muted italic">
                  (reconnecting...)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {player.isHost && (
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  isDisconnected ? 'bg-text-muted text-bg-main' : 'bg-accent text-bg-main'
                }`}>
                  Host
                </span>
              )}
              {player.isReady && !isDisconnected && (
                <span className="text-xs bg-success text-white px-2 py-1 rounded font-semibold">
                  Ready
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
