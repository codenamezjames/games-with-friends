import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { BoggleBoard } from '@/components/game/boggle/BoggleBoard';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { useLocalGameStore } from '@/stores/useLocalGameStore';
import { useGameListeners } from '@/hooks/useGameListeners';
import { useRoom } from '@/hooks/useRoom';
import type { Player } from '@/types';

export function GamePage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { roomCode, playerId, setPlayers } = useRoomStore();
  const { grid, phase, resetGame } = useGameStore();
  const { reset: resetLocalGame } = useLocalGameStore();
  const { rejoinRoom } = useRoom();
  const [isRejoining, setIsRejoining] = useState(true);
  const [rejoinFailed, setRejoinFailed] = useState(false);
  const hasInitializedRef = useRef(false);

  // Set up game listeners - this must run before checking grid
  // so guests can receive the game state from Firebase
  useGameListeners();

  // Listen for player updates during gameplay
  useEffect(() => {
    if (!roomCode) return;

    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() as Record<string, Player> | null;
      setPlayers(players || {});
    });

    return () => unsubscribe();
  }, [roomCode, setPlayers]);

  // Watch for phase changes to 'lobby' (host signaled back to lobby)
  useEffect(() => {
    // Don't redirect on initial load
    if (!hasInitializedRef.current && phase) {
      hasInitializedRef.current = true;
      return;
    }

    if (phase === 'lobby' && roomCode) {
      resetGame();
      resetLocalGame();
      navigate(`/lobby/room/${roomCode}`);
    }
  }, [phase, roomCode, navigate, resetGame, resetLocalGame]);

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
