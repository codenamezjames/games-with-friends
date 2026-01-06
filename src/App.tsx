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
      navigate('/games/wordtrace/results');
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
        {/* Word Trace game routes */}
        <Route path="/games/wordtrace" element={<LobbyPage />} />
        <Route path="/games/wordtrace/room/:roomCode" element={<LobbyPage />} />
        <Route path="/games/wordtrace/play/:roomCode" element={<GamePage />} />
        <Route path="/games/wordtrace/solo" element={<SoloGamePage />} />
        <Route path="/games/wordtrace/results" element={<ResultsPage />} />
        {/* Legacy redirects */}
        <Route path="/lobby" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/lobby/room/:roomCode" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/game/:roomCode" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/solo" element={<Navigate to="/games/wordtrace/solo" replace />} />
        <Route path="/results" element={<Navigate to="/games/wordtrace/results" replace />} />
        <Route path="/games/boggle/*" element={<Navigate to="/games/wordtrace" replace />} />
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
