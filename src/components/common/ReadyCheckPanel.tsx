import { useCallback, useEffect, useState, useRef } from 'react';
import { Button } from './Button';
import type { Player } from '@/types';

interface ReadyCheckPanelProps {
  players: Record<string, Player>;
  localPlayerId: string;
  isHost: boolean;
  isSpectator: boolean;
  onReadyChange: (isReady: boolean) => void;
  onStartGame: (markUnreadyAsSpectators: boolean) => void;
}

const TIMEOUT_SECONDS = 30;
const JIGGLE_START_SECONDS = 5;
const AUTO_START_COUNTDOWN = 2;

export function ReadyCheckPanel({
  players,
  localPlayerId,
  isHost,
  isSpectator,
  onReadyChange,
  onStartGame,
}: ReadyCheckPanelProps) {
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_SECONDS);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const hasStartedRef = useRef(false);

  // Get active (non-spectator) players
  const activePlayers = Object.entries(players).filter(
    ([, p]) => !p.isSpectator
  );

  // Check if all players are ready
  const allReady = activePlayers.every(([, p]) => p.readyForRematch);
  const readyCount = activePlayers.filter(([, p]) => p.readyForRematch).length;

  // Check if local player is ready
  const localPlayer = players[localPlayerId];
  const isLocalReady = localPlayer?.readyForRematch ?? false;


  // Handle checkbox toggle
  const handleToggleReady = useCallback(() => {
    if (isSpectator) return;
    onReadyChange(!isLocalReady);
  }, [isLocalReady, isSpectator, onReadyChange]);

  // Main countdown timer
  useEffect(() => {
    if (autoStartCountdown !== null) return; // Don't tick main timer during auto-start

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoStartCountdown]);

  // Handle all ready - start auto-start countdown
  useEffect(() => {
    if (allReady && activePlayers.length > 0 && autoStartCountdown === null && !hasStartedRef.current) {
      setAutoStartCountdown(AUTO_START_COUNTDOWN);
    }
  }, [allReady, activePlayers.length, autoStartCountdown]);

  // Handle timeout - start game with unready as spectators (host only)
  useEffect(() => {
    if (timeRemaining === 0 && isHost && !hasStartedRef.current) {
      hasStartedRef.current = true;
      onStartGame(true); // Mark unready players as spectators
    }
  }, [timeRemaining, isHost, onStartGame]);

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
          const showJiggle = !isReady && timeRemaining <= JIGGLE_START_SECONDS;

          return (
            <div
              key={playerId}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isLocal ? 'bg-primary/20 ring-1 ring-primary' : 'bg-bg-cell/50'
              } ${showJiggle ? 'jiggle' : ''}`}
            >
              <label
                className={`flex items-center gap-3 flex-1 ${
                  isLocal && !isSpectator ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isReady}
                  onChange={isLocal && !isSpectator ? handleToggleReady : undefined}
                  disabled={!isLocal || isSpectator}
                  className={`w-5 h-5 rounded accent-primary ${
                    isLocal && !isSpectator ? 'cursor-pointer' : 'cursor-default'
                  }`}
                />
                <span className="text-text-primary font-medium">
                  {player.name}
                  {isLocal && <span className="text-xs text-text-muted ml-1">(You)</span>}
                </span>
              </label>
              {isReady && (
                <span className="text-success text-sm">Ready</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center mb-4">
        {autoStartCountdown !== null ? (
          <div className="text-xl font-bold text-success animate-pulse">
            Starting in {autoStartCountdown}...
          </div>
        ) : (
          <>
            <div className="text-text-muted text-sm mb-1">
              {readyCount} of {activePlayers.length} ready
            </div>
            <div className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-error' : 'text-text-secondary'}`}>
              {timeRemaining}s remaining
            </div>
          </>
        )}
      </div>

      {/* Host controls */}
      {isHost && !allReady && timeRemaining > 0 && autoStartCountdown === null && (
        <Button
          variant="secondary"
          onClick={handleStartAnyway}
          className="w-full text-sm"
        >
          Start Anyway (unready become spectators)
        </Button>
      )}

      {/* Spectator message */}
      {isSpectator && (
        <p className="text-center text-text-muted text-sm">
          Waiting for players to ready up...
        </p>
      )}
    </div>
  );
}
