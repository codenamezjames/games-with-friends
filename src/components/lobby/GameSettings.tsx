import { useRoomStore } from '@/stores/useRoomStore';
import { DURATION_OPTIONS, GRID_SIZE_OPTIONS } from '@/types';

export function GameSettings() {
  const { gameSettings, setGameSettings } = useRoomStore();

  return (
    <div className="mb-6 pt-4 border-t border-white/10">
      <h3 className="text-lg font-semibold text-text-primary mb-3">
        Game Settings
      </h3>

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-sm text-text-muted mb-2">Duration</label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((option) => (
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
