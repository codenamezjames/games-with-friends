import { useNavigate } from 'react-router-dom';
import { GameCard } from './GameCard';

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

  const handleGameSelect = (gameId: string) => {
    navigate(`/games/${gameId}`);
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-5 py-10">
      <header className="text-center mb-12">
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
    </div>
  );
}
