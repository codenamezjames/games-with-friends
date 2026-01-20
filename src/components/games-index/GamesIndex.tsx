import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from './GameCard';
import { Settings } from '../Settings';
import { StatsModal } from '../common/StatsModal';

const GAMES = [
  {
    id: 'wordtrace',
    icon: 'W',
    name: 'Word Trace',
    description:
      'Race to find words in a grid of letters. Trace paths through adjacent letters to form words. The player with the highest score wins!',
    players: '2 players',
    duration: '3 min',
    available: true,
  },
  {
    id: 'trivia',
    icon: '?',
    name: 'Trivia Battle',
    description:
      'Test your knowledge across various categories. Answer questions faster than your opponent to earn more points.',
    players: '2-4 players',
    duration: '5 min',
    available: false,
  },
  {
    id: 'scrabble',
    icon: 'A',
    name: 'Word Builder',
    description:
      'Take turns placing letter tiles on the board to form words. Score points based on letter values and bonus squares.',
    players: '2 players',
    duration: '15 min',
    available: false,
  },
];

export function GamesIndex() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleGameSelect = (gameId: string) => {
    navigate(`/games/${gameId}`);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-5 py-10">
      {/* Top Right Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Stats Button */}
        <button
          onClick={() => setShowStats(true)}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="View stats"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </button>
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Open settings"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <header className="text-center mb-12 mt-8">
        <h1 className="text-5xl font-bold bg-gradient-to-br from-primary-light to-accent bg-clip-text text-transparent mb-2.5">
          Games with Friends
        </h1>
        <p className="text-xl text-text-muted">
          Choose a game to play with your friends
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            icon={game.icon}
            name={game.name}
            description={game.description}
            players={game.players}
            duration={game.duration}
            available={game.available}
            onClick={() => handleGameSelect(game.id)}
          />
        ))}
      </div>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* Stats Modal */}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}
