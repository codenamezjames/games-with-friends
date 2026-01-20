import { useEffect, useRef, useState } from 'react';
import { ref, onValue, onChildAdded } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { useRoomStore } from '@/stores/useRoomStore';
import { useGameStore } from '@/stores/useGameStore';
import { getGamePaths } from '@/games/registry';
import type { SerializableGameState, WordSubmission } from '@/types';

export function useGameListeners() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode, isHost } = useRoomStore();
  const { applyStateFromFirebase, gameType } = useGameStore();
  const hasLoadedInitialState = useRef(false);
  const hasNavigatedToResults = useRef(false);
  const hasNavigatedToGame = useRef(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Reset on roomCode change
    hasLoadedInitialState.current = false;
    hasNavigatedToResults.current = false;
    hasNavigatedToGame.current = false;
    setConnectionError(null);

    // Listen to game state changes
    const gameStateRef = ref(db, `rooms/${roomCode}/gameState`);
    const unsubGameState = onValue(
      gameStateRef,
      (snapshot) => {
        const state = snapshot.val() as SerializableGameState | null;
        // console.log('[useGameListeners] Firebase state received:', { state, isHost, hasLoaded: hasLoadedInitialState.current });
        if (!state) return;

        // Always apply on first load (handles refresh for both host and guest)
        // After that, only guest applies updates (host is the authority)
        if (!hasLoadedInitialState.current) {
          hasLoadedInitialState.current = true;
          // console.log('[useGameListeners] Applying initial state, grid length:', state.grid?.length);
          applyStateFromFirebase(state);
        } else if (!isHost) {
          applyStateFromFirebase(state);
        }

        // Navigate to results when game finishes (for guests) - only once
        // But don't navigate if room status is 'waiting' (someone clicked Play Again)
        const roomStatus = useRoomStore.getState().roomStatus;
        if (!isHost && state.phase === 'finished' && !hasNavigatedToResults.current && roomStatus !== 'waiting') {
          hasNavigatedToResults.current = true;
          const paths = getGamePaths(gameType);
          // console.log('[useGameListeners] Game finished, navigating to results');
          navigate(paths.results);
        }

        // Navigate to game when a new game starts (rematch from results page)
        // This handles the case when host starts a rematch and guests need to navigate
        const isOnResultsPage = location.pathname.includes('/results');
        if (!isHost && (state.phase === 'countdown' || state.phase === 'playing') && isOnResultsPage && !hasNavigatedToGame.current) {
          hasNavigatedToGame.current = true;
          const paths = getGamePaths(gameType, roomCode);
          // console.log('[useGameListeners] Rematch started, navigating to game');
          navigate(paths.play);
        }
      },
      (error) => {
        console.error('[useGameListeners] Firebase listener error:', error);
        setConnectionError('Lost connection to game server');
      }
    );

    return () => {
      unsubGameState();
    };
  }, [roomCode, isHost, applyStateFromFirebase, navigate, gameType, location.pathname]);

  return { connectionError };
}

interface SubmissionWithKey extends WordSubmission {
  key: string;
}

export function useHostSubmissionListener(
  onSubmission: (submission: SubmissionWithKey) => void
) {
  const { roomCode, isHost } = useRoomStore();

  useEffect(() => {
    if (!roomCode || !isHost) return;

    const submissionsRef = ref(db, `rooms/${roomCode}/submissions`);
    const unsubSubmissions = onChildAdded(submissionsRef, (snapshot) => {
      const submission = {
        key: snapshot.key!,
        ...(snapshot.val() as WordSubmission),
      };
      onSubmission(submission);
    });

    return () => {
      unsubSubmissions();
    };
  }, [roomCode, isHost, onSubmission]);
}
