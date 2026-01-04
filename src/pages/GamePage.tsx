import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoggleBoard } from '@/components/game/boggle/BoggleBoard';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useGameListeners } from '@/hooks/useGameListeners';
import { useRoom } from '@/hooks/useRoom';

export function GamePage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomCode, playerId } = useRoomStore();
  const { grid } = useGameStore();
  const { rejoinRoom } = useRoom();
  const [isRejoining, setIsRejoining] = useState(true);
  const [rejoinFailed, setRejoinFailed] = useState(false);

  // Set up game listeners - this must run before checking grid
  // so guests can receive the game state from Firebase
  useGameListeners();

  // Try to rejoin the room on mount (handles page refresh)
  useEffect(() => {
    const attemptRejoin = async () => {
      console.log('[GamePage] Attempting rejoin', { roomCode, playerId });
      // If we have persisted room state, try to rejoin
      if (roomCode && playerId) {
        const success = await rejoinRoom();
        console.log('[GamePage] Rejoin result:', success);
        if (!success) {
          setRejoinFailed(true);
        }
      }
      setIsRejoining(false);
    };

    attemptRejoin();
  }, []); // Only run on mount

  // Redirect if no room code or rejoin failed
  useEffect(() => {
    if (!isRejoining) {
      if ((!roomCode && !urlRoomCode) || rejoinFailed) {
        navigate('/');
      }
    }
  }, [roomCode, urlRoomCode, navigate, isRejoining, rejoinFailed]);

  // Show loading while rejoining or waiting for grid
  console.log('[GamePage] Render state', { isRejoining, gridLength: grid.length, roomCode });
  if (isRejoining || grid.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted text-lg">
          {isRejoining ? 'Reconnecting...' : 'Loading game...'}
        </div>
      </div>
    );
  }

  return <BoggleBoard />;
}
