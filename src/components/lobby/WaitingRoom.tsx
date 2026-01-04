import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { PlayerList } from './PlayerList';
import { GameSettings } from './GameSettings';
import { useRoom } from '@/hooks/useRoom';
import { useRoomListeners } from '@/hooks/useRoomListeners';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { generateGrid } from '@/games/boggle/utils';

export function WaitingRoom() {
  const navigate = useNavigate();
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const { leaveRoom, setReady, startGame, updateGameState } = useRoom();
  const { roomCode, isHost, players, gameSettings } = useRoomStore();
  const { setGrid, setGridSize, setDuration, setPhase, setStartTime, setTimeRemaining } =
    useGameStore();

  const [isStarting, setIsStarting] = useState(false);

  // Set up room listeners
  useRoomListeners();

  // Generate share URL
  const shareUrl = `${window.location.origin}/lobby?room=${roomCode || urlRoomCode}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode || urlRoomCode || '');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/');
  };

  const handleReadyToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setReady(e.target.checked);
  };

  const handleStartGame = async () => {
    const playerCount = Object.keys(players).length;
    const allReady = Object.values(players).every((p) => p.isReady);

    if (playerCount < 2 || !allReady) return;

    setIsStarting(true);

    try {
      // Generate grid with settings
      const { duration, gridSize } = gameSettings;
      const grid = generateGrid(gridSize);
      const startTime = Date.now() + 3000; // 3 second countdown

      // Set local state
      setGrid(grid);
      setGridSize(gridSize);
      setDuration(duration);
      setTimeRemaining(duration);
      setPhase('countdown');
      setStartTime(startTime);

      // Initialize scores for all players
      const scores: Record<string, number> = {};
      const wordCounts: Record<string, number> = {};
      const foundWords: Record<string, string[]> = {};

      Object.keys(players).forEach((playerId) => {
        scores[playerId] = 0;
        wordCounts[playerId] = 0;
        foundWords[playerId] = [];
      });

      const initialState = {
        grid,
        gridSize,
        timeRemaining: duration,
        duration,
        phase: 'countdown',
        startTime,
        scores,
        wordCounts,
        foundWords,
      };

      await startGame(initialState);
      await updateGameState(initialState);
    } catch (err) {
      console.error('Failed to start game:', err);
      setIsStarting(false);
    }
  };

  // Check if we can start
  const playerCount = Object.keys(players).length;
  const allReady = Object.values(players).every((p) => p.isReady);
  const canStart = playerCount >= 2 && allReady;

  const startHint =
    playerCount < 2
      ? 'Waiting for opponent to join...'
      : !allReady
        ? 'Waiting for everyone to ready up...'
        : 'Ready to start!';

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-bg-card rounded-[var(--radius-default)] p-10 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-center text-text-primary mb-6">
          Waiting Room
        </h2>

        {/* Room Code */}
        <div className="text-center mb-6">
          <span className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Room Code
          </span>
          <span className="block text-4xl font-mono font-bold text-primary tracking-widest mb-2">
            {roomCode || urlRoomCode}
          </span>
          <Button variant="link" onClick={copyCode}>
            Copy Code
          </Button>
        </div>

        {/* Share Link */}
        <div className="mb-6 pt-4 border-t border-white/10">
          <span className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Share Link
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-bg-cell border-none rounded-lg text-text-primary text-sm focus:outline-none"
            />
            <Button variant="secondary" onClick={copyLink}>
              Copy
            </Button>
          </div>
        </div>

        {/* Players */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Players
          </h3>
          <PlayerList players={players} />
        </div>

        {/* Game Settings - Host only */}
        {isHost && <GameSettings />}

        {/* Actions */}
        {isHost ? (
          <>
            <Button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className="w-full mb-2"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </Button>
            <p className="text-center text-text-muted text-sm">{startHint}</p>
          </>
        ) : (
          <div className="text-center mb-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                onChange={handleReadyToggle}
                className="w-5 h-5 accent-primary"
              />
              <span className="text-text-primary font-medium">I'm Ready!</span>
            </label>
            <p className="text-text-muted text-sm mt-2">
              Toggle ready when you're set to play
            </p>
          </div>
        )}

        <Button variant="link" onClick={handleLeave} className="w-full mt-4">
          Leave Room
        </Button>
      </div>
    </div>
  );
}
