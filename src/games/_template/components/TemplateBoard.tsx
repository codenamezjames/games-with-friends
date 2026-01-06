/**
 * [GAME_NAME] Board Component
 *
 * Main game board component rendered during gameplay.
 * This is where players interact with your game.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useGameStore } from '@/stores/useGameStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { useRoom } from '@/hooks/useRoom';
import { getGamePaths } from '@/games/registry';

export function TemplateBoard() {
  const navigate = useNavigate();
  const { phase, timeRemaining, scores, gameType } = useGameStore();
  const { players, playerId } = useRoomStore();
  const { submitAction } = useRoom();

  // Format timer display
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Get current player's score
  const myScore = playerId ? scores[playerId] ?? 0 : 0;

  // Example action handler
  const handleAction = useCallback(async () => {
    // Submit an action to Firebase
    await submitAction('example_action', {
      // Your action payload
    });
  }, [submitAction]);

  // Handle game end navigation
  const handleGameEnd = useCallback(() => {
    const paths = getGamePaths(gameType);
    navigate(paths.results);
  }, [navigate, gameType]);

  // Show countdown overlay
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-6xl font-bold text-primary animate-pulse">
          Get Ready!
        </div>
      </div>
    );
  }

  // Show game over state
  if (phase === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-4xl font-bold text-primary">Game Over!</h2>
        <p className="text-2xl text-text-secondary">Your score: {myScore}</p>
        <Button onClick={handleGameEnd}>See Results</Button>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header with timer */}
      <header className="text-center mb-4">
        <div
          className={`text-4xl font-mono font-bold ${
            timeRemaining <= 10 ? 'text-error animate-pulse' : 'text-text-primary'
          }`}
        >
          {timerDisplay}
        </div>
        <div className="text-lg text-text-secondary">Score: {myScore}</div>
      </header>

      {/* Game content area */}
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-center text-text-muted">
          <p>Your game content goes here!</p>
          <p className="text-sm mt-2">
            Replace this with your game's interactive elements.
          </p>
        </div>

        <Button onClick={handleAction}>Example Action</Button>
      </main>

      {/* Player list */}
      <footer className="mt-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(players).map(([id, player]) => (
            <div
              key={id}
              className={`px-3 py-1 rounded-full text-sm ${
                id === playerId
                  ? 'bg-primary text-bg-main'
                  : 'bg-bg-cell text-text-secondary'
              }`}
            >
              {player.name}: {scores[id] ?? 0}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
