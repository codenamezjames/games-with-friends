import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useRoom } from '@/hooks/useRoom';
import { useRoomStore } from '@/stores/useRoomStore';

export function MainMenu() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCode = searchParams.get('room') || '';
  const gameType = searchParams.get('game') || 'boggle';

  const { createRoom, joinRoom } = useRoom();
  const { playerName, setPlayerName } = useRoomStore();

  const [roomCode, setRoomCode] = useState(prefillCode.toUpperCase());
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const code = await createRoom(gameType, playerName.trim());
      navigate(`/lobby/room/${code}`);
    } catch (err) {
      setError((err as Error).message);
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (roomCode.length !== 6) {
      setError('Please enter a 6-character room code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinRoom(roomCode, playerName.trim());
      navigate(`/lobby/room/${roomCode}`);
    } catch (err) {
      setError((err as Error).message);
      setIsJoining(false);
    }
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="bg-bg-card rounded-[var(--radius-default)] p-10 w-full max-w-md shadow-xl">
        <button
          className="flex items-center gap-2 bg-transparent border-none text-text-muted text-sm cursor-pointer p-2.5 mb-5 transition-colors hover:text-text-primary"
          onClick={() => navigate('/')}
        >
          &larr; Back to Games
        </button>

        <h1 className="text-3xl font-bold text-center bg-gradient-to-br from-primary-light to-accent bg-clip-text text-transparent mb-2">
          Word Trace
        </h1>
        <p className="text-center text-text-muted mb-8">Challenge a friend!</p>

        {error && (
          <div className="bg-error/20 border border-error rounded-lg p-3 mb-4 text-error text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label
            htmlFor="player-name"
            className="block text-text-muted text-sm mb-2"
          >
            Your Name
          </label>
          <input
            type="text"
            id="player-name"
            placeholder="Enter your name"
            maxLength={20}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 bg-bg-cell border-none rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Room'}
          </Button>

          <div className="flex items-center gap-4 text-text-muted text-sm">
            <span className="flex-1 h-px bg-text-muted/30" />
            OR
            <span className="flex-1 h-px bg-text-muted/30" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ABCD12"
              maxLength={6}
              value={roomCode}
              onChange={handleRoomCodeChange}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 px-4 py-3 bg-bg-cell border-none rounded-lg text-text-primary text-center uppercase tracking-widest placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button variant="secondary" onClick={handleJoin} disabled={isJoining}>
              {isJoining ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </div>

        <Button
          variant="link"
          className="w-full mt-6"
          onClick={() => window.location.reload()}
        >
          Play Solo
        </Button>
      </div>
    </div>
  );
}
