export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
  isSpectator?: boolean;
  // Presence tracking
  lastSeen?: number;      // Timestamp of last heartbeat
  isConnected?: boolean;  // false when disconnected (set by onDisconnect)
  // Rematch ready check
  readyForRematch?: boolean;
}

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface GameSettings {
  duration: number; // seconds: 60, 120, 180, 300
  gridSize: number; // 4, 5, or 6
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  duration: 120,
  gridSize: 5,
};

export const DURATION_OPTIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
];

// Test-only duration (shown in development/localhost environments)
export const TEST_DURATION_OPTION = { value: 2, label: '2s' };

export const GRID_SIZE_OPTIONS = [
  { value: 4, label: '4x4' },
  { value: 5, label: '5x5' },
  { value: 6, label: '6x6' },
];

export interface RoomMetadata {
  gameType: string;
  hostId: string;
  status: RoomStatus;
  createdAt: number;
}

export interface Room {
  metadata: RoomMetadata;
  players: Record<string, Player>;
}
