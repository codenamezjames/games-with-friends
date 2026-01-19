import { useMemo } from 'react';
import { useRoomStore } from '@/stores/useRoomStore';
import { DURATION_OPTIONS, GRID_SIZE_OPTIONS, TEST_DURATION_OPTION } from '@/types';

export function GameSettings() {
  const { gameSettings, setGameSettings, players, playerId } = useRoomStore();

  // Get local player's name
  const localPlayerName = playerId ? players[playerId]?.name : null;

  // Show test duration option on localhost (for e2e tests) or if player name is "jamez"
  const durationOptions = useMemo(() => {
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isJamez = localPlayerName?.toLowerCase() === 'jamez';
    return (isLocalhost || isJamez) ? [TEST_DURATION_OPTION, ...DURATION_OPTIONS] : DURATION_OPTIONS;
  }, [localPlayerName]);

  return (
    <div className="mb-6 pt-4 border-t border-white/10">
      <h3 className="text-lg font-semibold text-text-primary mb-3">
        Game Settings
      </h3>

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-sm text-text-muted mb-2">Duration</label>
        <div className="flex gap-2">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setGameSettings({ duration: option.value })}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  gameSettings.duration === option.value
                    ? 'bg-primary text-white'
                    : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Size */}
      <div>
        <label className="block text-sm text-text-muted mb-2">Grid Size</label>
        <div className="flex gap-2">
          {GRID_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setGameSettings({ gridSize: option.value })}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  gameSettings.gridSize === option.value
                    ? 'bg-primary text-white'
                    : 'bg-bg-cell text-text-secondary hover:bg-bg-cell-hover'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
