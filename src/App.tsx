import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useGameStore } from '@/stores/useGameStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { AnimatedResults } from '@/components/game/boggle/AnimatedResults';
import { ResultsModal } from '@/components/game/boggle/ResultsModal';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const LobbyPage = lazy(() => import('@/pages/LobbyPage').then(m => ({ default: m.LobbyPage })));
const GamePage = lazy(() => import('@/pages/GamePage').then(m => ({ default: m.GamePage })));
const SoloGamePage = lazy(() => import('@/pages/SoloGamePage').then(m => ({ default: m.SoloGamePage })));

// Test overlay for debugging animated results
function TestResultsOverlay() {
  const { phase, results, foundWords, testMode, resetGame } = useGameStore();
  const { players, playerId } = useRoomStore();
  const [showAnimated, setShowAnimated] = useState(true);

  if (!testMode || phase !== 'finished' || !results || !playerId) return null;

  const handleClose = () => {
    resetGame();
    useGameStore.setState({ testMode: false });
  };

  return showAnimated ? (
    <AnimatedResults
      results={results}
      foundWords={foundWords}
      players={players}
      localPlayerId={playerId}
      onAnimationComplete={() => setShowAnimated(false)}
      onRematch={handleClose}
      onBackToLobby={handleClose}
    />
  ) : (
    <ResultsModal
      results={results}
      localPlayerId={playerId}
      onRematch={handleClose}
      onBackToLobby={handleClose}
    />
  );
}

function AppContent() {
  const { loading, error } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-error text-lg">
          Authentication error: {error.message}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted text-lg">Loading...</div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/lobby/room/:roomCode" element={<LobbyPage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="/solo" element={<SoloGamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <TestResultsOverlay />
    </BrowserRouter>
  );
}

export default App;
