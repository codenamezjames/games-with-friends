import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useGameStore } from '@/stores/useGameStore';
import { getAvailableGames, getGameRoutes, getGamePaths } from '@/games/registry';
import { ToastContainer } from '@/components/common/Toast';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';

// Import game modules to register them (side effect)
import '@/games/wordtrace';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const LobbyPage = lazy(() => import('@/pages/LobbyPage').then(m => ({ default: m.LobbyPage })));
const GamePage = lazy(() => import('@/pages/GamePage').then(m => ({ default: m.GamePage })));
const SoloGamePage = lazy(() => import('@/pages/SoloGamePage').then(m => ({ default: m.SoloGamePage })));
const ResultsPage = lazy(() => import('@/pages/ResultsPage').then(m => ({ default: m.ResultsPage })));

// Auto-navigate to results page when testMode is triggered
function TestResultsNavigator() {
  const navigate = useNavigate();
  const { phase, testMode, gameType } = useGameStore();

  useEffect(() => {
    if (testMode && phase === 'finished') {
      const paths = getGamePaths(gameType);
      navigate(paths.results);
    }
  }, [testMode, phase, gameType, navigate]);

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

  // Get all registered games and generate routes
  const games = getAvailableGames();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted text-lg">Loading...</div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Dynamic game routes - generated from registry */}
        {games.map((game) => {
          const routes = getGameRoutes(game.id);
          return [
            <Route key={`${game.id}-lobby`} path={routes.lobby} element={<LobbyPage />} />,
            <Route key={`${game.id}-room`} path={routes.room} element={<LobbyPage />} />,
            <Route key={`${game.id}-play`} path={routes.play} element={<GamePage />} />,
            game.supportsSolo && (
              <Route key={`${game.id}-solo`} path={routes.solo} element={<SoloGamePage />} />
            ),
            <Route key={`${game.id}-results`} path={routes.results} element={<ResultsPage />} />,
          ];
        })}

        {/* Legacy redirects */}
        <Route path="/lobby" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/lobby/room/:roomCode" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/game/:roomCode" element={<Navigate to="/games/wordtrace" replace />} />
        <Route path="/solo" element={<Navigate to="/games/wordtrace/solo" replace />} />
        <Route path="/results" element={<Navigate to="/games/wordtrace/results" replace />} />
        <Route path="/games/boggle/*" element={<Navigate to="/games/wordtrace" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ConnectionStatus />
      <AppContent />
      <TestResultsNavigator />
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
