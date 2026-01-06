# Adding New Games

This guide explains how to add a new game to the platform.

## Overview

The platform uses a **game registry pattern** where each game is a self-contained module that registers itself on app startup. Games share common infrastructure (rooms, players, Firebase sync) but implement their own game logic and UI.

## Quick Start

1. **Copy the template**: `cp -r src/games/_template src/games/your-game`
2. **Update the config** in `index.ts` (id, name, settings)
3. **Define your types** in `types.ts`
4. **Build your UI** in `components/`
5. **Register the game** by importing in `App.tsx`

## File Structure

```
src/games/your-game/
├── index.ts          # Game config + registration
├── types.ts          # Game-specific types
├── utils.ts          # Helper functions (optional)
├── YourGame.ts       # Game logic class (optional)
└── components/
    ├── YourBoard.tsx # Main game component
    └── ...           # Additional components
```

## Step-by-Step Guide

### 1. Create Game Configuration

In `index.ts`, define your game's config:

```typescript
export const gameConfig: GameConfig = {
  id: 'trivia',              // URL-safe identifier
  displayName: 'Trivia',     // Shown in UI
  description: 'Test your knowledge!',
  icon: '🧠',

  minPlayers: 2,
  maxPlayers: 8,

  defaultDuration: 120,
  durationOptions: [
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
  ],

  supportsSolo: true,        // Enable solo mode?
  available: true,           // Show in game list?

  defaultSettings: {
    category: 'general',
    difficulty: 'medium',
  },
};
```

### 2. Define Types

In `types.ts`, define your game's state and actions:

```typescript
export interface TriviaGameState {
  phase: GamePhase;
  currentQuestion: Question;
  questionIndex: number;
  answers: Record<string, string>;  // playerId -> answer
  scores: Record<string, number>;
}

export interface TriviaAction {
  type: 'submit_answer';
  playerId: string;
  payload: { answer: string };
}
```

### 3. Implement Initial State Generator

```typescript
export function generateInitialState(
  players: Record<string, { name: string }>,
  settings?: TriviaSettings
): TriviaGameState {
  const scores: Record<string, number> = {};
  for (const playerId of Object.keys(players)) {
    scores[playerId] = 0;
  }

  return {
    phase: 'countdown',
    startTime: Date.now() + 3000,
    timeRemaining: settings?.duration ?? 120,
    duration: settings?.duration ?? 120,
    scores,
    currentQuestion: getRandomQuestion(settings?.category),
    questionIndex: 0,
    answers: {},
  };
}
```

### 4. Build the Game Board

Create your main game component in `components/YourBoard.tsx`:

```typescript
export function TriviaBoard() {
  const { phase, timeRemaining, gameType } = useGameStore();
  const { submitAction } = useRoom();

  const handleAnswer = async (answer: string) => {
    await submitAction('submit_answer', { answer });
  };

  return (
    <div>
      {/* Your game UI */}
    </div>
  );
}
```

### 5. Register the Game

In your game's `index.ts`:

```typescript
import { registerGame } from '../registry';

// At the bottom of the file:
registerGame(gameConfig);
```

Then import your game module in `App.tsx`:

```typescript
// Import game modules to register them
import '@/games/wordtrace';
import '@/games/trivia';  // Add your game
```

## Key APIs

### Game Store (`useGameStore`)

Access shared game state:

```typescript
const {
  phase,           // 'countdown' | 'playing' | 'finished'
  timeRemaining,   // Seconds left
  scores,          // { [playerId]: score }
  gameType,        // Your game's ID
} = useGameStore();
```

### Room Store (`useRoomStore`)

Access room/player info:

```typescript
const {
  roomCode,
  playerId,        // Current player's ID
  players,         // All players in room
  isHost,
} = useRoomStore();
```

### useRoom Hook

Submit actions and manage game state:

```typescript
const {
  submitAction,       // Send player actions
  updateGameState,    // Host: update full state
  updateGameStateFields,  // Host: update specific fields
} = useRoom();

// Submit a player action
await submitAction('play_card', { cardId: 123 });

// Host updates state
await updateGameStateFields({
  currentRound: 2,
  scores: newScores,
});
```

### Navigation

Use registry paths for navigation:

```typescript
import { getGamePaths } from '@/games/registry';

const paths = getGamePaths(gameType, roomCode);
navigate(paths.results);  // Go to results page
navigate(paths.room);     // Back to lobby
```

## Game Lifecycle

1. **Lobby** (`phase: 'lobby'`) - Players join, host configures settings
2. **Countdown** (`phase: 'countdown'`) - 3-second countdown before start
3. **Playing** (`phase: 'playing'`) - Active gameplay
4. **Finished** (`phase: 'finished'`) - Game over, show results

The host controls phase transitions by calling `updateGameStateFields({ phase: 'playing' })`.

## Handling Player Actions

1. Player calls `submitAction(type, payload)`
2. Action is pushed to Firebase `/rooms/{code}/submissions`
3. Host listens via `useSubmissionListener(callback)`
4. Host processes action, updates game state
5. All clients receive state update via Firebase listeners

Example host-side processing:

```typescript
useSubmissionListener((submission) => {
  if (submission.type === 'submit_answer') {
    const { answer } = submission.payload;
    // Validate and score the answer
    const isCorrect = checkAnswer(answer);
    if (isCorrect) {
      updateGameStateFields({
        scores: { ...scores, [submission.playerId]: score + 10 }
      });
    }
  }
});
```

## Tips

- **Keep state serializable** - No functions or class instances in Firebase state
- **Host authority** - Only the host should modify game state
- **Optimistic updates** - Update local UI immediately, sync with Firebase
- **Handle reconnects** - Players may refresh mid-game
- **Test with multiple tabs** - Simulate multiplayer locally

## Examples

See `src/games/wordtrace/` for a complete implementation including:
- Grid-based gameplay
- Word validation
- Score calculation
- Results with animations
