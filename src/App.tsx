import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useGameStore } from '@/stores/useGameStore';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const LobbyPage = lazy(() => import('@/pages/LobbyPage').then(m => ({ default: m.LobbyPage })));
const GamePage = lazy(() => import('@/pages/GamePage').then(m => ({ default: m.GamePage })));
const SoloGamePage = lazy(() => import('@/pages/SoloGamePage').then(m => ({ default: m.SoloGamePage })));
const ResultsPage = lazy(() => import('@/pages/ResultsPage').then(m => ({ default: m.ResultsPage })));

// Auto-navigate to results page when testMode is triggered
function TestResultsNavigator() {
  const navigate = useNavigate();
  const { phase, testMode } = useGameStore();

  useEffect(() => {
    if (testMode && phase === 'finished') {
      navigate('/results');
    }
  }, [testMode, phase, navigate]);

  return null;
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
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <TestResultsNavigator />
    </BrowserRouter>
  );
}

export default App;
