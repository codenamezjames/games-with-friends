import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Button } from './Button';
import { useRoomStore } from '@/stores/useRoomStore';
import { useRoom } from '@/hooks/useRoom';
import { DURATION_OPTIONS, GRID_SIZE_OPTIONS, TEST_DURATION_OPTION } from '@/types';
import type { Player } from '@/types';

interface ReadyCheckPanelProps {
  players: Record<string, Player>;
  localPlayerId: string;
  isHost: boolean;
  isSpectator: boolean;
  onReadyChange: (isReady: boolean) => void;
  onStartGame: (markUnreadyAsSpectators: boolean) => void;
}

const HOST_START_ANYWAY_DELAY = 10; // Host can start anyway after 10 seconds
const AUTO_START_COUNTDOWN = 2;

export function ReadyCheckPanel({
  players,
  localPlayerId,
  isHost,
  isSpectator,
  onReadyChange,
  onStartGame,
}: ReadyCheckPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const hasStartedRef = useRef(false);
  const hasTriggeredCountdownRef = useRef(false);

  const { gameSettings, players: storePlayers, playerId } = useRoomStore();
  const { updateGameSettings } = useRoom();

  // Get local player's name for test duration option
  const localPlayerName = playerId ? storePlayers[playerId]?.name : null;

  // Show test duration option on localhost or if player name is "jamez"
  const durationOptions = useMemo(() => {
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isJamez = localPlayerName?.toLowerCase() === 'jamez';
    return (isLocalhost || isJamez) ? [TEST_DURATION_OPTION, ...DURATION_OPTIONS] : DURATION_OPTIONS;
  }, [localPlayerName]);

  // Get active (non-spectator, connected) players
  // Filter out disconnected players so they don't block ready check
  const activePlayers = Object.entries(players).filter(
    ([, p]) => !p.isSpectator && p.isConnected !== false
  );

  // Get spectators who might want to join the next game
  const spectators = Object.entries(players).filter(
    ([, p]) => p.isSpectator && p.isConnected !== false
  );

  // Check if all players are ready
  const allReady = activePlayers.every(([, p]) => p.readyForRematch);
  const readyCount = activePlayers.filter(([, p]) => p.readyForRematch).length;

  // Check if local player is ready
  const localPlayer = players[localPlayerId];
  const isLocalReady = localPlayer?.readyForRematch ?? false;


  // Handle checkbox toggle (spectators can also toggle to join the game)
  const handleToggleReady = useCallback(() => {
    // If spectator clicks, they're joining - always set to true
    if (isSpectator) {
      onReadyChange(true);
      return;
    }
    onReadyChange(!isLocalReady);
  }, [isLocalReady, isSpectator, onReadyChange]);

  // Elapsed time counter (for showing "Start Anyway" after delay)
  useEffect(() => {
    if (autoStartCountdown !== null) return; // Don't tick during auto-start

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [autoStartCountdown]);

  // Handle all ready - start auto-start countdown
  useEffect(() => {
    if (allReady && activePlayers.length > 0 && !hasTriggeredCountdownRef.current && !hasStartedRef.current) {
      hasTriggeredCountdownRef.current = true;
      setAutoStartCountdown(AUTO_START_COUNTDOWN);
    }
    // Reset when conditions change
    if (!allReady || activePlayers.length === 0) {
      hasTriggeredCountdownRef.current = false;
    }
  }, [allReady, activePlayers.length]);

  // Auto-start countdown timer
  useEffect(() => {
    if (autoStartCountdown === null) return;

    if (autoStartCountdown <= 0 && isHost && !hasStartedRef.current) {
      hasStartedRef.current = true;
      onStartGame(false); // All ready, no spectators needed
      return;
    }

    const timer = setTimeout(() => {
      setAutoStartCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoStartCountdown, isHost, onStartGame]);

  // Handle "Start Anyway" click (host only)
  const handleStartAnyway = useCallback(() => {
    if (!isHost || hasStartedRef.current) return;
    hasStartedRef.current = true;
    onStartGame(true); // Mark unready players as spectators
  }, [isHost, onStartGame]);

  return (
    <div className="bg-bg-card/50 backdrop-blur rounded-xl p-6 w-full max-w-sm">
      <h3 className="text-lg font-bold text-text-primary mb-4 text-center">
        Ready for Rematch?
      </h3>

      {/* Player list with checkboxes */}
      <div className="space-y-2 mb-4">
        {activePlayers.map(([playerId, player]) => {
          const isLocal = playerId === localPlayerId;
          const isReady = player.readyForRematch ?? false;
          const isDisconnected = player.isConnected === false;

          return (
            <div
              key={playerId}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isLocal ? 'bg-primary/20 ring-1 ring-primary' : 'bg-bg-cell/50'
              } ${isDisconnected ? 'opacity-50' : ''}`}
            >
              <label
                className={`flex items-center gap-3 flex-1 ${
                  isLocal && !isSpectator ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Connection status indicator */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isDisconnected ? 'bg-text-muted' : 'bg-success'
                  }`}
                  title={isDisconnected ? 'Disconnected' : 'Connected'}
                />
                <input
                  type="checkbox"
                  checked={isReady}
                  onChange={isLocal && !isSpectator ? handleToggleReady : undefined}
                  disabled={!isLocal || isSpectator}
                  className={`w-5 h-5 rounded accent-primary ${
                    isLocal && !isSpectator ? 'cursor-pointer' : 'cursor-default'
                  }`}
                />
                <span className={`font-medium ${isDisconnected ? 'text-text-muted' : 'text-text-primary'}`}>
                  {player.name}
                  {isLocal && <span className="text-xs text-text-muted ml-1">(You)</span>}
                  {isDisconnected && (
                    <span className="text-xs text-text-muted italic ml-1">(reconnecting...)</span>
                  )}
                </span>
              </label>
              {isReady && !isDisconnected && (
                <span className="text-success text-sm">Ready</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Settings - visible to all, only host can edit */}
      <div className="mb-4 pt-3 border-t border-white/10">
        <h4 className="text-sm font-medium text-text-muted mb-2">
          Next Round Settings
          {!isHost && <span className="text-xs text-text-muted font-normal ml-1">(Host controls)</span>}
        </h4>

        {/* Duration */}
        <div className="mb-3">
          <label className="block text-xs text-text-muted mb-1">Duration</label>
          <div className="flex gap-1">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                disabled={!isHost}
                onClick={() => isHost && updateGameSettings({ duration: option.value })}
                className={`
                  flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    gameSettings.duration === option.value
                      ? 'bg-primary text-white'
                      : 'bg-bg-cell text-text-secondary'
                  }
                  ${!isHost ? 'cursor-default opacity-80' : 'hover:bg-bg-cell-hover'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Size */}
        <div>
          <label className="block text-xs text-text-muted mb-1">Grid Size</label>
          <div className="flex gap-1">
            {GRID_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                disabled={!isHost}
                onClick={() => isHost && updateGameSettings({ gridSize: option.value })}
                className={`
                  flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    gameSettings.gridSize === option.value
                      ? 'bg-primary text-white'
                      : 'bg-bg-cell text-text-secondary'
                  }
                  ${!isHost ? 'cursor-default opacity-80' : 'hover:bg-bg-cell-hover'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Play Again button for non-spectators who aren't ready yet */}
      {!isSpectator && !isLocalReady && (
        <Button
          variant="primary"
          onClick={handleToggleReady}
          className="w-full mb-4"
        >
          Play Again
        </Button>
      )}

      {/* Status message */}
      <div className="text-center mb-4">
        {autoStartCountdown !== null ? (
          <div className="text-xl font-bold text-success animate-pulse">
            Starting in {autoStartCountdown}...
          </div>
        ) : (
          <div className="text-text-muted text-sm">
            {readyCount} of {activePlayers.length} ready
          </div>
        )}
      </div>

      {/* Host controls - show "Start Anyway" after delay if not all ready */}
      {isHost && !allReady && elapsedSeconds >= HOST_START_ANYWAY_DELAY && autoStartCountdown === null && (
        <Button
          variant="secondary"
          onClick={handleStartAnyway}
          className="w-full text-sm"
        >
          Start Anyway (unready become spectators)
        </Button>
      )}

      {/* Spectator section - shows spectators and lets them join */}
      {spectators.length > 0 && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <h4 className="text-sm font-medium text-text-muted mb-2">
            Watching ({spectators.length})
          </h4>
          <div className="space-y-2">
            {spectators.map(([playerId, player]) => {
              const isLocal = playerId === localPlayerId;
              return (
                <div
                  key={playerId}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isLocal ? 'bg-primary/20 ring-1 ring-primary' : 'bg-bg-cell/30'
                  }`}
                >
                  {isLocal ? (
                    <button
                      onClick={handleToggleReady}
                      className="flex-1 text-left px-3 py-1 bg-primary/30 hover:bg-primary/50 rounded text-primary font-medium text-sm transition-colors"
                    >
                      Join Next Game
                    </button>
                  ) : (
                    <span className="text-text-muted text-sm">{player.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spectator message - only show if spectator hasn't joined yet */}
      {isSpectator && !spectators.some(([id]) => id === localPlayerId) && (
        <p className="text-center text-text-muted text-sm">
          Waiting for players to ready up...
        </p>
      )}
    </div>
  );
}
