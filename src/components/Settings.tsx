import { useSettingsStore } from '@/stores/useSettingsStore';
import { useRoomStore } from '@/stores/useRoomStore';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { playerName, setPlayerName } = useRoomStore();
  const { soundEnabled, hapticsEnabled, toggleSound, toggleHaptics } = useSettingsStore();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Player Name */}
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-text-muted mb-2">
              Player Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-bg-cell border-none rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-text-primary font-medium">Sound Effects</span>
              <p className="text-sm text-text-muted">Play sounds for game events</p>
            </div>
            <button
              onClick={toggleSound}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                soundEnabled ? 'bg-primary' : 'bg-bg-cell'
              }`}
              aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-text-primary font-medium">Haptic Feedback</span>
              <p className="text-sm text-text-muted">Vibrate on interactions</p>
            </div>
            <button
              onClick={toggleHaptics}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                hapticsEnabled ? 'bg-primary' : 'bg-bg-cell'
              }`}
              aria-label={hapticsEnabled ? 'Disable haptics' : 'Enable haptics'}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
