import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './stores/useGameStore'
import { useRoomStore } from './stores/useRoomStore'

const VERSION = '1.5.0';
console.log(`[Word Trace] v${VERSION}`);

// Debug function to test animated results screen
// Usage: testResults() or testResults({ playerCount: 3, wordCount: 15 })
declare global {
  interface Window {
    testResults: (options?: { playerCount?: number; wordCount?: number }) => void;
  }
}

window.testResults = (options = {}) => {
  const { playerCount = 2, wordCount = 12 } = options;

  const sampleWords = [
    'CAT', 'DOG', 'BAT', 'RAT', 'HAT', 'MAT',
    'CATS', 'DOGS', 'BATS', 'RATS', 'HATS',
    'ABOUT', 'ALERT', 'BLAST', 'CREAM', 'DREAM',
    'STREAM', 'DREAMS', 'CREAMS', 'STREAMS',
    'ABSOLUTE', 'ABSTRACT', 'BACKWARD',
  ];

  // Generate player IDs
  const playerIds = Array.from({ length: playerCount }, (_, i) => `player-${i + 1}`);
  const localPlayerId = useRoomStore.getState().playerId || playerIds[0];

  // Make sure local player is in the list
  if (!playerIds.includes(localPlayerId)) {
    playerIds[0] = localPlayerId;
  }

  // Generate mock players
  const players: Record<string, { id: string; name: string; isHost: boolean; isReady: boolean; joinedAt: number }> = {};
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  playerIds.forEach((id, i) => {
    players[id] = {
      id,
      name: id === localPlayerId ? 'You' : names[i] || `Player ${i + 1}`,
      isHost: i === 0,
      isReady: true,
      joinedAt: Date.now(),
    };
  });

  // Distribute words among players with some overlap (shared words)
  const foundWords: Record<string, string[]> = {};
  const wordsToUse = sampleWords.slice(0, wordCount);

  playerIds.forEach((playerId, playerIndex) => {
    foundWords[playerId] = [];
    wordsToUse.forEach((word, wordIndex) => {
      // First few words are shared (all players get them)
      // Rest are distributed based on index
      const isSharedWord = wordIndex < 3;
      const belongsToPlayer = (wordIndex + playerIndex) % playerCount === 0;

      if (isSharedWord || belongsToPlayer) {
        foundWords[playerId].push(word);
      }
    });
  });

  // Calculate scores
  const getPoints = (word: string) => {
    const len = word.length;
    if (len <= 4) return 1;
    if (len === 5) return 2;
    if (len === 6) return 3;
    if (len === 7) return 5;
    return 11;
  };

  const rankings = playerIds.map((playerId) => {
    const words = foundWords[playerId];
    const score = words.reduce((sum, w) => sum + getPoints(w), 0);
    return {
      playerId,
      name: players[playerId].name,
      score,
      wordCount: words.length,
      words,
    };
  }).sort((a, b) => b.score - a.score);

  const isTie = rankings.length > 1 && rankings[0].score === rankings[1].score;
  const winner = isTie ? null : rankings[0]?.playerId || null;

  // Update stores
  useRoomStore.setState({ players, playerId: localPlayerId });
  useGameStore.setState({
    phase: 'finished',
    foundWords,
    results: { winner, isTie, rankings },
    scores: Object.fromEntries(rankings.map(r => [r.playerId, r.score])),
    wordCounts: Object.fromEntries(rankings.map(r => [r.playerId, r.wordCount])),
    testMode: true,
  });

  console.log('Test results loaded!', { playerCount, wordCount, foundWords, rankings });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
