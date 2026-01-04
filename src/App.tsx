import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';
import { SoloGamePage } from '@/pages/SoloGamePage';

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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/lobby/room/:roomCode" element={<LobbyPage />} />
      <Route path="/game/:roomCode" element={<GamePage />} />
      <Route path="/solo" element={<SoloGamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
